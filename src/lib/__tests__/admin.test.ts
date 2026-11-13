import { describe, expect, it } from "vitest";
import { consumoDeRespuesta, correosAdmin, costoUSD, creditosDe, esAdmin, estatusPago, movimientoAjuste, resumenAdmin } from "../admin";
import type { BaseDeDatos } from "../tipos";

function base(): BaseDeDatos {
  return {
    version: 3,
    profesores: [
      { id: "p1", nombre: "Ana Ruiz", correo: "ana@escuela.mx", contrasena: "x", creadoEn: "2026-11-01T10:00:00Z" },
      { id: "p2", nombre: "Beto Paz", correo: "beto@escuela.mx", contrasena: "x", creadoEn: "2026-11-02T10:00:00Z" },
    ],
    cuentasAlumno: [{ id: "c1", correo: "luz@alumnos.mx", nombre: "Luz", matricula: "A1", contrasena: "x", creadoEn: "2026-11-03T10:00:00Z" }],
    sesiones: [
      { token: "t1", expira: "2026-12-12T18:00:00Z", profesorId: "p1" },
      { token: "t2", expira: "2026-11-01T00:00:00Z", profesorId: "p2" },
      { token: "t3", expira: "2026-12-10T00:00:00Z", alumnoId: "c1" },
    ],
    grupos: [
      {
        id: "g1",
        nombre: "3B",
        materia: "Física",
        profesorId: "p1",
        alumnos: [
          { matricula: "A1", nombre: "Luz", correo: "luz@alumnos.mx" },
          { matricula: "A2", nombre: "Raúl" },
        ],
      } as BaseDeDatos["grupos"][number],
    ],
    actividades: [{ id: "a1", grupoId: "g1" } as BaseDeDatos["actividades"][number]],
    entregas: [
      { actividadId: "a1", matricula: "A1", estado: "aprobada", paginasRecibidas: 2, imagenes: ["x", "y"], resultados: [], positivos: [], mejoras: [] },
      { actividadId: "a1", matricula: "A2", estado: "entregada", paginasRecibidas: 1, imagenes: ["z"], resultados: [], positivos: [], mejoras: [] },
    ],
    movimientos: [
      { profesorId: "p1", fecha: "2026-11-01", concepto: "Créditos de bienvenida", cantidad: 50 },
      { profesorId: "p1", fecha: "2026-11-05", concepto: "Compra paquete Básico", cantidad: 300 },
      { profesorId: "p1", fecha: "2026-11-06", concepto: "Evaluación · Vectores · Luz", cantidad: -2 },
      { profesorId: "p2", fecha: "2026-11-02", concepto: "Créditos de bienvenida", cantidad: 50 },
      { profesorId: "p2", fecha: "2026-11-03", concepto: "Ajuste del administrador · corrección", cantidad: -50 },
    ],
    consumoIA: [
      { fecha: "2026-11-13T15:00:00Z", tipo: "evaluacion", profesorId: "p1", actividadId: "a1", modelo: "claude-opus-5-5", entrada: 10_000, salida: 2_000, cacheLectura: 0, cacheEscritura: 0, ok: true },
      { fecha: "2026-11-12T15:00:00Z", tipo: "generar", profesorId: "p1", modelo: "claude-opus-5-5", entrada: 1_000, salida: 5_000, cacheLectura: 0, cacheEscritura: 0, ok: false },
    ],
  };
}

describe("rol de administrador", () => {
  it("lee la lista de correos sin importar mayúsculas ni espacios", () => {
    expect([...correosAdmin(" Ana@Escuela.mx, otro@x.mx ;")]).toEqual(["ana@escuela.mx", "otro@x.mx"]);
    expect(esAdmin("ANA@escuela.mx ", "ana@escuela.mx")).toBe(true);
    expect(esAdmin("beto@escuela.mx", "ana@escuela.mx")).toBe(false);
    expect(esAdmin("ana@escuela.mx", "")).toBe(false);
    expect(esAdmin(undefined, "ana@escuela.mx")).toBe(false);
  });
});

