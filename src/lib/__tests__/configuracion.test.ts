import { describe, expect, it } from "vitest";
import {
  RANGOS_PREDETERMINADOS,
  configuracionDe,
  consumoRelativo,
  contarNiveles,
  porcentajeAltasBajas,
  creditosPorPagina,
  intervaloNivel,
  nivelConsumo,
  ESCALA,
  PUNTO_PREDETERMINADO,
  indiceEscala,
  nivelReporte,
  parametrosIA,
  precisionPara,
  rebanadasNiveles,
  validarRangos,
} from "../configuracion";
import { COSTO_PAGINA_USD, PLANES, UTILIDAD_OBJETIVO, ahorroContra, costoCreditoMXN, planDe, precioPorPagina, utilidad } from "../planes";

describe("rangos de calificación", () => {
  it("usa Bajo 0-69, Medio 70-84, Alto 85-95 y Superior 96-100 por omisión", () => {
    expect(intervaloNivel("bajo")).toBe("0 a 69");
    expect(intervaloNivel("medio")).toBe("70 a 84");
    expect(intervaloNivel("alto")).toBe("85 a 95");
    expect(intervaloNivel("superior")).toBe("96 a 100");
    expect([69, 70, 84, 85, 95, 96, 100].map((v) => nivelReporte(v))).toEqual(["bajo", "medio", "medio", "alto", "alto", "superior", "superior"]);
  });

  it("cuenta alumnos por nivel con los rangos del profesor", () => {
    const r = { medio: 60, alto: 80, superior: 90 };
    expect(contarNiveles([50, 60, 79, 80, 92], r)).toEqual({ bajo: 1, medio: 2, alto: 1, superior: 1 });
    expect(rebanadasNiveles(contarNiveles([97]), RANGOS_PREDETERMINADOS)[0]).toMatchObject({ nombre: "Superior (96 a 100)", valor: 1 });
  });

  it("rechaza rangos desordenados o fuera de 1 a 100", () => {
    expect(validarRangos({ medio: 70, alto: 85, superior: 96 })).toEqual(RANGOS_PREDETERMINADOS);
    expect(typeof validarRangos({ medio: 85, alto: 70, superior: 96 })).toBe("string");
    expect(typeof validarRangos({ medio: 0, alto: 70, superior: 96 })).toBe("string");
    expect(typeof validarRangos({ medio: 70, alto: 85, superior: 101 })).toBe("string");
    expect(typeof validarRangos({ medio: 70.5, alto: 85, superior: 96 })).toBe("string");
  });
});

describe("notas altas y bajas", () => {
  it("cuenta Alto y Superior como altas y Bajo como bajas", () => {
    expect(porcentajeAltasBajas([50, 69, 70, 84, 85, 96, 100, 90])).toEqual({ altas: 50, bajas: 25, total: 8 });
    expect(porcentajeAltasBajas([60, 80], { medio: 60, alto: 80, superior: 90 })).toEqual({ altas: 50, bajas: 0, total: 2 });
    expect(porcentajeAltasBajas([])).toBeUndefined();
  });
});

