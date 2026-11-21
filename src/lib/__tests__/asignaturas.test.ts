import { describe, expect, it } from "vitest";
import { asignaturaDeGrupo, leerTemarioActividad, limpiarUnidades, resumenTemario, temarioDeTexto } from "../asignaturas";
import type { Asignatura } from "../tipos";

describe("temario pegado", () => {
  it("reconoce Unidad, numeración y subtemas", () => {
    const u = temarioDeTexto(`Unidad 1. Cinemática
1.1 Movimiento rectilíneo uniforme
1.1.1 Velocidad
1.1.2 Distancia y desplazamiento
1.2 Caída libre
Unidad 2. Dinámica
2.1 Leyes de Newton
  a) Primera ley
  b) Segunda ley`);
    expect(u.map((x) => x.nombre)).toEqual(["Unidad 1. Cinemática", "Unidad 2. Dinámica"]);
    expect(u[0].temas.map((t) => t.nombre)).toEqual(["1.1 Movimiento rectilíneo uniforme", "1.2 Caída libre"]);
    expect(u[0].temas[0].subtemas).toEqual(["1.1.1 Velocidad", "1.1.2 Distancia y desplazamiento"]);
    expect(u[1].temas[0].subtemas).toEqual(["a) Primera ley", "b) Segunda ley"]);
  });
  it("sin la palabra Unidad usa la numeración", () => {
    const u = temarioDeTexto("1. Números reales\n1.1 Racionales\n1.1.1 Fracciones\n2. Álgebra\n2.1 Ecuaciones");
    expect(resumenTemario(u)).toEqual({ unidades: 2, temas: 2, subtemas: 1 });
  });
  it("con viñetas y sangría", () => {
    const u = temarioDeTexto("Biología celular\n- La célula\n    - Membrana\n    - Núcleo\n- Mitosis\nGenética\n- Leyes de Mendel");
    expect(u.map((x) => x.nombre)).toEqual(["Biología celular", "Genética"]);
    expect(u[0].temas).toEqual([
      { nombre: "La célula", subtemas: ["Membrana", "Núcleo"] },
      { nombre: "Mitosis", subtemas: [] },
    ]);
  });
  it("limpia nombres vacíos y repetidos", () => {
    expect(limpiarUnidades([{ nombre: " ", temas: [{ nombre: "A", subtemas: ["x", "X", ""] }, { nombre: "a", subtemas: [] }] }])).toEqual([
      { nombre: "Unidad 1", temas: [{ nombre: "A", subtemas: ["x"] }] },
    ]);
  });
});

describe("temas de la actividad", () => {
  const asig: Asignatura = {
    id: "fis",
    profesorId: "p",
    nombre: "Física",
    unidades: [{ nombre: "U1", temas: [{ nombre: "Newton", subtemas: ["Primera ley"] }] }],
    origen: "texto",
    creadaEn: "",
    actualizadaEn: "",
  };
  it("solo acepta temas de la unidad elegida", () => {
    expect(leerTemarioActividad(JSON.stringify({ asignaturaId: "fis", unidad: "U1", temas: ["Primera ley", "Inventado"] }), [asig])).toEqual({
      asignaturaId: "fis",
      unidad: "U1",
      temas: ["Primera ley"],
    });
    expect(leerTemarioActividad({ asignaturaId: "fis", unidad: "U9", temas: [] }, [asig])).toBeUndefined();
  });
  it("relaciona el curso con la asignatura por materia", () => {
    expect(asignaturaDeGrupo([asig], { materia: "fisica" })?.id).toBe("fis");
  });
});
