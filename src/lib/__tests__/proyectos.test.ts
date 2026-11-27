import { describe, expect, it } from "vitest";
import { cuadernoCurso } from "../cuaderno";
import {
  avanceEtapa,
  avanceRuta,
  columnasDeProyectos,
  calificacionEvaluacion,
  evaluadoresDe,
  limpiarEvaluacion,
  nivelDePuntaje,
  notaProyecto,
  repartirCien,
  resultadoEtapa,
  resumenAlumno,
  revisarModelo,
  rutaAlumno,
  rutaGrupo,
  sujetoDe,
  sujetosDeEtapa,
} from "../proyectos";
import type { EtapaProyecto, EvaluacionProyecto, Proyecto } from "../tipos";

const criterios = [
  { id: "c1", nombre: "Contenido", descripcion: "", porcentaje: 60, niveles: ["", "", "", ""] },
  { id: "c2", nombre: "Presentación", descripcion: "", porcentaje: 40, niveles: ["", "", "", ""] },
];
const etapa = (id: string, peso: number, extra: Partial<EtapaProyecto> = {}): EtapaProyecto => ({
  id,
  nombre: `Etapa ${id}`,
  tipo: "reporte",
  instrucciones: "",
  peso,
  porEquipo: false,
  conEvidencia: true,
  criterios,
  ...extra,
});
const proyecto: Proyecto = {
  id: "p1",
  grupoId: "g1",
  profesorId: "prof",
  titulo: "Reto",
  descripcion: "",
  creadoEn: "2026-11-26",
  etapas: [etapa("e1", 30, { cerradaEn: "2026-11-20" }), etapa("e2", 30, { porEquipo: true, tipo: "oral_grupal" }), etapa("e3", 40)],
  evaluadores: ["otro"],
  equipos: [{ id: "q1", nombre: "Equipo Sol", matriculas: ["A1", "A2"] }],
};
const alumnos = [
  { matricula: "A1", nombre: "Ana", correo: "" },
  { matricula: "A2", nombre: "Beto", correo: "" },
  { matricula: "A3", nombre: "Caro", correo: "" },
];
const ev = (etapaId: string, sujeto: string, evaluadorId: string, p1: number, p2: number, extra: Partial<EvaluacionProyecto> = {}): EvaluacionProyecto => ({
  proyectoId: "p1",
  etapaId,
  sujeto,
  evaluadorId,
  criterios: [
    { criterioId: "c1", puntaje: p1, comentario: "" },
    { criterioId: "c2", puntaje: p2, comentario: "" },
  ],
  comentario: "",
  mejoras: [],
  terminada: true,
  actualizadaEn: "2026-11-21",
  ...extra,
});

describe("calificación de una evaluación", () => {
  it("pondera los elementos de la rúbrica", () => {
    expect(calificacionEvaluacion(etapa("x", 10), ev("x", "A1", "prof", 100, 50))).toBe(80);
  });
  it("es null si falta un elemento", () => {
    const e = ev("x", "A1", "prof", 100, 50);
    e.criterios[1].puntaje = undefined;
    expect(calificacionEvaluacion(etapa("x", 10), e)).toBeNull();
  });
});

