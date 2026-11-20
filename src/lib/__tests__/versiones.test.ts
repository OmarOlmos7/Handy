import { describe, expect, it } from "vitest";
import type { Actividad } from "../tipos";
import {
  actividadDeVersion,
  cantidadVersiones,
  coinciden,
  letrasVersiones,
  numerosDe,
  versionValida,
  versionesCompletas,
} from "../versiones";

const base: Actividad = {
  id: "a",
  grupoId: "g",
  titulo: "Segunda ley",
  descripcion: "",
  fechaAplicacion: "2026-11-20",
  paginas: 1,
  estado: "esperando_entregas",
  reactivos: [
    {
      numero: 1,
      tipo: "desarrollo",
      enunciado: "Una caja de 4 kg recibe 20 N. Calcula su aceleración.",
      respuesta: "5 m/s²",
      puntos: 4,
      tema: "Dinámica",
      habilidad: "Resolución de problemas",
      pagina: 1,
      pasos: [
        { nombre: "Datos", peso: 0.2 },
        { nombre: "Resultado", peso: 0.8 },
      ],
      solucionPasos: ["$m = 4$ kg", "$a = 20/4 = 5$ m/s²"],
    },
    {
      numero: 2,
      tipo: "opcion_multiple",
      enunciado: "¿Cuánto vale la aceleración de 6 kg con 12 N?",
      respuesta: "b) 2 m/s²",
      puntos: 1,
      tema: "Dinámica",
      habilidad: "Comprensión",
      pagina: 1,
      opciones: ["a) 1 m/s²", "b) 2 m/s²", "c) 3 m/s²"],
    },
  ],
  versiones: [
    {
      letra: "B",
      reactivos: [
        { numero: 1, enunciado: "Una caja de 5 kg recibe 30 N. Calcula su aceleración.", respuesta: "6 m/s²", solucionPasos: ["$m = 5$ kg", "$a = 30/5 = 6$ m/s²"] },
        { numero: 2, enunciado: "¿Cuánto vale la aceleración de 4 kg con 12 N?", opciones: ["a) 3 m/s²", "b) 2 m/s²", "c) 4 m/s²"], respuesta: "a) 3 m/s²" },
      ],
    },
  ],
};

describe("versiones de una actividad", () => {
  it("cambia el texto y la solución, pero conserva la rúbrica (tipo, puntos y pasos)", () => {
    const b = actividadDeVersion(base, "B");
    expect(b.reactivos[0].enunciado).toContain("5 kg");
    expect(b.reactivos[0].respuesta).toBe("6 m/s²");
    expect(b.reactivos[0].pasos).toEqual(base.reactivos[0].pasos);
    expect(b.reactivos[0].puntos).toBe(4);
    expect(b.reactivos[1].opciones?.[0]).toBe("a) 3 m/s²");
    expect(b.reactivos[1].respuesta).toBe("a) 3 m/s²");
    // Aplicarla dos veces da lo mismo; la A y una letra desconocida dejan la actividad igual.
    expect(actividadDeVersion(b, "B")).toEqual(b);
    expect(actividadDeVersion(base, "A")).toBe(base);
    expect(actividadDeVersion(base, undefined)).toBe(base);
  });

  it("lista las letras, valida la versión y limita la cantidad", () => {
    expect(letrasVersiones(base)).toEqual(["A", "B"]);
    expect(versionesCompletas(base).map((v) => v.letra)).toEqual(["A", "B"]);
    expect(versionValida(base, "b")).toBe("B");
    expect(versionValida(base, "A")).toBeUndefined();
    expect(versionValida(base, "C")).toBeUndefined();
    expect(cantidadVersiones("3")).toBe(3);
    expect(cantidadVersiones("9")).toBe(5);
    expect(cantidadVersiones("x")).toBe(1);
  });

  it("compara dos resoluciones del mismo reactivo", () => {
    expect(numerosDe("1/2 (e - 1) ≈ 0,86 m/s²")).toEqual([1, 2, 1, 0.86]);
    expect(coinciden("desarrollo", { respuesta: "6 m/s²", valores: [6] }, { respuesta: "a = 6.0 m/s²", valores: [6.02] })).toBe(true);
    expect(coinciden("desarrollo", { respuesta: "6 m/s²", valores: [6] }, { respuesta: "7.5 m/s²", valores: [7.5] })).toBe(false);
    expect(coinciden("desarrollo", { respuesta: "a) 2 b) 0.75" }, { respuesta: "a) 0.75 m/s², b) 2 m/s²" })).toBe(true);
    expect(coinciden("opcion_multiple", { respuesta: "a) 3 m/s²" }, { respuesta: "A" })).toBe(true);
    expect(coinciden("opcion_multiple", { respuesta: "a) 3 m/s²" }, { respuesta: "c) 4 m/s²" })).toBe(false);
    expect(coinciden("relacion_columnas", { respuesta: "1-c, 2-a" }, { respuesta: "1 c; 2 a" })).toBe(true);
    expect(coinciden("abierto", { respuesta: "x" }, { respuesta: "y" })).toBe(true);
  });
});