describe("precisión de la IA", () => {
  it("el predeterminado es Medio (Sonnet) con esfuerzo medio", () => {
    expect(parametrosIA(undefined)).toEqual({ modelo: "claude-sonnet-5-5", esfuerzo: "medium" });
    expect(configuracionDe(undefined).motor).toBe("medio");
  });

  it("asocia Rápido a Haiku, Medio a Sonnet y Preciso a Opus", () => {
    expect(parametrosIA({ motor: "rapido", esfuerzo: "bajo" })).toEqual({ modelo: "claude-haiku-5-5", esfuerzo: "low" });
    expect(parametrosIA({ motor: "preciso", esfuerzo: "alto" })).toEqual({ modelo: "claude-opus-5-5", esfuerzo: "high" });
  });

  it("toma el esfuerzo de la configuración y valida el motor elegido", () => {
    const config = { motor: "preciso" as const, esfuerzos: { rapido: "alto" as const } };
    expect(precisionPara("rapido", config)).toEqual({ motor: "rapido", esfuerzo: "alto" });
    expect(precisionPara("otro", config)).toEqual({ motor: "preciso", esfuerzo: "medio" });
    // El esfuerzo elegido en la actividad manda; uno no válido usa el de Configuración.
    expect(precisionPara("rapido", config, "bajo")).toEqual({ motor: "rapido", esfuerzo: "bajo" });
    expect(precisionPara("rapido", config, "x")).toEqual({ motor: "rapido", esfuerzo: "alto" });
    expect(precisionPara(null, undefined)).toEqual({ motor: "medio", esfuerzo: "medio" });
  });

  it("el consumo crece con la precisión y el esfuerzo", () => {
    expect(consumoRelativo({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
    expect(consumoRelativo({ motor: "preciso", esfuerzo: "alto" })).toBeGreaterThan(consumoRelativo({ motor: "medio", esfuerzo: "alto" }));
    expect(nivelConsumo({ motor: "rapido", esfuerzo: "bajo" })).toBe(1);
    expect(nivelConsumo({ motor: "preciso", esfuerzo: "alto" })).toBe(5);
  });
});

describe("créditos por página", () => {
  it("cobra según el punto de la escala; sin precisión se usa el punto medio", () => {
    expect(ESCALA.map((e) => e.creditos)).toEqual([1, 3, 4, 7, 12]);
    expect(creditosPorPagina({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
    expect(creditosPorPagina({ motor: "medio", esfuerzo: "bajo" })).toBe(3);
    expect(creditosPorPagina({ motor: "medio", esfuerzo: "alto" })).toBe(7);
    expect(creditosPorPagina({ motor: "preciso", esfuerzo: "medio" })).toBe(12);
    expect(creditosPorPagina(undefined)).toBe(4);
    // Precisiones guardadas antes de la escala cobran lo de su motor.
    expect(creditosPorPagina({ motor: "rapido", esfuerzo: "alto" })).toBe(1);
    expect(creditosPorPagina({ motor: "preciso", esfuerzo: "alto" })).toBe(12);
  });

  it("la escala va del motor más económico al más preciso y arranca en el punto medio", () => {
    expect(ESCALA.map((e) => e.punto)).toEqual(["rapido", "agil", "medio", "avanzado", "preciso"]);
    expect(ESCALA[PUNTO_PREDETERMINADO].punto).toBe("medio");
    const tokens = ESCALA.map((e) => e.tokens);
    expect([...tokens].sort((a, b) => a - b)).toEqual(tokens);
    expect(indiceEscala(undefined)).toBe(2);
    expect(indiceEscala({ motor: "preciso", esfuerzo: "alto" })).toBe(4);
    expect(indiceEscala({ motor: "medio", esfuerzo: "alto" })).toBe(3);
  });

  it("cada punto cuesta a lo más lo que cuesta un crédito en Rápido", () => {
    const factor = { bajo: 0.6, medio: 1, alto: 1.6 };
    for (const e of ESCALA) {
      const costo = (COSTO_PAGINA_USD[e.precision.motor] * factor[e.precision.esfuerzo]) / e.creditos;
      expect(costo).toBeLessThanOrEqual(COSTO_PAGINA_USD.rapido + 1e-9);
    }
  });
});

describe("planes", () => {
  it("tiene Gratuito, Básico, Pro, Academia y Escuela con sus créditos", () => {
    expect(PLANES.map((p) => [p.id, p.creditos, p.precio])).toEqual([
      ["gratis", 50, 0],
      ["basico", 300, 215],
      ["pro", 600, 345],
      ["academia", 1200, 635],
      ["escuela", 10000, undefined],
    ]);
  });

  it("cada plan de pago deja al menos 30 % de utilidad después de ISR en cualquier nivel", () => {
    expect(costoCreditoMXN()).toBeCloseTo(0.24, 2);
    for (const p of PLANES.filter((p) => (p.precio ?? 0) > 0)) {
      expect(utilidad(p)!).toBeGreaterThanOrEqual(UTILIDAD_OBJETIVO);
    }
  });

  it("calcula el precio por página y el ahorro contra Básico", () => {
    expect(precioPorPagina(planDe("basico"))).toBe(0.72);
    expect(precioPorPagina(planDe("academia"))).toBe(0.53);
    expect(precioPorPagina(planDe("escuela"))).toBeUndefined();
    expect(ahorroContra(planDe("pro"), planDe("basico"))).toBe(21);
    expect(ahorroContra(planDe("academia"), planDe("basico"))).toBe(26);
    expect(ahorroContra(planDe("basico"), planDe("basico"))).toBeUndefined();
    expect(precioPorPagina(planDe("gratis"))).toBeUndefined();
  });
});
