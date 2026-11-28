import { describe, expect, it } from "vitest";
import { semilla } from "../datos-ejemplo";
import {
  CREDITOS_POR_SEMANA,
  ErrorDeLicencia,
  LICENCIAS,
  confirmarPago,
  crearLicencia,
  creditosLicencia,
  desgloseLicencia,
  licenciaVigente,
  licenciasObligatorias,
  normalizarLlave,
  nuevaLlave,
  resumenLicenciasProfesor,
  tieneAcceso,
  tipoLicencia,
  utilidadLicencia,
} from "../licencias";
import type { BaseDeDatos, CuentaAlumno } from "../tipos";

function base(): { db: BaseDeDatos; cuenta: CuentaAlumno } {
  const db = semilla();
  db.grupos[0].profesorId = "p-1";
  const cuenta: CuentaAlumno = {
    id: "al-1",
    tipo: "alumno",
    correo: "nuevo@correo.mx",
    nombre: "Alumno Nuevo",
    matricula: "N0001",
    contrasena: "x",
    creadoEn: "2026-11-01T00:00:00.000Z",
  };
  db.cuentasAlumno.push(cuenta);
  return { db, cuenta };
}

const ahora = new Date("2026-11-25T12:00:00.000Z");

describe("catálogo de licencias", () => {
  it("tiene 5 semanas, 10 semanas, semestre y un año con los precios de Omar", () => {
    expect(LICENCIAS.map((l) => [l.id, l.semanas, l.precio])).toEqual([
      ["semanas5", 5, 350],
      ["semanas10", 10, 550],
      ["semestre", 26, 700],
      ["anual", 52, 850],
    ]);
    expect(tipoLicencia("semestre").provisional).toBe(false);
  });

  it("abona 10 créditos de IA al profesor por semana de licencia", () => {
    expect(CREDITOS_POR_SEMANA).toBe(10);
    expect(LICENCIAS.map(creditosLicencia)).toEqual([50, 100, 260, 520]);
  });

  it("cada licencia deja utilidad después de comisión, IA, operación e ISR", () => {
    const d = desgloseLicencia(tipoLicencia("semanas5"));
    expect(d.sinIva).toBeCloseTo(301.72, 2);
    expect(d.comision).toBeCloseTo(16.22, 2);
    expect(d.costoIA).toBeCloseTo(12.03, 2);
    expect(d.queda).toBeCloseTo(273.48, 1);
    for (const l of LICENCIAS) expect(utilidadLicencia(l)).toBeGreaterThan(0.4);
  });
});