describe("varios evaluadores", () => {
  it("el dueño siempre evalúa y va primero", () => {
    expect(evaluadoresDe({ profesorId: "prof", evaluadores: ["otro", "prof"] })).toEqual(["prof", "otro"]);
  });
  it("la calificación es el promedio de los que terminaron", () => {
    const evs = [ev("e1", "A1", "prof", 100, 100), ev("e1", "A1", "otro", 70, 70), ev("e1", "A1", "ajeno", 0, 0), ev("e1", "A1", "otro", 0, 0, { terminada: false, sujeto: "A3" })];
    const r = resultadoEtapa(proyecto, proyecto.etapas[0], evs, "A1");
    expect(r.calificacion).toBe(85);
    expect(r.terminadas).toBe(2);
    expect(r.esperadas).toBe(2);
    expect(r.porCriterio[0]).toMatchObject({ promedio: 85, nivel: "bueno" });
  });
  it("no cuenta una evaluación sin terminar", () => {
    const r = resultadoEtapa(proyecto, proyecto.etapas[0], [ev("e1", "A1", "prof", 90, 90), ev("e1", "A1", "otro", 10, 10, { terminada: false })], "A1");
    expect(r.calificacion).toBe(90);
  });
  it("junta comentarios por elemento y áreas de mejora sin repetir", () => {
    const a = ev("e1", "A1", "prof", 90, 90, { comentario: "Buen trabajo", mejoras: ["Citar fuentes"] });
    a.criterios[0].comentario = "Claro";
    const b = ev("e1", "A1", "otro", 80, 80, { mejoras: ["Citar fuentes", "Ensayar"] });
    const r = resultadoEtapa(proyecto, proyecto.etapas[0], [a, b], "A1");
    expect(r.comentarios).toEqual([
      { evaluador: 1, evaluadorId: "prof", criterio: "Contenido", texto: "Claro" },
      { evaluador: 1, evaluadorId: "prof", texto: "Buen trabajo" },
    ]);
    expect(r.mejoras).toEqual(["Citar fuentes", "Ensayar"]);
  });
});

describe("equipos", () => {
  it("en una etapa por equipo se evalúa al equipo", () => {
    expect(sujetoDe(proyecto, proyecto.etapas[1], "A2")).toBe("equipo:q1");
    expect(sujetoDe(proyecto, proyecto.etapas[1], "A3")).toBe("A3");
    expect(sujetoDe(proyecto, proyecto.etapas[0], "A2")).toBe("A2");
  });
  it("lista equipos y alumnos sin equipo", () => {
    expect(sujetosDeEtapa(proyecto, proyecto.etapas[1], alumnos).map((s) => s.sujeto)).toEqual(["equipo:q1", "A3"]);
    expect(sujetosDeEtapa(proyecto, proyecto.etapas[0], alumnos)).toHaveLength(3);
  });
});

describe("resumen del alumno", () => {
  const evs = [ev("e1", "A1", "prof", 80, 80), ev("e1", "A1", "otro", 90, 90), ev("e2", "equipo:q1", "prof", 100, 100)];
  it("solo muestra calificaciones de etapas cerradas y acumula al cierre", () => {
    const r = resumenAlumno(proyecto, evs, [], "A1");
    expect(r.etapas[0]).toMatchObject({ estado: "cerrada", aporte: 25.5, acumulada: 25.5 });
    expect(r.etapas[0].resultado?.calificacion).toBe(85);
    expect(r.etapas[1]).toMatchObject({ estado: "en_evaluacion", aporte: null, resultado: undefined });
    expect(r.acumulada).toBe(25.5);
    expect(r.promedioALaFecha).toBe(85);
    expect(r.avance).toBe(30);
    expect(r.final).toBeNull();
  });
  it("con todas cerradas da la nota final; sin evaluación cuenta 0", () => {
    const todo = { ...proyecto, etapas: proyecto.etapas.map((e) => ({ ...e, cerradaEn: "2026-11-25" })) };
    const r = resumenAlumno(todo, evs, [], "A2");
    // A2: e1 sin evaluación (0), e2 por equipo 100 → 30, e3 sin evaluación (0).
    expect(r.etapas.map((e) => e.acumulada)).toEqual([0, 30, 30]);
    expect(r.final).toBe(30);
    expect(notaProyecto(todo, evs, "A1")).toBe(55.5);
  });
  it("la vista en curso del profesor ve las etapas abiertas", () => {
    expect(resumenAlumno(proyecto, evs, [], "A1", { enCurso: true }).etapas[1].resultado?.calificacion).toBe(100);
  });
});

describe("avance de la etapa", () => {
  it("el dueño ve el promedio; otro evaluador no", () => {
    const evs = [ev("e1", "A1", "prof", 80, 80), ev("e1", "A1", "otro", 60, 60)];
    expect(avanceEtapa(proyecto, proyecto.etapas[0], alumnos, evs, [], "prof")[0]).toMatchObject({ calificacion: 70, terminadas: 2 });
    const otro = avanceEtapa(proyecto, proyecto.etapas[0], alumnos, evs, [], "otro")[0];
    expect(otro.calificacion).toBeNull();
    expect(otro.mia?.evaluadorId).toBe("otro");
  });
});

