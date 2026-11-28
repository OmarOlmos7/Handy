// Bolsa de créditos del alumno (perfil CREAR): su membresía del semestre trae 500 créditos para el
// autoestudio y los casos equivalentes; puede comprar paquetes de 100 a 500 ($100 por cada 100).
// La bolsa del semestre no se acumula al siguiente; los paquetes comprados no vencen y se usan
// cuando se acaba la bolsa. Funciones puras.
import { nuevaLlave, vigente } from "../licencias";
import type { BaseDeDatos, CompraCreditos, MovimientoAlumno } from "../tipos";
import { semestreDe } from "./stroop";

export const BOLSA_SEMESTRE = 500;
export const PAQUETES_CREDITOS = [100, 200, 300, 400, 500] as const;
/** Precio en MXN con IVA por cada 100 créditos. */
export const PRECIO_POR_CIEN = 100;

export const precioPaquete = (creditos: number) => (creditos / 100) * PRECIO_POR_CIEN;
export const esPaquete = (v: unknown): v is (typeof PAQUETES_CREDITOS)[number] => typeof v === "number" && (PAQUETES_CREDITOS as readonly number[]).includes(v);

type DbBolsa = Pick<BaseDeDatos, "licencias"> & { movimientosAlumno?: MovimientoAlumno[]; comprasCreditos?: CompraCreditos[] };

/**
 * true si el alumno tiene membresía en el semestre: una licencia pagada vigente en cualquier curso.
 * Si las licencias no son obligatorias, todos los alumnos tienen su bolsa.
 */
export function tieneMembresia(db: Pick<BaseDeDatos, "licencias">, alumnoId: string, obligatorias: boolean, ahora: Date = new Date()): boolean {
  if (!obligatorias) return true;
  return (db.licencias ?? []).some((l) => l.alumnoId === alumnoId && vigente(l, ahora));
}

export interface SaldoAlumno {
  semestre: string;
  /** Lo que queda de la bolsa de este semestre (0 sin membresía). */
  bolsa: number;
  /** Créditos comprados que quedan. */
  extra: number;
  total: number;
  /** Lo que consumió este semestre. */
  usados: number;
  membresia: boolean;
}

/**
 * Saldo del alumno. Cada consumo sale primero de la bolsa del semestre (si tiene membresía) y lo
 * que falte, de los créditos comprados; cada movimiento guarda cuánto tomó de la bolsa.
 */
export function saldoAlumno(db: DbBolsa, alumnoId: string, obligatorias: boolean, ahora: Date = new Date()): SaldoAlumno {
  const semestre = semestreDe(ahora);
  const membresia = tieneMembresia(db, alumnoId, obligatorias, ahora);
  const comprados = (db.comprasCreditos ?? []).filter((c) => c.alumnoId === alumnoId && c.estado === "pagada").reduce((s, c) => s + c.creditos, 0);
  let deBolsaSemestre = 0;
  let deExtra = 0;
  let usados = 0;
  for (const m of db.movimientosAlumno ?? []) {
    if (m.alumnoId !== alumnoId || m.cantidad >= 0) continue;
    const deBolsa = Math.min(-m.cantidad, m.deBolsa ?? 0);
    deExtra += -m.cantidad - deBolsa;
    if (m.semestre === semestre) {
      deBolsaSemestre += deBolsa;
      usados += -m.cantidad;
    }
  }
  const bolsa = membresia ? Math.max(0, BOLSA_SEMESTRE - deBolsaSemestre) : 0;
  const extra = Math.max(0, round(comprados - deExtra));
  return { semestre, bolsa: round(bolsa), extra, total: round(bolsa + extra), usados: round(usados), membresia };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Descuenta créditos de la bolsa del alumno. Devuelve false (sin cambiar nada) si no alcanzan. */
export function cobrarAlumno(
  db: DbBolsa,
  datos: { alumnoId: string; cantidad: number; concepto: string; grupoId?: string },
  obligatorias: boolean,
  ahora: Date = new Date(),
): boolean {
  if (!(datos.cantidad > 0)) return true;
  const saldo = saldoAlumno(db, datos.alumnoId, obligatorias, ahora);
  if (saldo.total + 1e-9 < datos.cantidad) return false;
  (db.movimientosAlumno ??= []).unshift({
    alumnoId: datos.alumnoId,
    fecha: ahora.toISOString(),
    semestre: semestreDe(ahora),
    concepto: datos.concepto,
    cantidad: -round(datos.cantidad),
    deBolsa: round(Math.min(datos.cantidad, saldo.bolsa)),
    ...(datos.grupoId ? { grupoId: datos.grupoId } : {}),
  });
  return true;
}

/** Nueva compra pendiente de pago. La llave es CRE-XXXX-XXXX-XXXX. */
export function nuevaCompra(db: DbBolsa, alumnoId: string, creditos: number, ahora: Date = new Date()): CompraCreditos {
  const usadas = (db.comprasCreditos ?? []).map((c) => c.llave.replace(/^CRE/, "IEG"));
  const llave = nuevaLlave(usadas).replace(/^IEG/, "CRE");
  const compra: CompraCreditos = { llave, alumnoId, creditos, precio: precioPaquete(creditos), estado: "pendiente", creadaEn: ahora.toISOString() };
  (db.comprasCreditos ??= []).push(compra);
  return compra;
}

export const esLlaveCompra = (llave: string) => /^CRE-/i.test(llave.trim());

/**
 * Marca la compra como pagada si el monto alcanza. Repetir el aviso no abona dos veces.
 * Devuelve la compra, o un error.
 */
export function confirmarCompra(
  db: DbBolsa,
  llave: string,
  pago: { proveedor: "mercadopago" | "demo"; pagoId?: string; monto: number },
  ahora: Date = new Date(),
): { compra: CompraCreditos; nueva: boolean } | { error: "noExiste" | "monto" | "cancelada" } {
  const compra = (db.comprasCreditos ?? []).find((c) => c.llave === llave.trim().toUpperCase());
  if (!compra) return { error: "noExiste" };
  if (compra.estado === "pagada") return { compra, nueva: false };
  if (compra.estado === "cancelada") return { error: "cancelada" };
  if (pago.monto + 0.01 < compra.precio) return { error: "monto" };
  Object.assign(compra, { estado: "pagada", pagadaEn: ahora.toISOString(), proveedor: pago.proveedor, pagoId: pago.pagoId });
  return { compra, nueva: true };
}

/** Movimientos del alumno, del más reciente al más antiguo, con las compras pagadas como abonos. */
export function historialAlumno(db: DbBolsa, alumnoId: string): { fecha: string; concepto: string; cantidad: number }[] {
  const consumos = (db.movimientosAlumno ?? []).filter((m) => m.alumnoId === alumnoId).map((m) => ({ fecha: m.fecha, concepto: m.concepto, cantidad: m.cantidad }));
  const compras = (db.comprasCreditos ?? [])
    .filter((c) => c.alumnoId === alumnoId && c.estado === "pagada")
    .map((c) => ({ fecha: c.pagadaEn ?? c.creadaEn, concepto: `compra:${c.creditos}`, cantidad: c.creditos }));
  return [...consumos, ...compras].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
