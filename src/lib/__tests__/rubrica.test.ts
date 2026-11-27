import { describe, expect, it } from "vitest";
import { cambioEstructura, limpiarCriterios, limpiarRecomendaciones, reacomodarValores } from "../rubrica";

const reactivos = [{ numero: 1 }, { numero: 2 }, { numero: 3 }];

describe("reeditar rúbrica", () => {
  it("limpia criterios: descarta sin nombre, acota porcentajes y reactivos", () => {
    const { criterios, origenes } = limpiarCriterios(
      [
        { nombre: " Contenido ", porcentaje: 140, descripcion: "x", reactivos: [2, 2, 9, 1], origen: 0 },
        { nombre: "", porcentaje: 10, descripcion: "", origen: 1 },
        { nombre: "Ortografía", porcentaje: -5, descripcion: "", origen: 7 },
      ],
      reactivos,
      2,
    );
    expect(criterios).toEqual([
      { nombre: "Contenido", porcentaje: 100, descripcion: "x", reactivos: [1, 2] },
      { nombre: "Ortografía", porcentaje: 0, descripcion: "" },
    ]);
    expect(origenes).toEqual([0, undefined]);
  });

  it("un criterio anterior solo pasa sus valores a uno nuevo", () => {
    const { origenes } = limpiarCriterios(
      [
        { nombre: "A", porcentaje: 50, descripcion: "", origen: 0 },
        { nombre: "B", porcentaje: 50, descripcion: "", origen: 0 },
      ],
      reactivos,
      1,
    );
    expect(origenes).toEqual([0, undefined]);
  });

  it("reacomoda los valores de evaluaciones hechas a la lista nueva", () => {
    // Antes: [Contenido, Coherencia, Lingüística]. Ahora: [Lingüística, Contenido, Nuevo].
    expect(reacomodarValores([1, 0.5, 0.25], [2, 0, undefined])).toEqual([0.25, 1, 0]);
    expect(reacomodarValores(undefined, [0])).toBeUndefined();
  });

  it("detecta si cambió la forma de la lista", () => {
    expect(cambioEstructura([0, 1], 2)).toBe(false);
    expect(cambioEstructura([1, 0], 2)).toBe(true);
    expect(cambioEstructura([0, 1, undefined], 2)).toBe(true);
    expect(cambioEstructura([0], 2)).toBe(true);
  });

  it("recomendaciones: una por renglón, sin viñetas ni repetidas", () => {
    expect(limpiarRecomendaciones("- Revisa unidades\n\n• Revisa unidades\nSé breve")).toEqual(["Revisa unidades", "Sé breve"]);
  });
});
