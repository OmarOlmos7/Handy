// Cuentas de profesor y separación de datos por profesor. Funciones puras (sin
// cookies ni disco) para poder probarlas; la sesión vive en sesion.ts.
import crypto from "node:crypto";
import type { BaseDeDatos, Grupo } from "./tipos";

const LARGO_HASH = 64;

export function hashContrasena(contrasena: string): string {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(contrasena, sal, LARGO_HASH);
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarContrasena(contrasena: string, guardada: string): boolean {
  const [salHex, hashHex] = guardada.split(":");
  if (!salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = crypto.scryptSync(contrasena, Buffer.from(salHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(esperado, calculado);
}

export function nuevoToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** Matrícula sin espacios y en mayúsculas, para que "a0231 " y "A0231" sean la misma. */
export function normalizarMatricula(matricula: string): string {
  return matricula.replace(/\s+/g, "").toUpperCase();
}

/** Sin 0/O ni 1/I para que se pueda dictar y copiar sin confusiones. */
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** ID de curso legible, único en la base: 3 letras de la materia + 4 caracteres. */
export function nuevoCodigoCurso(materia: string, existentes: Iterable<string>): string {
  const usados = new Set(existentes);
  const prefijo =
    materia
      .normalize("NFD")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");
  for (;;) {
    const bytes = crypto.randomBytes(4);
    const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
    const codigo = `${prefijo}-${sufijo}`;
    if (!usados.has(codigo)) return codigo;
  }
}

export function normalizarCodigoCurso(codigo: string): string {
  const limpio = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return limpio.length > 3 ? `${limpio.slice(0, 3)}-${limpio.slice(3)}` : limpio;
}

export function grupoPorCodigo(db: BaseDeDatos, codigo: string): Grupo | undefined {
  const buscado = normalizarCodigoCurso(codigo);
  return db.grupos.find((g) => g.codigo === buscado);
}

/** Copia de la base con solo lo que pertenece a un profesor. */
export function datosDeProfesor(db: BaseDeDatos, profesorId: string): BaseDeDatos {
  const grupos = db.grupos.filter((g) => g.profesorId === profesorId);
  const idsGrupos = new Set(grupos.map((g) => g.id));
  const actividades = db.actividades.filter((a) => idsGrupos.has(a.grupoId));
  const idsActividades = new Set(actividades.map((a) => a.id));
  return {
    version: db.version,
    profesores: [],
    sesiones: [],
    grupos,
    actividades,
    entregas: db.entregas.filter((e) => idsActividades.has(e.actividadId)),
    movimientos: db.movimientos.filter((m) => m.profesorId === profesorId),
  };
}

/** true si la actividad pertenece a un curso del profesor. */
export function esDelProfesor(db: BaseDeDatos, actividadId: string, profesorId: string): boolean {
  const actividad = db.actividades.find((a) => a.id === actividadId);
  const grupo = actividad && db.grupos.find((g) => g.id === actividad.grupoId);
  return Boolean(grupo && grupo.profesorId === profesorId);
}

/**
 * Pone al día una base de la versión 1 (sin cuentas): agrega las listas nuevas
 * y un ID de curso a cada grupo. Los grupos sin dueño los adopta el primer
 * profesor que se registra (ver adoptarSinDueno).
 */
export function migrar(db: BaseDeDatos): BaseDeDatos {
  db.profesores ??= [];
  db.sesiones ??= [];
  const codigos = db.grupos.map((g) => g.codigo).filter((c): c is string => Boolean(c));
  for (const g of db.grupos) {
    if (!g.codigo) {
      g.codigo = nuevoCodigoCurso(g.materia, codigos);
      codigos.push(g.codigo);
    }
  }
  db.version = 2;
  return db;
}

/** El primer profesor registrado se queda con los cursos y créditos que no tienen dueño. */
export function adoptarSinDueno(db: BaseDeDatos, profesorId: string) {
  for (const g of db.grupos) g.profesorId ??= profesorId;
  for (const m of db.movimientos) m.profesorId ??= profesorId;
}

export function saldoDe(db: BaseDeDatos, profesorId: string): number {
  return db.movimientos.filter((m) => m.profesorId === profesorId).reduce((s, m) => s + m.cantidad, 0);
}