describe("llaves", () => {
  it("genera llaves con formato IEG-XXXX-XXXX-XXXX sin repetir", () => {
    const llave = nuevaLlave();
    expect(llave).toMatch(/^IEG-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    let n = 0;
    const azar = () => new Uint8Array(12).fill(n++ < 2 ? 0 : 1);
    expect(nuevaLlave(["IEG-2222-2222-2222"], azar)).toBe("IEG-3333-3333-3333");
  });
  it("acepta la llave escrita de varias formas", () => {
    expect(normalizarLlave(" ieg 7k2q m9xd 4tpa ")).toBe("IEG-7K2Q-M9XD-4TPA");
    expect(normalizarLlave("7k2q-m9xd-4tpa")).toBe("IEG-7K2Q-M9XD-4TPA");
  });
});

describe("alta y pago", () => {
  it("crea una licencia pendiente y la reutiliza al reintentar", () => {
    const { db, cuenta } = base();
    const g = db.grupos[0];
    const a = crearLicencia(db, cuenta, g, "semanas10", ahora);
    expect(a).toMatchObject({ estado: "pendiente", precio: 550, semanas: 10, creditosProfesor: 100, codigoCurso: g.codigo, grupoId: g.id });
    expect(crearLicencia(db, cuenta, g, "semanas10", ahora).llave).toBe(a.llave);
    expect(crearLicencia(db, cuenta, g, "anual", ahora).llave).not.toBe(a.llave);
    expect(tieneAcceso(db, cuenta.id, g.id, true, ahora)).toBe(false);
  });

  it("rechaza si la matrícula del alumno ya la tiene otro alumno del curso", () => {
    const { db, cuenta } = base();
    const g = db.grupos[0];
    cuenta.matricula = g.alumnos[0].matricula;
    g.alumnos[0].correo = "otro@correo.mx";
    expect(() => crearLicencia(db, cuenta, g, "semanas5", ahora)).toThrow(ErrorDeLicencia);
  });

  it("al pagar abre el acceso, inscribe al alumno y abona créditos al profesor una sola vez", () => {
    const { db, cuenta } = base();
    const g = db.grupos[0];
    const antes = g.alumnos.length;
    const l = crearLicencia(db, cuenta, g, "semanas5", ahora);
    const r = confirmarPago(db, l.llave.toLowerCase(), { proveedor: "mercadopago", pagoId: "123", monto: 350 }, ahora);
    expect(r.nueva).toBe(true);
    expect(l.estado).toBe("pagada");
    expect(l.vence).toBe("2026-12-30T12:00:00.000Z");
    expect(g.alumnos).toHaveLength(antes + 1);
    expect(g.alumnos.at(-1)).toEqual({ matricula: "N0001", nombre: "Alumno Nuevo", correo: "nuevo@correo.mx" });
    const mov = db.movimientos.filter((m) => m.profesorId === "p-1" && m.concepto.includes(l.llave));
    expect(mov).toHaveLength(1);
    expect(mov[0].cantidad).toBe(50);
    expect(mov[0].concepto).not.toContain("Alumno Nuevo");
    // El mismo aviso otra vez no duplica nada.
    expect(confirmarPago(db, l.llave, { proveedor: "mercadopago", pagoId: "123", monto: 350 }, ahora).nueva).toBe(false);
    expect(db.movimientos.filter((m) => m.concepto.includes(l.llave))).toHaveLength(1);
    expect(g.alumnos).toHaveLength(antes + 1);
    expect(tieneAcceso(db, cuenta.id, g.id, true, ahora)).toBe(true);
    expect(tieneAcceso(db, cuenta.id, g.id, true, new Date("2026-12-31T00:00:00.000Z"))).toBe(false);
  });

  it("una renovación se suma al final de la licencia vigente", () => {
    const { db, cuenta } = base();
    const g = db.grupos[0];
    const a = crearLicencia(db, cuenta, g, "semanas5", ahora);
    confirmarPago(db, a.llave, { proveedor: "demo", pagoId: "1", monto: 350 }, ahora);
    const b = crearLicencia(db, cuenta, g, "semanas10", ahora);
    confirmarPago(db, b.llave, { proveedor: "demo", pagoId: "2", monto: 550 }, ahora);
    expect(b.vence).toBe("2027-03-10T12:00:00.000Z");
    expect(licenciaVigente(db, cuenta.id, g.id, ahora)?.llave).toBe(b.llave);
  });

  it("no activa con un monto menor ni con una llave que no existe", () => {
    const { db, cuenta } = base();
    const l = crearLicencia(db, cuenta, db.grupos[0], "anual", ahora);
    expect(() => confirmarPago(db, l.llave, { proveedor: "mercadopago", pagoId: "9", monto: 100 }, ahora)).toThrow("monto");
    expect(() => confirmarPago(db, "IEG-2222-2222-2222", { proveedor: "mercadopago", pagoId: "9", monto: 850 }, ahora)).toThrow("noExiste");
    expect(l.estado).toBe("pendiente");
  });

  it("si el alumno ya estaba en la lista sin correo, solo le pone el correo", () => {
    const { db, cuenta } = base();
    const g = db.grupos[0];
    g.alumnos[0].correo = "";
    cuenta.matricula = g.alumnos[0].matricula;
    const antes = g.alumnos.length;
    const l = crearLicencia(db, cuenta, g, "semanas5", ahora);
    confirmarPago(db, l.llave, { proveedor: "demo", pagoId: "1", monto: 350 }, ahora);
    expect(g.alumnos).toHaveLength(antes);
    expect(g.alumnos[0].correo).toBe("nuevo@correo.mx");
  });

  it("resume las licencias vigentes por curso del profesor", () => {
    const { db, cuenta } = base();
    const l = crearLicencia(db, cuenta, db.grupos[0], "semanas5", ahora);
    confirmarPago(db, l.llave, { proveedor: "demo", pagoId: "1", monto: 350 }, ahora);
    const r = resumenLicenciasProfesor(db, "p-1", ahora);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ vigentes: 1, pagadas: 1, creditos: 50 });
  });
});

describe("cobro obligatorio", () => {
  it("se activa con LICENCIAS_OBLIGATORIAS=1", () => {
    expect(licenciasObligatorias({})).toBe(false);
    expect(licenciasObligatorias({ LICENCIAS_OBLIGATORIAS: "1" })).toBe(true);
    expect(tieneAcceso({ licencias: [] }, "x", "y", false)).toBe(true);
  });
});