describe("modelo", () => {
  it("reparte 100 en proporción", () => {
    expect(repartirCien([1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartirCien([30, 30, 20])).toEqual([38, 37, 25]);
    expect(repartirCien([0, 0])).toEqual([50, 50]);
  });
  it("revisa pesos, porcentajes y equipos", () => {
    expect(revisarModelo(proyecto)).toBeUndefined();
    expect(revisarModelo({ ...proyecto, etapas: [etapa("a", 50)] })).toBe("pesos");
    expect(revisarModelo({ ...proyecto, etapas: [etapa("a", 100, { criterios: [{ ...criterios[0], porcentaje: 50 }] })] })).toBe("porcentajes");
    expect(revisarModelo({ ...proyecto, equipos: [...proyecto.equipos, { id: "q2", nombre: "B", matriculas: ["A1"] }] })).toBe("equipoRepetido");
  });
  it("niveles por puntaje", () => {
    expect(nivelDePuntaje(100)).toBe("excelente");
    expect(nivelDePuntaje(86)).toBe("bueno");
    expect(nivelDePuntaje(70)).toBe("suficiente");
    expect(nivelDePuntaje(20)).toBe("insuficiente");
  });
  it("limpia la evaluación: terminar exige todos los elementos", () => {
    const e = proyecto.etapas[0];
    const r = limpiarEvaluacion(e, { criterios: [{ criterioId: "c1", puntaje: 120, comentario: " ok " }], mejoras: "- Ensayar\n\n2) Citar", terminada: true });
    expect(r.criterios[0]).toEqual({ criterioId: "c1", puntaje: 100, comentario: "ok" });
    expect(r.criterios[1].puntaje).toBeUndefined();
    expect(r.terminada).toBe(false);
    expect(r.mejoras).toEqual(["Ensayar", "Citar"]);
  });
});

describe("cuaderno", () => {
  it("el proyecto entra como columna sobre 100 con el promedio de sus etapas cerradas", () => {
    const evs = [ev("e1", "A1", "prof", 80, 80), ev("e1", "A1", "otro", 90, 90)];
    const { actividades, entregas } = columnasDeProyectos([proyecto], evs, alumnos, "Proyecto");
    expect(actividades[0]).toMatchObject({ id: "proyecto:p1", etiqueta: "Proyecto", escala: 100 });
    const grupo = { id: "g1", nombre: "A", materia: "Física", ciclo: "2026", alumnos };
    const c = cuadernoCurso(grupo, actividades, entregas);
    const fila = (m: string) => c.filas.find((f) => f.matricula === m)!;
    expect(fila("A1").celdas["proyecto:p1"].valor).toBe(85);
    // Etapa cerrada sin evaluación: 0 para A2 y A3.
    expect(fila("A2").celdas["proyecto:p1"].valor).toBe(0);
    expect(c.grupos[0].etiqueta).toBe("Proyecto");
  });
});

describe("ruta de avance del proyecto", () => {
  it("el profesor ve el porcentaje de sujetos con evaluación terminada por etapa", () => {
    const evals = [
      ev("e2", "equipo:q1", "prof", 100, 100),
      ev("e2", "equipo:q1", "otro", 100, 100),
      ev("e3", "A1", "prof", 100, 100),
    ];
    const pasos = rutaGrupo(proyecto, alumnos, evals);
    // e1 cerrada; e2: equipo listo de 2 sujetos (equipo + Caro); e3: nadie con los dos evaluadores.
    expect(pasos.map((x) => x.avance)).toEqual([100, 50, 0]);
    expect(avanceRuta(pasos)).toBe(45);
  });

  it("el alumno ve completa solo la etapa cerrada", () => {
    const r = resumenAlumno(proyecto, [], [], "A3");
    const pasos = rutaAlumno(r);
    expect(pasos[0].avance).toBe(100);
    expect(pasos[1].avance).toBe(0);
    expect(avanceRuta(pasos)).toBe(30);
  });
});
