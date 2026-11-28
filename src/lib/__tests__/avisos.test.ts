import { describe, expect, it } from "vitest";
import {
  ErrorAvisoCurso,
  LECTOR_PROFESOR,
  avisosDelAlumno,
  equiposDelGrupo,
  leerDestino,
  lecturaAviso,
  limpiarContenido,
  marcarLeido,
  puedeVerAviso,
  quitarAlumnoDeAvisos,
  renombrarMatriculaAvisos,
  resolverDestino,
  resumenAvisos,
  sinLeerAlumno,
  sinLeerProfesor,
} from "../avisos";
import { vistaAlumno, vistaProfesor } from "../avisos-vista";
import type { Aviso, Grupo, Proyecto } from "../tipos";

const grupo: Grupo = {
  id: "g1",
  profesorId: "p1",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026",
  alumnos: [
    { matricula: "A1", nombre: "Ana", correo: "ana@x.com" },
    { matricula: "A2", nombre: "Beto", correo: "" },
    { matricula: "A3", nombre: "Caro", correo: "caro@x.com" },
  ],
};
const proyecto = {
  id: "pr1",
  grupoId: "g1",
  profesorId: "p1",
  titulo: "Puente",
  equipos: [
    { id: "e1", nombre: "Rojo", matriculas: ["A1", "A2", "ZZ"] },
    { id: "e2", nombre: "Vacío", matriculas: [] },
  ],
} as unknown as Proyecto;
const db = { proyectos: [proyecto] };

function aviso(parcial: Partial<Aviso>): Aviso {
  return {
    id: "av",
    grupoId: "g1",
    autor: { tipo: "profesor", profesorId: "p1" },
    destino: { tipo: "grupo" },
    destinatarios: ["A1", "A2", "A3"],
    asunto: "Examen",
    texto: "El viernes",
    anexos: [],
    enviadoEn: "2026-11-20T10:00:00Z",
    leidos: {},
    ...parcial,
  };
}

describe("destino del aviso", () => {
  it("lee los valores del formulario", () => {
    expect(leerDestino("grupo")).toEqual({ tipo: "grupo" });
    expect(leerDestino("equipo:pr1:e1")).toMatchObject({ tipo: "equipo", proyectoId: "pr1", equipoId: "e1" });
    expect(leerDestino("alumnos:A1, A2,A1")).toEqual({ tipo: "alumnos", matriculas: ["A1", "A2"] });
    expect(leerDestino("alumnos:")).toBeUndefined();
    expect(leerDestino("profesor")).toBeUndefined();
  });

  it("todo el grupo llega a cada alumno de la lista", () => {
    expect(resolverDestino(db, grupo, { tipo: "grupo" }).destinatarios).toEqual(["A1", "A2", "A3"]);
  });

  it("un equipo llega a sus integrantes que siguen en la lista y guarda su nombre", () => {
    const r = resolverDestino(db, grupo, { tipo: "equipo", proyectoId: "pr1", equipoId: "e1", nombre: "" });
    expect(r.destinatarios).toEqual(["A1", "A2"]);
    expect(r.destino).toMatchObject({ nombre: "Rojo" });
    expect(() => resolverDestino(db, grupo, { tipo: "equipo", proyectoId: "pr1", equipoId: "nada", nombre: "" })).toThrow(ErrorAvisoCurso);
  });

  it("los alumnos elegidos que no están en la lista no cuentan", () => {
    expect(resolverDestino(db, grupo, { tipo: "alumnos", matriculas: ["A3", "X9"] }).destinatarios).toEqual(["A3"]);
    expect(() => resolverDestino(db, grupo, { tipo: "alumnos", matriculas: ["X9"] })).toThrow("sinDestinatarios");
  });

  it("solo lista equipos con integrantes", () => {
    expect(equiposDelGrupo(db, "g1").map((e) => e.nombre)).toEqual(["Rojo"]);
  });
});

describe("contenido", () => {
  it("pide texto o un anexo y recorta el asunto", () => {
    expect(() => limpiarContenido("Hola", "   ", 0)).toThrow("vacio");
    expect(limpiarContenido("", "", 1)).toEqual({ asunto: "", texto: "" });
    expect(limpiarContenido("  Tarea   de hoy ", " Ver PDF ", 0)).toEqual({ asunto: "Tarea de hoy", texto: "Ver PDF" });
    expect(limpiarContenido("x".repeat(300), "a", 0).asunto).toHaveLength(120);
  });
});

