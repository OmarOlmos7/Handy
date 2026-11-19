import { describe, expect, it } from "vitest";
import {
  RANGOS_PREDETERMINADOS,
  configuracionDe,
  consumoRelativo,
  contarNiveles,
  intervaloNivel,
  nivelConsumo,
  nivelReporte,
  parametrosIA,
  precisionPara,
  rebanadasNiveles,
  validarRangos,
} from "../configuracion";
import { PLANES, UTILIDAD_OBJETIVO, ahorroContra, costoCreditoMXN, planDe, precioPorPagina, utilidad } from "../planes";

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
    expect(precisionPara(null, undefined)).toEqual({ motor: "medio", esfuerzo: "medio" });
  });

  it("el consumo crece con la precisión y el esfuerzo", () => {
    expect(consumoRelativo({ motor: "rapido", esfuerzo: "medio" })).toBe(1);
    expect(consumoRelativo({ motor: "preciso", esfuerzo: "alto" })).toBeGreaterThan(consumoRelativo({ motor: "medio", esfuerzo: "alto" }));
    expect(nivelConsumo({ motor: "rapido", esfuerzo: "bajo" })).toBe(1);
    expect(nivelConsumo({ motor: "preciso", esfuerzo: "alto" })).toBe(5);
  });
});

describe("planes", () => {
  it("tiene Gratuito, Básico, Pro, Academia y Escuela con sus créditos", () => {
    expect(PLANES.map((p) => [p.id, p.creditos, p.precio])).toEqual([
      ["gratis", 50, 0],
      ["basico", 300, 659],
      ["pro", 600, 1299],
      ["academia", 1500, 3249],
      ["escuela", 10000, 21499],
    ]);
  });

  it("cada plan de pago deja al menos 40 % de utilidad", () => {
    expect(costoCreditoMXN()).toBeGreaterThan(0.9);
    for (const p of PLANES.filter((p) => (p.precio ?? 0) > 0)) {
      expect(utilidad(p)!).toBeGreaterThanOrEqual(UTILIDAD_OBJETIVO);
    }
  });

  it("calcula el precio por página y el ahorro contra Básico", () => {
    expect(precioPorPagina(planDe("basico"))).toBe(2.2);
    expect(precioPorPagina(planDe("escuela"))).toBe(2.15);
    expect(ahorroContra(planDe("pro"), planDe("basico"))).toBeUndefined();
    expect(ahorroContra(planDe("basico"), planDe("basico"))).toBeUndefined();
    expect(precioPorPagina(planDe("gratis"))).toBeUndefined();
  });
});
