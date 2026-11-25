import { describe, expect, it } from "vitest";
import { leerTemarioActividad } from "../asignaturas";
import { acomodoEspina, accionPara, coincideTema, descripcionUnidad, limpiarNiveles, renglones, rutaDeAprendizaje, type ActividadParaRuta } from "../ruta-aprendizaje";
import type { Asignatura } from "../tipos";

const asig: Asignatura = {
  id: "fis",
  profesorId: "p",
  nombre: "Física",
  origen: "texto",
  creadaEn: "",
  actualizadaEn: "",
  unidades: [
    { nombre: "U1 Cinemática", temas: [{ nombre: "1.1 Velocidad", subtemas: ["Rapidez"] }, { nombre: "1.2 Aceleración", subtemas: [] }] },
    { nombre: "U2 Dinámica", temas: [{ nombre: "2.1 Leyes de Newton", subtemas: [] }, { nombre: "2.2 Fricción", subtemas: [] }] },
    { nombre: "U3 Energía", temas: [{ nombre: "3.1 Trabajo", subtemas: [] }] },
  ],
};

const act = (id: string, unidad: string, temas: string[], extra: Partial<ActividadParaRuta> = {}, minimo?: number): ActividadParaRuta => ({
  id,
  titulo: id,
  temario: { asignaturaId: "fis", unidad, temas, ...(minimo ? { certificacion: { minimo } } : {}) },
  entregada: false,
  porcentaje: null,
  ...extra,
});

describe("ruta de aprendizaje", () => {
  it("marca la unidad certificada, en progreso o sin iniciar", () => {
    const r = rutaDeAprendizaje({
      asignatura: asig,
      niveles: { "U1 Cinemática": "basico", "U2 Dinámica": "apoyo", "U3 Energía": "sin_idea" },
      actividades: [
        act("examen1", "U1 Cinemática", [], { entregada: true, porcentaje: 85 }, 70),
        act("tarea2", "U2 Dinámica", ["2.1 Leyes de Newton"], { entregada: true, porcentaje: 60 }),
        act("examen2", "U2 Dinámica", [], { entregada: true, porcentaje: 65 }, 70),
      ],
      autoactividades: [],
    });
    expect(r.unidades.map((u) => u.estado)).toEqual(["certificada", "en_progreso", "sin_iniciar"]);
    expect(r.certificadas).toBe(1);
    expect(r.completada).toBe(false);
    // Unidad certificada: ya no pide temas.
    expect(r.unidades[0].temas.every((t) => !t.recomendado)).toBe(true);
    // Examen reprobado: no certifica.
    expect(r.unidades[1].certificaciones[0]).toMatchObject({ lograda: false, minimo: 70 });
  });

  it("el autoestudio del alumno también inicia la unidad", () => {
    const r = rutaDeAprendizaje({ asignatura: asig, actividades: [], autoactividades: [{ tema: "Trabajo", estado: "pendiente" }] });
    expect(r.unidades[2].estado).toBe("en_progreso");
    expect(r.unidades[2].temas[0].estado).toBe("en_progreso");
  });

  it("quita los temas dominados y respeta el nivel declarado", () => {
    const r = rutaDeAprendizaje({
      asignatura: asig,
      niveles: { "U1 Cinemática": "avanzado", "U2 Dinámica": "sin_idea" },
      actividades: [act("t1", "U1 Cinemática", ["Rapidez"], { entregada: true, porcentaje: 55 })],
      autoactividades: [{ tema: "fricción", estado: "completada", calificacion: 90 }],
    });
    const [u1, u2, u3] = r.unidades;
    // Avanzado: solo repasa donde le fue mal.
    expect(u1.temas.map((t) => t.recomendado)).toEqual([true, false]);
    expect(u1.temas[0]).toMatchObject({ accion: "reforzar", tipo: "practica" });
    expect(u1.prioridad).toBe("baja");
    // No tengo idea: todo, empezando por videos; el tema dominado sale.
    expect(u2.temas[0]).toMatchObject({ recomendado: true, accion: "explorar", tipo: "videos" });
    expect(u2.temas[1]).toMatchObject({ estado: "dominado", recomendado: false });
    expect(u2.prioridad).toBe("alta");
    // Sin valoración se toma como básico.
    expect(u3.nivel).toBeUndefined();
    expect(u3.temas[0]).toMatchObject({ recomendado: true, accion: "practicar" });
    expect(r.pendientes).toBe(3);
  });

  it("completa la ruta con todas las unidades certificadas", () => {
    const r = rutaDeAprendizaje({
      asignatura: asig,
      actividades: asig.unidades.map((u, i) => act(`e${i}`, u.nombre, [], { entregada: true, porcentaje: 100 }, 80)),
      autoactividades: [],
    });
    expect(r.completada).toBe(true);
    expect(r.pendientes).toBe(0);
  });

  it("acción según nivel y desempeño", () => {
    expect(accionPara("bueno", null)).toEqual({ accion: "repasar", tipo: "practica" });
    expect(accionPara("apoyo", null)).toEqual({ accion: "estudiar", tipo: "lectura" });
    expect(accionPara("avanzado", 40)).toEqual({ accion: "reforzar", tipo: "videos" });
  });

  it("reconoce el tema que escribió el alumno", () => {
    expect(coincideTema("leyes de newton", "2.1 Leyes de Newton")).toBe(true);
    expect(coincideTema("Velocidad media", "Velocidad")).toBe(true);
    expect(coincideTema("luz", "Luz y óptica")).toBe(false);
  });
});

