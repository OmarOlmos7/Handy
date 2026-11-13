import { describe, expect, it } from "vitest";
import {
  adoptarSinDueno,
  alumnoEnGrupo,
  cursosDeAlumno,
  datosDeProfesor,
  esDelProfesor,
  grupoPorCodigo,
  hashContrasena,
  migrar,
  normalizarCodigoCurso,
  normalizarMatricula,
  nuevoCodigoCurso,
  saldoDe,
  verificarContrasena,
} from "../cuentas";
import { semilla } from "../datos-ejemplo";
import type { BaseDeDatos } from "../tipos";

describe("contraseñas", () => {
  it("verifica la correcta y rechaza otra", () => {
    const h = hashContrasena("secreta123");
    expect(h).not.toContain("secreta123");
    expect(verificarContrasena("secreta123", h)).toBe(true);
    expect(verificarContrasena("secreta124", h)).toBe(false);
    expect(verificarContrasena("x", "dañado")).toBe(false);
  });
});

describe("código interno de curso", () => {
  it("usa la materia como prefijo y no repite", () => {
    const c = nuevoCodigoCurso("Física", ["FIS-AAAA"]);
    expect(c).toMatch(/^FIS-[2-9A-HJ-NP-Z]{4}$/);
  });
  it("acepta el código escrito de varias formas", () => {
    expect(normalizarCodigoCurso(" fis 3b7k ")).toBe("FIS-3B7K");
    expect(grupoPorCodigo(semilla(), "fis-3b7k")?.id).toBe("fis-3b");
  });
  it("normaliza la matrícula", () => {
    expect(normalizarMatricula(" a0231 ")).toBe("A0231");
  });
});

describe("datos por profesor", () => {
  function base(): BaseDeDatos {
    const db = semilla();
    adoptarSinDueno(db, "p-1");
    db.grupos.push({ id: "otro", profesorId: "p-2", codigo: "MAT-ZZZZ", materia: "Mate", nombre: "1A", ciclo: "", alumnos: [] });
    db.actividades.push({ ...db.actividades[0], id: "ajena", grupoId: "otro" });
    db.movimientos.push({ profesorId: "p-2", fecha: "2026-11-10", concepto: "Bienvenida", cantidad: 50 });
    return db;
  }

  it("cada profesor ve solo sus cursos, actividades y créditos", () => {
    const db = base();
    const p1 = datosDeProfesor(db, "p-1");
    const p2 = datosDeProfesor(db, "p-2");
    expect(p1.grupos.every((g) => g.profesorId === "p-1")).toBe(true);
    expect(p1.actividades.some((a) => a.id === "ajena")).toBe(false);
    expect(p2.actividades.map((a) => a.id)).toEqual(["ajena"]);
    expect(p2.entregas).toHaveLength(0);
    expect(saldoDe(db, "p-2")).toBe(50);
    expect(esDelProfesor(db, "ajena", "p-1")).toBe(false);
    expect(esDelProfesor(db, "ajena", "p-2")).toBe(true);
  });

  it("migra una base sin cuentas y asigna ID de curso", () => {
    const vieja = semilla() as Partial<BaseDeDatos>;
    delete vieja.profesores;
    delete vieja.sesiones;
    vieja.grupos!.forEach((g) => delete g.codigo);
    const db = migrar(vieja as BaseDeDatos);
    expect(db.version).toBe(3);
    expect(db.profesores).toEqual([]);
    expect(db.cuentasAlumno).toEqual([]);
    expect(new Set(db.grupos.map((g) => g.codigo)).size).toBe(db.grupos.length);
  });
});

describe("cuentas de alumno", () => {
  const cuenta = { id: "a-1", correo: "ana@correo.mx", nombre: "Ana", matricula: "A0301", contrasena: "", creadoEn: "" };

  it("encuentra al alumno por correo o, si el profesor no lo registró, por matrícula", () => {
    const grupo = { id: "g", materia: "F", nombre: "1", ciclo: "", alumnos: [{ matricula: "A0301", nombre: "Ana", correo: "" }] };
    expect(alumnoEnGrupo(grupo, cuenta)?.matricula).toBe("A0301");
    grupo.alumnos[0].correo = "otra@correo.mx";
    expect(alumnoEnGrupo(grupo, cuenta)).toBeUndefined();
  });

  it("solo lista los cursos donde está su correo", () => {
    const db = semilla();
    db.grupos[0].alumnos = db.grupos[0].alumnos.map((a) => ({ ...a }));
    db.grupos[0].alumnos[0].correo = "ANA@correo.mx";
    const cursos = cursosDeAlumno(db, { ...cuenta, matricula: "X" });
    expect(cursos.map((c) => c.grupo.id)).toEqual([db.grupos[0].id]);
    expect(cursos[0].alumno.matricula).toBe(db.grupos[0].alumnos[0].matricula);
  });

  it("la migración a la versión 3 cierra las sesiones de alumno anteriores", () => {
    const db = semilla();
    db.version = 2;
    db.sesiones = [{ token: "x", expira: "2099", profesorId: "p" }, { token: "y", expira: "2099", alumno: { grupoId: "g", matricula: "m" } } as never];
    expect(migrar(db).sesiones.map((s) => s.token)).toEqual(["x"]);
  });
});

describe("liberación automática", () => {
  it("las entregas evaluadas que esperaban aprobación quedan liberadas", () => {
    const base = { version: 3, profesores: [], sesiones: [], cuentasAlumno: [], grupos: [], actividades: [], movimientos: [] };
    const entrega = (estado: "evaluada" | "entregada") => ({ actividadId: "a", matricula: estado, estado, paginasRecibidas: 1, resultados: [], positivos: [], mejoras: [] });
    const db = migrar({ ...base, entregas: [entrega("evaluada"), entrega("entregada")] } as never);
    expect(db.entregas.map((e) => e.estado)).toEqual(["aprobada", "entregada"]);
  });
});
