// Enlaces para recuperar la contraseña (profesor) o la clave de acceso (alumno).
// Se guarda solo el hash del token; el enlace vale una hora y se usa una sola vez.
import { hashToken, nuevoToken } from "./cuentas";
import type { BaseDeDatos, Recuperacion } from "./tipos";

export const VIGENCIA_RECUPERACION_MS = 60 * 60 * 1000;
/** Tiempo mínimo entre dos correos para la misma cuenta. */
export const ESPERA_RECUPERACION_MS = 60 * 1000;

/**
 * Crea un enlace de recuperación para la cuenta y devuelve el token (solo va en el correo).
 * Devuelve undefined si se pidió otro hace menos de un minuto.
 */
export function crearRecuperacion(db: BaseDeDatos, tipo: Recuperacion["tipo"], cuentaId: string, ahora = Date.now()): string | undefined {
  const vigentes = (db.recuperaciones ?? []).filter((r) => Date.parse(r.vence) > ahora);
  const reciente = vigentes.some(
    (r) => r.tipo === tipo && r.cuentaId === cuentaId && ahora - (Date.parse(r.vence) - VIGENCIA_RECUPERACION_MS) < ESPERA_RECUPERACION_MS,
  );
  db.recuperaciones = vigentes;
  if (reciente) return undefined;
  const token = nuevoToken();
  db.recuperaciones.push({ hash: hashToken(token), tipo, cuentaId, vence: new Date(ahora + VIGENCIA_RECUPERACION_MS).toISOString() });
  return token;
}

/** Recuperación vigente del token, sin usarla. */
export function buscarRecuperacion(db: BaseDeDatos, token: string, ahora = Date.now()): Recuperacion | undefined {
  if (!token) return undefined;
  const hash = hashToken(token);
  return (db.recuperaciones ?? []).find((r) => r.hash === hash && Date.parse(r.vence) > ahora);
}

/**
 * Usa el token: cambia la contraseña con el hash dado, borra los enlaces de esa cuenta y cierra
 * sus sesiones abiertas. Devuelve el tipo de cuenta, o undefined si el enlace no sirve.
 */
export function usarRecuperacion(db: BaseDeDatos, token: string, contrasenaHash: string, ahora = Date.now()): Recuperacion["tipo"] | undefined {
  const r = buscarRecuperacion(db, token, ahora);
  if (!r) return undefined;
  const cuenta = r.tipo === "profesor" ? db.profesores.find((p) => p.id === r.cuentaId) : db.cuentasAlumno.find((a) => a.id === r.cuentaId);
  if (!cuenta) return undefined;
  cuenta.contrasena = contrasenaHash;
  db.recuperaciones = (db.recuperaciones ?? []).filter((x) => !(x.tipo === r.tipo && x.cuentaId === r.cuentaId));
  db.sesiones = db.sesiones.filter((s) => (r.tipo === "profesor" ? s.profesorId : s.alumnoId) !== r.cuentaId);
  return r.tipo;
}