describe("valoración inicial", () => {
  it("solo guarda unidades y niveles válidos", () => {
    expect(limpiarNiveles(asig, { "U1 Cinemática": "bueno", "U9 Otra": "bueno", "U2 Dinámica": "excelente" })).toEqual({ "U1 Cinemática": "bueno" });
  });

  it("describe la unidad con sus temas, sin numeración", () => {
    expect(descripcionUnidad(asig.unidades[0])).toBe("Velocidad, Aceleración");
    expect(descripcionUnidad({ nombre: "U", temas: Array.from({ length: 30 }, (_, i) => ({ nombre: `Tema largo número ${i}`, subtemas: [] })) }, 60)).toMatch(/…$/);
  });
});

describe("examen de certificación", () => {
  it("lee la certificación del selector de temario", () => {
    const t = leerTemarioActividad(JSON.stringify({ asignaturaId: "fis", unidad: "U2 Dinámica", temas: [], certificacion: { minimo: 150 } }), [asig]);
    expect(t?.certificacion).toEqual({ minimo: 100 });
    const sin = leerTemarioActividad(JSON.stringify({ asignaturaId: "fis", unidad: "U2 Dinámica", temas: [] }), [asig]);
    expect(sin?.certificacion).toBeUndefined();
  });
});

describe("diagrama de espina", () => {
  it("alterna ramas arriba y abajo sin encimar unidades", () => {
    const a = acomodoEspina([3, 0, 5]);
    expect(a.unidades).toHaveLength(3);
    expect(a.ramas.filter((r) => r.unidad === 0).map((r) => r.arriba)).toEqual([true, false, true]);
    for (const r of a.ramas) expect(r.nodo.x).toBeGreaterThan(a.unidades[r.unidad].x);
    // La última rama de una unidad queda antes de la siguiente unidad.
    const ultima0 = Math.max(...a.ramas.filter((r) => r.unidad === 0).map((r) => r.nodo.x));
    expect(ultima0).toBeLessThan(a.unidades[1].x);
    expect(a.fin.x).toBeGreaterThan(a.unidades[2].x);
  });

  it("parte nombres largos en dos renglones", () => {
    expect(renglones("Introducción a conjuntos, subconjuntos y diagramas de Venn", 22, 2)).toHaveLength(2);
    expect(renglones("Corto")).toEqual(["Corto"]);
  });
});
