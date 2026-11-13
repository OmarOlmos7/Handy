import { describe, expect, it } from "vitest";
import { agruparPorColor, agruparPorEtiqueta } from "../colores";

describe("agrupar tarjetas", () => {
  it("agrupa por color en el orden de la paleta y deja al final los que no tienen", () => {
    const g = agruparPorColor([{ id: 1, color: "rojo" }, { id: 2 }, { id: 3, color: "azul" }, { id: 4, color: "rojo" }, { id: 5, color: "x" }]);
    expect(g.map((x) => x.color?.clave ?? null)).toEqual(["azul", "rojo", null]);
    expect(g[1].items.map((x) => x.id)).toEqual([1, 4]);
    expect(g[2].items.map((x) => x.id)).toEqual([2, 5]);
  });

  it("agrupa por etiqueta en orden alfabético, sin etiqueta al final", () => {
    const g = agruparPorEtiqueta([{ etiqueta: "Quiz" }, { etiqueta: "examen" }, {}, { etiqueta: "Ensayo" }, { etiqueta: " Quiz " }]);
    expect(g.map((x) => x.etiqueta ?? null)).toEqual(["Ensayo", "examen", "Quiz", null]);
    expect(g[2].items).toHaveLength(2);
  });
});
