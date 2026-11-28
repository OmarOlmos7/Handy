// Licencias de alumno: cada alumno paga una licencia por curso (5 semanas, 10 semanas, un semestre
// o un año). El alumno escribe el código del curso, se crea una licencia pendiente con una llave
// única que liga su pago a ese curso, y el acceso se abre cuando la pasarela confirma el pago.
// Funciones puras sobre la base de datos (sin disco ni red) para poder probarlas.
import { MARGEN_RIESGO } from "./configuracion";
import { alumnoEnGrupo, normalizarCorreo, normalizarMatricula } from "./cuentas";
import { costoCreditoMXN, IVA, utilidad } from "./planes";
import type { BaseDeDatos, CuentaAlumno, Grupo, IdLicencia, Licencia } from "./tipos";

export interface TipoLicencia {
  id: IdLicencia;
  /** Semanas de acceso al curso. */
  semanas: number;
  /** Precio en MXN con IVA. */
  precio: number;
  /** Precio por confirmar (se muestra con aviso). */
  provisional?: boolean;
  destacado?: boolean;
}

/** Precio del semestre (confirmado por Omar el 28-nov-2026). */
export const PRECIO_SEMESTRE = 700;
export const SEMESTRE_PROVISIONAL = false;

export const LICENCIAS: TipoLicencia[] = [
  { id: "semanas5", semanas: 5, precio: 350 },
  { id: "semanas10", semanas: 10, precio: 550 },
  { id: "semestre", semanas: 26, precio: PRECIO_SEMESTRE, provisional: SEMESTRE_PROVISIONAL, destacado: true },
  { id: "anual", semanas: 52, precio: 850 },
];

export const tipoLicencia = (id: IdLicencia) => LICENCIAS.find((l) => l.id === id)!;

export function esIdLicencia(v: unknown): v is IdLicencia {
  return typeof v === "string" && LICENCIAS.some((l) => l.id === v);
}

// ---------- Créditos de IA del profesor ----------
/**
 * Créditos de IA que cada semana de licencia pagada abona al profesor del curso. Con ellos se pagan
 * la evaluación y el autoestudio de ese alumno (≈ 4 hojas por semana en nivel Medio).
 */
export const CREDITOS_POR_SEMANA = 10;

export function creditosLicencia(t: Pick<TipoLicencia, "semanas">): number {
  return t.semanas * CREDITOS_POR_SEMANA;
}

/** Comisión de Mercado Pago (tarjeta, dinero al instante) sobre un cobro en MXN, sin IVA. */
export const COMISION_MP = { porcentaje: 0.0349, fijo: 4 };

export function comisionCobro(precio: number): number {
  return precio * COMISION_MP.porcentaje + COMISION_MP.fijo;
}

/** Desglose de una licencia en MXN: lo que queda después de comisión y costo de IA, antes de ISR. */
export function desgloseLicencia(t: TipoLicencia) {
  const sinIva = t.precio / (1 + IVA);
  const comision = comisionCobro(t.precio);
  const creditos = creditosLicencia(t);
  const costoIA = creditos * costoCreditoMXN(MARGEN_RIESGO);
  return { sinIva, comision, creditos, costoIA, queda: sinIva - comision - costoIA };
}

/** Utilidad después de ISR y gastos de operación (incluyen la comisión), sobre el ingreso sin IVA. */
export function utilidadLicencia(t: TipoLicencia): number {
  return utilidad({ precio: t.precio, creditos: creditosLicencia(t), riesgo: MARGEN_RIESGO })!;
}

