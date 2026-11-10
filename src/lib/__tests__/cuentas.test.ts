import { describe, expect, it } from "vitest";
import {
  adoptarSinDueno,
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

describe("ID de curso", () => {
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
    expect(db.version).toBe(2);
    expect(db.profesores).toEqual([]);
    expect(new Set(db.grupos.map((g) => g.codigo)).size).toBe(db.grupos.length);
  });
});
