import { describe, expect, it } from "vitest";
import { ErrorAlumnoGrupo, altaAlumno, altaVarios, bajaAlumno, cambiarAlumno, filasAlumnos, limpiarAlumno, trabajoDelAlumno } from "../alumnos-grupo";
import type { BaseDeDatos, Grupo } from "../tipos";

function base(): { db: BaseDeDatos; grupo: Grupo } {
  const grupo: Grupo = {
    id: "g1",
    profesorId: "p1",
    nombre: "3° B",
    materia: "Física",
    ciclo: "2026-2027",
    alumnos: [
      { matricula: "A001", nombre: "Ana López", correo: "ana@correo.com" },
      { matricula: "A002", nombre: "Beto Ruiz", correo: "" },
    ],
  };
  const otro: Grupo = { ...grupo, id: "g2", alumnos: [{ matricula: "A001", nombre: "Ana López", correo: "ana@correo.com" }] };
  const entrega = (actividadId: string, matricula: string) => ({
    actividadId,
    matricula,
    estado: "evaluada" as const,
    paginasRecibidas: 1,
    resultados: [],
    positivos: [],
    mejoras: [],
    imagenes: [`actividades/${actividadId}/entregas/${matricula}/x-p1.jpg`],
  });
  const db = {
    version: 3,
    profesores: [],
    cuentasAlumno: [],
    sesiones: [],
    grupos: [grupo, otro],
    actividades: [
      { id: "act1", grupoId: "g1" },
      { id: "act2", grupoId: "g2" },
    ],
    entregas: [entrega("act1", "A001"), entrega("act2", "A001"), entrega("act1", "A002")],
    movimientos: [],
    tiempos: [
      { actividadId: "act1", matricula: "A001", segundos: 60, porHora: [], porDia: [], primeraVez: "", ultimaVez: "" },
      { actividadId: "act2", matricula: "A001", segundos: 60, porHora: [], porDia: [], primeraVez: "", ultimaVez: "" },
    ],
    autoactividades: [
      { id: "au1", alumnoId: "c1", grupoId: "g1", matricula: "A001", tipo: "quiz", titulo: "", tema: "", creadaEn: "", estado: "completada", archivos: ["autoestudio/au1/r1-1.jpg"] },
      { id: "au2", alumnoId: "c1", grupoId: "g2", matricula: "A001", tipo: "quiz", titulo: "", tema: "", creadaEn: "", estado: "completada" },
    ],
    valoraciones: [
      { alumnoId: "c1", grupoId: "g1", matricula: "A001", asignaturaId: "s1", niveles: {}, creadaEn: "", actualizadaEn: "" },
    ],
  } as unknown as BaseDeDatos;
  return { db, grupo };
}

const codigo = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErrorAlumnoGrupo ? e.codigo : "otro";
  }
  return "sin error";
};

describe("datos del alumno", () => {
  it("normaliza matrícula, nombre y correo", () => {
    expect(limpiarAlumno({ matricula: " a0 99 ", nombre: "  Carla   Pérez ", correo: " Carla@Correo.COM " })).toEqual({
      matricula: "A099",
      nombre: "Carla Pérez",
      correo: "carla@correo.com",
    });
  });
  it("rechaza datos inválidos", () => {
    expect(codigo(() => limpiarAlumno({ matricula: "A1", nombre: "Carla" }))).toBe("matricula");
    expect(codigo(() => limpiarAlumno({ matricula: "A/../1", nombre: "Carla" }))).toBe("matricula");
    expect(codigo(() => limpiarAlumno({ matricula: "A100", nombre: "Ca" }))).toBe("nombre");
    expect(codigo(() => limpiarAlumno({ matricula: "A100", nombre: "Carla", correo: "carla@" }))).toBe("correo");
  });
});