// ---------- Llaves ----------
// Sin letras ni números que se confundan (0/O, 1/I/L).
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Llave única de licencia: IEG-XXXX-XXXX-XXXX (60 bits de azar). */
export function nuevaLlave(usadas: Iterable<string> = [], azar: (n: number) => Uint8Array = bytesAlAzar): string {
  const ocupadas = new Set(usadas);
  for (;;) {
    const b = azar(12);
    const c = Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
    const llave = `IEG-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
    if (!ocupadas.has(llave)) return llave;
  }
}

function bytesAlAzar(n: number) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function normalizarLlave(llave: string): string {
  const c = llave.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const s = c.startsWith("IEG") ? c.slice(3) : c;
  return s.length === 12 ? `IEG-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}` : llave.trim().toUpperCase();
}

// ---------- Vigencia ----------
const DIA = 864e5;

export function vigente(l: Licencia, ahora: Date = new Date()): boolean {
  return l.estado === "pagada" && Boolean(l.vence) && Date.parse(l.vence!) > ahora.getTime();
}

/** Licencia vigente del alumno en el curso (la que vence más tarde), o undefined. */
export function licenciaVigente(db: Pick<BaseDeDatos, "licencias">, alumnoId: string, grupoId: string, ahora: Date = new Date()): Licencia | undefined {
  return (db.licencias ?? [])
    .filter((l) => l.alumnoId === alumnoId && l.grupoId === grupoId && vigente(l, ahora))
    .sort((a, b) => b.vence!.localeCompare(a.vence!))[0];
}

/**
 * true si el acceso al curso exige licencia pagada. Se activa en el servidor con
 * LICENCIAS_OBLIGATORIAS=1; mientras no, los cursos siguen abiertos como hasta ahora.
 */
export function licenciasObligatorias(env: Record<string, string | undefined> = process.env): boolean {
  return env.LICENCIAS_OBLIGATORIAS === "1" || env.LICENCIAS_OBLIGATORIAS === "true";
}

/** true si el alumno puede entrar al curso: sin cobro obligatorio, o con licencia vigente. */
export function tieneAcceso(db: Pick<BaseDeDatos, "licencias">, alumnoId: string, grupoId: string, obligatorias: boolean, ahora: Date = new Date()): boolean {
  return !obligatorias || Boolean(licenciaVigente(db, alumnoId, grupoId, ahora));
}

// ---------- Alta y pago ----------
export type ErrorLicencia = "codigo" | "tipo" | "matriculaOcupada" | "noExiste" | "monto" | "cancelada";

export class ErrorDeLicencia extends Error {
  constructor(public codigo: ErrorLicencia) {
    super(codigo);
  }
}

/**
 * Crea una licencia pendiente de pago para el alumno en el curso. Si ya tiene una pendiente del
 * mismo tipo en ese curso, la reutiliza (así volver a intentar el pago no deja llaves sueltas).
 */
export function crearLicencia(db: BaseDeDatos, cuenta: CuentaAlumno, grupo: Grupo, tipo: IdLicencia, ahora: Date = new Date()): Licencia {
  if (!esIdLicencia(tipo)) throw new ErrorDeLicencia("tipo");
  // La matrícula del alumno ya la usa otro alumno del curso (con otro correo).
  if (!alumnoEnGrupo(grupo, cuenta)) {
    const ocupada = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === cuenta.matricula);
    if (ocupada?.correo && normalizarCorreo(ocupada.correo) !== cuenta.correo) throw new ErrorDeLicencia("matriculaOcupada");
  }
  db.licencias ??= [];
  const previa = db.licencias.find((l) => l.alumnoId === cuenta.id && l.grupoId === grupo.id && l.tipo === tipo && l.estado === "pendiente");
  if (previa) return previa;
  const t = tipoLicencia(tipo);
  const licencia: Licencia = {
    llave: nuevaLlave(db.licencias.map((l) => l.llave)),
    tipo,
    alumnoId: cuenta.id,
    grupoId: grupo.id,
    codigoCurso: grupo.codigo ?? "",
    precio: t.precio,
    semanas: t.semanas,
    creditosProfesor: creditosLicencia(t),
    estado: "pendiente",
    creadaEn: ahora.toISOString(),
  };
  db.licencias.push(licencia);
  return licencia;
}

export interface PagoConfirmado {
  proveedor: Licencia["proveedor"];
  pagoId: string;
  /** Monto cobrado en MXN. */
  monto: number;
}

/**
 * Activa la licencia cuando la pasarela confirma el pago: fija su vencimiento (si el alumno ya
 * tenía una vigente en el curso, se suma al final de esa), inscribe al alumno en la lista del curso
 * y abona los créditos de IA al profesor. Repetir el mismo aviso no hace nada (idempotente).
 */
export function confirmarPago(db: BaseDeDatos, llave: string, pago: PagoConfirmado, ahora: Date = new Date()): { licencia: Licencia; nueva: boolean } {
  const licencia = (db.licencias ?? []).find((l) => l.llave === normalizarLlave(llave));
  if (!licencia) throw new ErrorDeLicencia("noExiste");
  if (licencia.estado === "pagada") return { licencia, nueva: false };
  if (licencia.estado === "cancelada") throw new ErrorDeLicencia("cancelada");
  // Se acepta un centavo de diferencia por redondeo; nunca menos de lo que vale la licencia.
  if (pago.monto + 0.01 < licencia.precio) throw new ErrorDeLicencia("monto");

  const previa = licenciaVigente(db, licencia.alumnoId, licencia.grupoId, ahora);
  const desde = previa ? Date.parse(previa.vence!) : ahora.getTime();
  licencia.estado = "pagada";
  licencia.pagadaEn = ahora.toISOString();
  licencia.vence = new Date(desde + licencia.semanas * 7 * DIA).toISOString();
  licencia.proveedor = pago.proveedor;
  licencia.pagoId = pago.pagoId;

  const grupo = db.grupos.find((g) => g.id === licencia.grupoId);
  const cuenta = db.cuentasAlumno.find((c) => c.id === licencia.alumnoId);
  if (grupo && cuenta) {
    const enCurso = alumnoEnGrupo(grupo, cuenta);
    if (enCurso) enCurso.correo ||= cuenta.correo;
    else grupo.alumnos.push({ matricula: cuenta.matricula, nombre: cuenta.nombre, correo: cuenta.correo });
  }
  if (grupo?.profesorId && licencia.creditosProfesor > 0) {
    db.movimientos.push({
      profesorId: grupo.profesorId,
      fecha: licencia.pagadaEn.slice(0, 10),
      // Sin nombre ni matrícula del alumno: solo el curso y la llave.
      concepto: `Licencia de alumno · ${grupo.materia} ${grupo.nombre} · ${licencia.llave}`,
      cantidad: licencia.creditosProfesor,
    });
  }
  return { licencia, nueva: true };
}

/** Licencias pagadas por curso de un profesor: cuántas vigentes y cuántas en total. */
export function resumenLicenciasProfesor(db: Pick<BaseDeDatos, "licencias" | "grupos">, profesorId: string, ahora: Date = new Date()) {
  const grupos = db.grupos.filter((g) => g.profesorId === profesorId);
  return grupos.map((g) => {
    const pagadas = (db.licencias ?? []).filter((l) => l.grupoId === g.id && l.estado === "pagada");
    const alumnos = new Set(pagadas.filter((l) => vigente(l, ahora)).map((l) => l.alumnoId));
    return { grupo: g, vigentes: alumnos.size, pagadas: pagadas.length, creditos: pagadas.reduce((s, l) => s + l.creditosProfesor, 0) };
  });
}