describe("leídos y sin leer", () => {
  it("al abrirlo se marca leído solo para quien le llegó", () => {
    const a = aviso({});
    expect(sinLeerAlumno([a], "g1", "A1")).toBe(1);
    expect(marcarLeido(a, "A1", new Date("2026-11-21T00:00:00Z"))).toBe(true);
    expect(marcarLeido(a, "A1")).toBe(false);
    expect(marcarLeido(a, "X9")).toBe(false);
    expect(a.leidos).toEqual({ A1: "2026-11-21T00:00:00.000Z" });
    expect(sinLeerAlumno([a], "g1", "A1")).toBe(0);
    expect(sinLeerAlumno([a], "g1", "A2")).toBe(1);
    // El profesor no tiene nada sin leer en sus propios avisos.
    expect(sinLeerProfesor([a], "g1")).toBe(0);
  });

  it("el profesor tiene sin leer los mensajes de sus alumnos", () => {
    const m = aviso({ autor: { tipo: "alumno", matricula: "A2" }, destino: { tipo: "profesor" }, destinatarios: [] });
    expect(sinLeerProfesor([m], "g1")).toBe(1);
    marcarLeido(m, LECTOR_PROFESOR);
    expect(sinLeerProfesor([m], "g1")).toBe(0);
  });

  it("calcula quién lo leyó y el porcentaje", () => {
    const a = aviso({ leidos: { A1: "2026-11-21T00:00:00Z", A3: "2026-11-21T01:00:00Z" } });
    const l = lecturaAviso(a, grupo);
    expect(l).toMatchObject({ total: 3, leidos: 2, porcentaje: 67 });
    expect(l.pendientes.map((x) => x.nombre)).toEqual(["Beto"]);
  });

  it("resume por curso y en total", () => {
    const avisos = [
      aviso({ id: "1", leidos: { A1: "x" } }),
      aviso({ id: "2", destino: { tipo: "alumnos", matriculas: ["A2"] }, destinatarios: ["A2"], leidos: { A2: "x" } }),
      aviso({ id: "3", autor: { tipo: "alumno", matricula: "A3" }, destino: { tipo: "profesor" }, destinatarios: [] }),
    ];
    const r = resumenAvisos(avisos, [grupo]);
    expect(r.cursos[0]).toMatchObject({ enviados: 2, entregas: 4, lecturas: 2, porcentaje: 50, recibidos: 1, recibidosSinLeer: 1 });
    expect(r.total).toMatchObject({ enviados: 2, porcentaje: 50, recibidosSinLeer: 1 });
  });
});

describe("quién ve cada aviso", () => {
  const privado = aviso({ id: "p", destino: { tipo: "alumnos", matriculas: ["A1"] }, destinatarios: ["A1"] });
  const deBeto = aviso({ id: "b", autor: { tipo: "alumno", matricula: "A2" }, destino: { tipo: "profesor" }, destinatarios: [] });

  it("un alumno solo ve los suyos", () => {
    expect(puedeVerAviso(privado, { matricula: "A1" })).toBe(true);
    expect(puedeVerAviso(privado, { matricula: "A3" })).toBe(false);
    expect(puedeVerAviso(deBeto, { matricula: "A2" })).toBe(true);
    expect(puedeVerAviso(deBeto, { matricula: "A1" })).toBe(false);
    expect(puedeVerAviso(deBeto, { profesorDelCurso: true })).toBe(true);
    expect(avisosDelAlumno([privado, deBeto], "g1", "A1").map((a) => a.id)).toEqual(["p"]);
  });

  it("el alumno no ve a quién más le llegó un aviso individual", () => {
    const v = vistaAlumno(aviso({ destino: { tipo: "alumnos", matriculas: ["A1", "A3"] }, destinatarios: ["A1", "A3"] }), { grupo, todos: [], nombreProfesor: "Prof. Ruiz", locale: "es-MX" }, "A1");
    expect(v.destino).toEqual({ tipo: "alumnos", nombres: [] });
    expect(v.autor).toBe("Prof. Ruiz");
    expect(v.responder).toMatchObject({ destino: "profesor" });
    expect(v.puedeBorrar).toBe(false);
  });

  it("el profesor responde al alumno que le escribió", () => {
    const v = vistaProfesor(deBeto, { grupo, todos: [deBeto], nombreProfesor: "Prof. Ruiz", locale: "es-MX" });
    expect(v.autor).toBe("Beto");
    expect(v.responder).toEqual({ destino: "alumnos:A2", asunto: "Examen", respondeA: "b" });
    expect(v.sinLeer).toBe(true);
  });
});

describe("cambios en la lista del curso", () => {
  it("un cambio de matrícula mueve sus avisos y lecturas", () => {
    const avisos = [
      aviso({ id: "1", leidos: { A1: "f" } }),
      aviso({ id: "2", autor: { tipo: "alumno", matricula: "A1" }, destino: { tipo: "profesor" }, destinatarios: [] }),
      aviso({ id: "3", destino: { tipo: "alumnos", matriculas: ["A1"] }, destinatarios: ["A1"] }),
    ];
    renombrarMatriculaAvisos(avisos, "g1", "A1", "N1");
    expect(avisos[0].destinatarios).toContain("N1");
    expect(avisos[0].leidos).toEqual({ N1: "f" });
    expect(avisos[1].autor).toMatchObject({ matricula: "N1" });
    expect(avisos[2].destino).toEqual({ tipo: "alumnos", matriculas: ["N1"] });
  });

  it("una baja borra sus mensajes y los que eran solo para él", () => {
    const avisos = [
      aviso({ id: "todos", leidos: { A1: "f" } }),
      aviso({ id: "suyo", autor: { tipo: "alumno", matricula: "A1" }, destino: { tipo: "profesor" }, destinatarios: [], anexos: [{ ruta: "avisos/suyo/1.jpg", nombre: "f.jpg", clase: "imagen", bytes: 1 }] }),
      aviso({ id: "solo", destino: { tipo: "alumnos", matriculas: ["A1"] }, destinatarios: ["A1"] }),
      aviso({ id: "otro", grupoId: "g2", destinatarios: ["A1"] }),
    ];
    const r = quitarAlumnoDeAvisos(avisos, "g1", "A1");
    expect(r.avisos.map((a) => a.id)).toEqual(["todos", "otro"]);
    expect(r.avisos[0].destinatarios).toEqual(["A2", "A3"]);
    expect(r.avisos[0].leidos).toEqual({});
    expect(r.avisos[1].destinatarios).toEqual(["A1"]);
    expect(r.carpetas).toEqual(["avisos/suyo"]);
  });
});
