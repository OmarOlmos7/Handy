import { describe, expect, it } from "vitest";
import { etiquetasPorGrupo, limpiarEtiqueta } from "../etiquetas";

describe("tipo de actividad", () => {
  it("limpia espacios y largo", () => {
    expect(limpiarEtiqueta("  Proyecto   final ")).toBe("Proyecto final");
    expect(limpiarEtiqueta("   ")).toBeUndefined();
    expect(limpiarEtiqueta(null)).toBeUndefined();
    expect(limpiarEtiqueta("x".repeat(40))).toHaveLength(30);
  });

  it("reúne los tipos de cada curso sin repetir", () => {
    const r = etiquetasPorGrupo(
      [{ id: "a", planEvaluacion: { pesos: [{ etiqueta: "Examen" }, { etiqueta: "" }] } }, { id: "b" }],
      [
        { grupoId: "a", etiqueta: "tarea" },
        { grupoId: "a", etiqueta: "Tarea" },
        { grupoId: "a", etiqueta: "examen" },
        { grupoId: "a" },
        { grupoId: "b", etiqueta: "Quiz" },
      ],
    );
    expect(r).toEqual({ a: ["Examen", "tarea"], b: ["Quiz"] });
  });
});
