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
  MARGEN_RIESGO,
  creditosDeCosto,
  sumarCreditos,
  PUNTO_PREDETERMINADO,
  gruposEscala,
  valoresEscala,
  indiceEscala,
  nivelReporte,
  parametrosIA,
  precisionPara,
  rebanadasNiveles,
  validarRangos,
} from "../configuracion";
import { UTILIDAD_OBJETIVO, costoCreditoMXN, creditosMaximos } from "../planes";

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
  it("el predeterminado es Medio (Sonnet) con esfuerzo bajo", () => {
    expect(parametrosIA(undefined)).toEqual({ modelo: "claude-sonnet-5-5", esfuerzo: "low" });
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
    expect(precisionPara(null, undefined)).toEqual({ motor: "medio", esfuerzo: "bajo" });
  });

  it("el consumo crece con la precisión y el esfuerzo", () => {
    expect(consumoRelativo({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
    expect(consumoRelativo({ motor: "preciso", esfuerzo: "alto" })).toBeGreaterThan(consumoRelativo({ motor: "medio", esfuerzo: "alto" }));
    expect(nivelConsumo({ motor: "rapido", esfuerzo: "bajo" })).toBe(1);
    expect(nivelConsumo({ motor: "preciso", esfuerzo: "alto" })).toBe(5);
  });
});

describe("créditos por página", () => {
  it("cobra el costo medido de cada motor y esfuerzo más 20% de riesgo, en décimas de crédito", () => {
    expect(ESCALA.map((e) => e.creditos)).toEqual([0.4, 0.4, 0.6, 2.4, 2.4, 4.5, 5.3, 6.7]);
    expect(creditosPorPagina({ motor: "rapido", esfuerzo: "bajo" })).toBe(0.4);
    expect(creditosPorPagina({ motor: "medio", esfuerzo: "bajo" })).toBe(2.4);
    // Sonnet medio midió un poco menos que bajo; en la escala no baja.
    expect(creditosPorPagina({ motor: "medio", esfuerzo: "medio" })).toBe(2.4);
    expect(creditosPorPagina({ motor: "preciso", esfuerzo: "alto" })).toBe(8.1);
    // Sin precisión se usa el punto predeterminado (Medio: Sonnet bajo).
    expect(creditosPorPagina(undefined)).toBe(2.4);
    expect(creditosDeCosto(0.0718)).toBe(6.7);
  });

  it("la escala va de Haiku 5.5 bajo a Opus 5.5 medio y arranca en Medio con Sonnet 5.5 bajo", () => {
    expect(ESCALA.map((e) => `${e.punto}:${e.clave}`)).toEqual([
      "rapido:rapido-bajo",
      "agil:rapido-medio",
      "agil:rapido-alto",
      "medio:medio-bajo",
      "alto:medio-medio",
      "alto:medio-alto",
      "avanzado:preciso-bajo",
      "avanzado:preciso-medio",
    ]);
    expect(gruposEscala().map((g) => [g.punto, g.desde, g.hasta])).toEqual([
      ["rapido", 0, 0],
      ["agil", 1, 2],
      ["medio", 3, 3],
      ["alto", 4, 5],
      ["avanzado", 6, 7],
    ]);
    expect(ESCALA[PUNTO_PREDETERMINADO].clave).toBe("medio-bajo");
    const creditos = ESCALA.map((e) => e.creditos);
    expect([...creditos].sort((a, b) => a - b)).toEqual(creditos);
    expect(indiceEscala(undefined)).toBe(3);
    expect(indiceEscala({ motor: "preciso", esfuerzo: "alto" })).toBe(7);
    expect(indiceEscala({ motor: "medio", esfuerzo: "alto" })).toBe(5);
    expect(indiceEscala({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
    expect(valoresEscala("es-MX")).toEqual({ min: "0.4", max: "6.7", n: "2.4", ejemplo: "7.2" });
  });

  it("con el margen de 20%, ningún crédito cuesta más que el costo con que se calculan los planes", () => {
    for (const motor of ["rapido", "medio", "preciso"] as const) {
      for (const esfuerzo of ["bajo", "medio", "alto"] as const) {
        const costo = COSTO_HOJA_USD[motor][esfuerzo];
        expect((costo * (1 + MARGEN_RIESGO)) / creditosPorPagina({ motor, esfuerzo })).toBeLessThanOrEqual(COSTO_CREDITO_USD + 1e-9);
      }
    }
  });

  it("suma créditos con fracciones sin errores de redondeo", () => {
    expect(sumarCreditos(50, -0.7, -0.7, -0.7)).toBe(47.9);
    expect(sumarCreditos(3 * 0.7)).toBe(2.1);
  });
});

describe("costo por crédito", () => {
  it("calcula el costo de IA de un crédito y los créditos máximos de un precio", () => {
    expect(costoCreditoMXN()).toBeCloseTo(0.24, 2);
    expect(costoCreditoMXN(0.05)).toBeCloseTo(0.21, 2);
    expect(UTILIDAD_OBJETIVO).toBe(0.35);
    expect([creditosMaximos(215, 0.2, 0.35), creditosMaximos(345, 0.1, 0.31), creditosMaximos(635, 0.05, 0.28)]).toEqual([219, 464, 1009]);
    // Con el riesgo completo de la escala, un crédito cuesta COSTO_CREDITO_USD.
    expect(creditosMaximos(345)).toBe(352);
  });
});