describe("altas", () => {
  it("da de alta y evita matrícula o correo repetidos", () => {
    const { grupo } = base();
    altaAlumno(grupo, { matricula: "a003", nombre: "Carla Pérez" });
    expect(grupo.alumnos.map((a) => a.matricula)).toEqual(["A001", "A002", "A003"]);
    expect(codigo(() => altaAlumno(grupo, { matricula: "A003", nombre: "Otra" }))).toBe("matriculaRepetida");
    expect(codigo(() => altaAlumno(grupo, { matricula: "A004", nombre: "Otra", correo: "ANA@correo.com" }))).toBe("correoRepetido");
  });
  it("da de alta una lista pegada y dice qué líneas fallaron", () => {
    const { grupo } = base();
    const r = altaVarios(grupo, "A010, Diana Soto, diana@correo.com\nA011\tEmilio Paz\n\nA001, Ana Repetida\nx, sin matrícula");
    expect(r.agregados).toBe(2);
    expect(r.fallidas).toEqual([
      { linea: 4, error: "matriculaRepetida" },
      { linea: 5, error: "matricula" },
    ]);
    expect(grupo.alumnos).toHaveLength(4);
  });
});

describe("cambios", () => {
  it("cambia nombre y correo sin tocar su trabajo", () => {
    const { db, grupo } = base();
    cambiarAlumno(db, grupo, "A002", { matricula: "A002", nombre: "Alberto Ruiz", correo: "beto@correo.com" });
    expect(grupo.alumnos[1]).toEqual({ matricula: "A002", nombre: "Alberto Ruiz", correo: "beto@correo.com" });
  });
  it("al cambiar la matrícula su trabajo en este curso la sigue, y el de otros cursos no cambia", () => {
    const { db, grupo } = base();
    cambiarAlumno(db, grupo, "A001", { matricula: "A100", nombre: "Ana López", correo: "ana@correo.com" });
    expect(db.entregas.map((e) => `${e.actividadId}:${e.matricula}`)).toEqual(["act1:A100", "act2:A001", "act1:A002"]);
    expect(db.tiempos!.map((t) => t.matricula)).toEqual(["A100", "A001"]);
    expect(db.autoactividades!.map((a) => a.matricula)).toEqual(["A100", "A001"]);
    expect(db.valoraciones![0].matricula).toBe("A100");
    expect(db.grupos[1].alumnos[0].matricula).toBe("A001");
  });
  it("no deja usar la matrícula de otro alumno", () => {
    const { db, grupo } = base();
    expect(codigo(() => cambiarAlumno(db, grupo, "A001", { matricula: "A002", nombre: "Ana López" }))).toBe("matriculaRepetida");
    expect(codigo(() => cambiarAlumno(db, grupo, "A999", { matricula: "A999", nombre: "Nadie Aquí" }))).toBe("noEncontrado");
  });
});

describe("bajas", () => {
  it("quita al alumno y su trabajo solo en este curso, y lista sus archivos", () => {
    const { db, grupo } = base();
    expect(trabajoDelAlumno(db, grupo, "A001")).toEqual({ entregas: 1, autoactividades: 1 });
    const { archivos } = bajaAlumno(db, grupo, "a001");
    expect(grupo.alumnos.map((a) => a.matricula)).toEqual(["A002"]);
    expect(db.entregas.map((e) => `${e.actividadId}:${e.matricula}`)).toEqual(["act2:A001", "act1:A002"]);
    expect(db.tiempos!.map((t) => t.actividadId)).toEqual(["act2"]);
    expect(db.autoactividades!.map((a) => a.id)).toEqual(["au2"]);
    expect(db.valoraciones).toHaveLength(0);
    expect(archivos).toEqual(["actividades/act1/entregas/A001/x-p1.jpg", "actividades/act1/entregas/A001", "autoestudio/au1/r1-1.jpg"]);
  });
  it("las filas marcan quién tiene cuenta y cuánto trabajo tiene", () => {
    const { db, grupo } = base();
    const filas = filasAlumnos(db, grupo, new Set(["ana@correo.com"]));
    expect(filas.map((f) => [f.nombre, f.cuenta, f.entregas])).toEqual([
      ["Ana López", true, 1],
      ["Beto Ruiz", false, 1],
    ]);
  });
});
