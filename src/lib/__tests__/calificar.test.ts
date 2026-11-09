import { describe, expect, it } from "vitest";
import { esCerrado, puntosReactivoCerrado } from "../calificar";
import type { Reactivo } from "../tipos";

const base: Reactivo = {
  numero: 1,
  tipo: "opcion_multiple",
  enunciado: "",
  respuesta: "c) m/s²",
  puntos: 1,
  tema: "t",
  habilidad: "h",
  pagina: 1,
};

describe("reactivos cerrados", () => {
  it("opción múltiple compara solo la letra", () => {
    expect(puntosReactivoCerrado(base, "C")).toBe(1);
    expect(puntosReactivoCerrado(base, "(c)")).toBe(1);
    expect(puntosReactivoCerrado(base, "b) m/s")).toBe(0);
    expect(puntosReactivoCerrado(base, "")).toBe(0);
  });

  it("verdadero o falso acepta palabras y letras", () => {
    const r: Reactivo = { ...base, tipo: "verdadero_falso", respuesta: "Verdadero" };
    expect(puntosReactivoCerrado(r, "V")).toBe(1);
    expect(puntosReactivoCerrado(r, "falso")).toBe(0);
  });

  it("relación de columnas da crédito parcial en cuartos", () => {
    const r: Reactivo = { ...base, tipo: "relacion_columnas", respuesta: "1-c, 2-a, 3-b, 4-d", puntos: 2 };
    expect(puntosReactivoCerrado(r, "1-c 2-a 3-b 4-d")).toBe(2);
    expect(puntosReactivoCerrado(r, "1c, 2b, 3a, 4d")).toBe(1);
  });

  it("paréntesis respeta el orden", () => {
    const r: Reactivo = { ...base, tipo: "parentesis", respuesta: "(b)(a)(c)", puntos: 3 };
    expect(puntosReactivoCerrado(r, "b a c")).toBe(3);
    expect(puntosReactivoCerrado(r, "a b c")).toBe(1);
  });

  it("desarrollo y abierto los califica la IA", () => {
    const r: Reactivo = { ...base, tipo: "desarrollo" };
    expect(puntosReactivoCerrado(r, "algo")).toBeNull();
    expect(esCerrado(r)).toBe(false);
  });
});