describe("consumo de la IA", () => {
  it("guarda solo cifras e IDs de la respuesta", () => {
    const c = consumoDeRespuesta(
      "evaluacion",
      { profesorId: "p1", actividadId: "a1" },
      { model: "claude-opus-5-5", usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: null } },
      true,
      "2026-11-13T00:00:00Z",
    );
    expect(c).toEqual({
      fecha: "2026-11-13T00:00:00Z",
      tipo: "evaluacion",
      profesorId: "p1",
      actividadId: "a1",
      modelo: "claude-opus-5-5",
      entrada: 1000,
      salida: 200,
      cacheLectura: 0,
      cacheEscritura: 0,
      ok: true,
    });
  });

  it("estima el costo con la tarifa del modelo", () => {
    expect(costoUSD({ modelo: "claude-opus-5-5", entrada: 1_000_000, salida: 1_000_000, cacheLectura: 0, cacheEscritura: 0 })).toBeCloseTo(24);
    expect(costoUSD({ modelo: "modelo-desconocido", entrada: 1_000_000, salida: 0, cacheLectura: 0, cacheEscritura: 0 })).toBeCloseTo(4);
  });
});

describe("créditos y estatus de pago", () => {
  it("separa compras, regalos, ajustes y uso", () => {
    const db = base();
    expect(creditosDe(db, "p1")).toEqual({ comprados: 300, regalados: 50, ajustes: 0, usados: 2, saldo: 348 });
    expect(estatusPago(creditosDe(db, "p1"))).toBe("pagando");
    expect(creditosDe(db, "p2")).toMatchObject({ regalados: 50, ajustes: -50, usados: 0, saldo: 0 });
    expect(estatusPago(creditosDe(db, "p2"))).toBe("sin_saldo");
    expect(estatusPago({ comprados: 0, regalados: 50, ajustes: 0, usados: 0, saldo: 50 })).toBe("prueba");
  });

  it("el ajuste del administrador queda como movimiento entero", () => {
    expect(movimientoAjuste("p1", 25.7, "  cortesía ", new Date("2026-11-13T12:00:00Z"))).toEqual({
      profesorId: "p1",
      fecha: "2026-11-13",
      concepto: "Ajuste del administrador · cortesía",
      cantidad: 25,
    });
  });
});

describe("resumen del panel", () => {
  const r = resumenAdmin(base(), { ahora: new Date("2026-11-13T18:00:00Z"), admins: new Set(["ana@escuela.mx"]), dias: 3 });

  it("cuenta usuarios, roles y sesiones vigentes", () => {
    expect(r.usuarios).toEqual({ profesores: 2, administradores: 1, alumnosConCuenta: 1, alumnosInscritos: 2 });
    expect(r.sesiones).toEqual({ profesores: 1, alumnos: 1 });
    expect(r.profesores.find((p) => p.id === "p1")?.rol).toBe("administrador");
    expect(r.profesores.find((p) => p.id === "p2")?.rol).toBe("profesor");
  });

  it("calcula el uso de cada profesor", () => {
    const p1 = r.profesores.find((p) => p.id === "p1")!;
    expect(p1).toMatchObject({ grupos: 1, alumnosInscritos: 2, actividades: 1, entregas: 2, paginasEvaluadas: 2, sesionesActivas: 1 });
    expect(p1.ultimoAcceso).toBe("2026-11-12T18:00:00.000Z");
    expect(p1.tokens).toMatchObject({ llamadas: 2, fallidas: 1, entrada: 11_000, salida: 7_000, total: 18_000 });
    expect(r.profesores[0].id).toBe("p1");
  });

  it("totaliza uso, créditos y tokens por tipo y por día", () => {
    expect(r.uso).toEqual({ grupos: 1, actividades: 1, entregas: 2, evaluadas: 1, paginasEvaluadas: 2, pendientes: 1 });
    expect(r.creditos).toEqual({ comprados: 300, regalados: 100, usados: 2, saldo: 348, profesoresDePago: 1 });
    expect(r.tokensPorTipo.find((t) => t.tipo === "evaluacion")?.total.total).toBe(12_000);
    expect(r.tokensPorDia.map((d) => d.dia)).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(r.tokensPorDia.map((d) => d.total)).toEqual([0, 6_000, 12_000]);
  });

  it("identifica a los alumnos con cuenta y sus entregas", () => {
    expect(r.alumnos).toEqual([
      { id: "c1", nombre: "Luz", correo: "luz@alumnos.mx", creadoEn: "2026-11-03T10:00:00Z", cursos: 1, entregas: 1, sesionActiva: true },
    ]);
  });
});
