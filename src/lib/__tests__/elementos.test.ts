import { describe, expect, it } from "vitest";
import { fraccionCriterios, puntosPorElemento } from "../elementos";
import { conPuntaje, listaParaRubrica } from "../modalidad";

const criterios = [
  { nombre: "Contenido", porcentaje: 40, descripcion: "" },
  { nombre: "Coherencia", porcentaje: 30, descripcion: "" },
  { nombre: "Elementos lingüísticos", porcentaje: 30, descripcion: "" },
];

describe("puntos por elemento de la rúbrica", () => {
  it("reparte los puntos de un desarrollo por sus pasos", () => {
    const r = { puntos: 4, pasos: [{ nombre: "Datos", peso: 0.25 }, { nombre: "Desarrollo", peso: 0.75 }] };
    expect(puntosPorElemento({}, r, { pasos: [1, 0.5] })).toEqual([
      { nombre: "Datos", total: 1, obtenidos: 1 },
      { nombre: "Desarrollo", total: 3, obtenidos: 1.5 },
    ]);
  });
  it("reparte los puntos de un abierto por los criterios y sus porcentajes", () => {
    expect(puntosPorElemento({ criterios }, { puntos: 10 }, { criterios: [1, 0.5, 0] })).toEqual([
      { nombre: "Contenido", total: 4, obtenidos: 4 },
      { nombre: "Coherencia", total: 3, obtenidos: 1.5 },
      { nombre: "Elementos lingüísticos", total: 3, obtenidos: 0 },
    ]);
    expect(fraccionCriterios({ criterios }, [1, 0.5, 0])).toBeCloseTo(0.55);
  });
  it("sin pasos ni criterios no hay elementos", () => {
    expect(puntosPorElemento({}, { puntos: 1 }, { })).toEqual([]);
  });
});

describe("modalidades", () => {
  it("sin solución, la rúbrica está lista en cuanto hay reactivos", () => {
    const reactivo = { respuesta: "", pasos: undefined } as never;
    expect(listaParaRubrica({ sinSolucion: true, reactivos: [reactivo] })).toBe(true);
    expect(listaParaRubrica({ reactivos: [reactivo] })).toBe(false);
    expect(conPuntaje({ sinPuntaje: true })).toBe(false);
    expect(conPuntaje({})).toBe(true);
  });
});
