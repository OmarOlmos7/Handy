import { describe, expect, it } from "vitest";
import { corregirPuntosPalabras, esCerrado, incisosCerrado, puntosReactivoCerrado } from "../calificar";
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

describe("aciertos por renglón de un cerrado", () => {
  it("relación de columnas: cada renglón con su letra correcta", () => {
    const r = { tipo: "relacion_columnas", respuesta: "1-e, 2-g, 3-a, 4-f, 5-b" } as const;
    expect(incisosCerrado(r, "1-e, 2-c, 3-a, 4-f, 5-d")).toEqual([
      { correcto: true, correcta: "e" },
      { correcto: false, correcta: "g" },
      { correcto: true, correcta: "a" },
      { correcto: true, correcta: "f" },
      { correcto: false, correcta: "b" },
    ]);
  });
  it("opción múltiple y V/F: una sola respuesta", () => {
    expect(incisosCerrado({ tipo: "opcion_multiple", respuesta: "c) m/s²" }, "b")).toEqual([{ correcto: false, correcta: "c" }]);
    expect(incisosCerrado({ tipo: "verdadero_falso", respuesta: "F" }, "F")).toEqual([{ correcto: true, correcta: "F" }]);
    expect(incisosCerrado({ tipo: "desarrollo", respuesta: "5" }, "5")).toEqual([]);
  });
});

describe("elegir la palabra correcta en cada renglón", () => {
  const r = { numero: 3, tipo: "opcion_multiple", puntos: 15, respuesta: "1) sportive, 2) divorcée, 3) heureuse, 4) intelligente, 5) sympathique" } as Reactivo;
  const leida = "1) sportife, 2) divorcé, 3) heureuse, 4) intelligente, 5) sympathique";
  it("compara la palabra completa, no la inicial", () => {
    expect(puntosReactivoCerrado(r, leida)).toBe(9);
    expect(incisosCerrado(r, leida).map((i) => [i.correcto, i.correcta, i.palabra])).toEqual([
      [false, "sportive", true],
      [false, "divorcée", true],
      [true, "heureuse", true],
      [true, "intelligente", true],
      [true, "sympathique", true],
    ]);
  });
  it("corrige los puntos guardados con la fórmula vieja, no los del profesor", () => {
    const vieja = { puntosObtenidos: 15, respuestaLeida: leida };
    expect(corregirPuntosPalabras(r, vieja)).toBe(true);
    expect(vieja.puntosObtenidos).toBe(9);
    const profesor = { puntosObtenidos: 12, respuestaLeida: leida };
    expect(corregirPuntosPalabras(r, profesor)).toBe(false);
    expect(profesor.puntosObtenidos).toBe(12);
  });
  it("una relación con letras sigue calificándose por letra", () => {
    expect(incisosCerrado({ tipo: "relacion_columnas", respuesta: "1-e, 2-g" }, "1-e, 2-c").map((i) => i.palabra)).toEqual([undefined, undefined]);
  });
});
