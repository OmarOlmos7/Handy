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
  COSTO_CREDITO_USD,
  COSTO_HOJA_USD,
  MARGEN_SEGURIDAD,
  creditosDeCosto,
  sumarCreditos,
  PUNTO_PREDETERMINADO,
  indiceEscala,
  nivelReporte,
  parametrosIA,
  precisionPara,
  rebanadasNiveles,
  validarRangos,
} from "../configuracion";
import { PLANES, UTILIDAD_OBJETIVO, ahorroContra, costoCreditoMXN, creditosMaximos, planDe, precioPorPagina, utilidad } from "../planes";

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
  it("cobra el costo medido de cada motor y esfuerzo más 30% de margen, en décimas de crédito", () => {
    expect(ESCALA.map((e) => e.creditos)).toEqual([0.4, 0.5, 0.7, 2.5, 7.2]);
    expect(creditosPorPagina({ motor: "rapido", esfuerzo: "bajo" })).toBe(0.4);
    expect(creditosPorPagina({ motor: "medio", esfuerzo: "alto" })).toBe(4.9);
    expect(creditosPorPagina({ motor: "preciso", esfuerzo: "alto" })).toBe(8.8);
    // Sin precisión se usa el punto predeterminado (Medio).
    expect(creditosPorPagina(undefined)).toBe(0.7);
    expect(creditosDeCosto(0.0718)).toBe(7.2);
  });

  it("la escala va de Haiku 5.5 bajo a Opus 5.5 medio y arranca en el punto medio", () => {
    expect(ESCALA.map((e) => e.punto)).toEqual(["rapido", "agil", "medio", "alto", "avanzado"]);
    expect(ESCALA.map((e) => `${e.precision.motor}-${e.precision.esfuerzo}`)).toEqual([
      "rapido-bajo",
      "rapido-medio",
      "rapido-alto",
      "medio-medio",
      "preciso-medio",
    ]);
    expect(ESCALA[PUNTO_PREDETERMINADO].punto).toBe("medio");
    const creditos = ESCALA.map((e) => e.creditos);
    expect([...creditos].sort((a, b) => a - b)).toEqual(creditos);
    expect(indiceEscala(undefined)).toBe(2);
    expect(indiceEscala({ motor: "preciso", esfuerzo: "alto" })).toBe(4);
    expect(indiceEscala({ motor: "medio", esfuerzo: "alto" })).toBe(3);
    expect(indiceEscala({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
  });

  it("con el margen de 30%, ningún crédito cuesta más que el costo con que se calculan los planes", () => {
    for (const motor of ["rapido", "medio", "preciso"] as const) {
      for (const esfuerzo of ["bajo", "medio", "alto"] as const) {
        const costo = COSTO_HOJA_USD[motor][esfuerzo];
        expect((costo * (1 + MARGEN_SEGURIDAD)) / creditosPorPagina({ motor, esfuerzo })).toBeLessThanOrEqual(COSTO_CREDITO_USD + 1e-9);
      }
    }
  });

  it("suma créditos con fracciones sin errores de redondeo", () => {
    expect(sumarCreditos(50, -0.7, -0.7, -0.7)).toBe(47.9);
    expect(sumarCreditos(3 * 0.7)).toBe(2.1);
  });
});

describe("planes", () => {
  it("tiene Gratuito, Básico, Pro, Academia y Escuela con sus créditos", () => {
    expect(PLANES.map((p) => [p.id, p.creditos, p.precio])).toEqual([
      ["gratis", 50, 0],
      ["basico", 120, 215],
      ["pro", 240, 345],
      ["academia", 480, 635],
      ["escuela", 4000, undefined],
    ]);
  });

  it("cada plan de pago deja al menos 40 % de utilidad después de IVA, operación e ISR", () => {
    expect(costoCreditoMXN()).toBeCloseTo(0.24, 2);
    expect(UTILIDAD_OBJETIVO).toBe(0.4);
    for (const p of PLANES.filter((p) => (p.precio ?? 0) > 0)) {
      expect(utilidad(p)!).toBeGreaterThanOrEqual(UTILIDAD_OBJETIVO);
      expect(p.creditos).toBeLessThanOrEqual(creditosMaximos(p.precio!));
    }
    expect([215, 345, 635].map(creditosMaximos)).toEqual([163, 261, 482]);
  });

  it("cada plan de pago trae el doble de créditos que el anterior", () => {
    expect(planDe("pro").creditos).toBe(2 * planDe("basico").creditos);
    expect(planDe("academia").creditos).toBe(2 * planDe("pro").creditos);
  });

  it("calcula el precio por página y el ahorro contra Básico", () => {
    expect(precioPorPagina(planDe("basico"))).toBe(1.79);
    expect(precioPorPagina(planDe("academia"))).toBe(1.32);
    expect(precioPorPagina(planDe("escuela"))).toBeUndefined();
    expect(ahorroContra(planDe("pro"), planDe("basico"))).toBe(20);
    expect(ahorroContra(planDe("academia"), planDe("basico"))).toBe(26);
    expect(ahorroContra(planDe("basico"), planDe("basico"))).toBeUndefined();
    expect(precioPorPagina(planDe("gratis"))).toBeUndefined();
  });
});
