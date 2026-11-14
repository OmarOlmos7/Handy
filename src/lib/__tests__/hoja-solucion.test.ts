import { describe, expect, it } from "vitest";
import { respuestasColumnas, respuestasIncisos } from "../incisos";

describe("solución sobre la hoja", () => {
  it("reparte la respuesta de desarrollo por inciso", () => {
    const r = respuestasIncisos("Sea $f(x)=x^2$. Determina: a) Crece. b) Decrece.", "a) $(0,\\infty)$ b) $(-\\infty,0)$");
    expect(r).toEqual({ letras: ["a)", "b)"], textos: ["$(0,\\infty)$", "$(-\\infty,0)$"] });
  });

  it("quita el punto y coma que separa los incisos", () => {
    expect(respuestasIncisos("Calcula: a) La aceleración. b) La fuerza.", "a) a = 2 m/s²; b) F = 6 N")).toEqual({ letras: ["a)", "b)"], textos: ["a = 2 m/s²", "F = 6 N"] });
  });

  it("si la respuesta no trae sus incisos, va completa", () => {
    expect(respuestasIncisos("Calcula: a) La masa. b) La fuerza.", "6 N")).toEqual({ completa: "6 N" });
    expect(respuestasIncisos("Calcula la fuerza.", "6 N")).toEqual({ completa: "6 N" });
  });

  it("lee las claves de relación de columnas y de paréntesis", () => {
    expect(respuestasColumnas({ tipo: "relacion_columnas", respuesta: "1-c, 2-a, 3-b", columnaA: ["x", "y", "z"] })).toEqual(["c", "a", "b"]);
    expect(respuestasColumnas({ tipo: "parentesis", respuesta: "(b) (a)", columnaA: ["x", "y", "z"] })).toEqual(["b", "a", ""]);
  });
});
