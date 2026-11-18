// Cuentas de alumno: correo + clave de acceso. El alumno solo ve sus propios resultados.
import "server-only";
import crypto from "node:crypto";
import { modificar } from "./almacen";
import { correoValido, cuentaAlumnoPorCorreo, hashContrasena, normalizarCorreo, normalizarMatricula, verificarContrasena } from "./cuentas";
import type { BaseDeDatos, CuentaAlumno } from "./tipos";

export const LARGO_MINIMO_CLAVE = 6;

/** Error de cuenta: clave de alumno.errores del diccionario (se traduce al mostrarlo). */
export type ErrorCuentaAlumno = "nombre" | "matricula" | "correo" | "claveCorta" | "yaExiste";

export type ResultadoCuenta = { ok: true; cuenta: CuentaAlumno } | { ok: false; error: ErrorCuentaAlumno };

/** Cuenta del alumno si el correo y la clave coinciden. */
export function verificarAlumno(db: BaseDeDatos, correo: string, clave: string): CuentaAlumno | undefined {
  const cuenta = cuentaAlumnoPorCorreo(db, correo);
  return cuenta && verificarContrasena(clave, cuenta.contrasena) ? cuenta : undefined;
}

/** Crea la cuenta del alumno. Falla si el correo ya existe o faltan datos. */
export function crearCuentaAlumno(datos: { nombre: string; matricula: string; correo: string; clave: string }): ResultadoCuenta {
  const nombre = datos.nombre.replace(/\s+/g, " ").trim().slice(0, 120);
  const matricula = normalizarMatricula(datos.matricula);
  const correo = normalizarCorreo(datos.correo);
  if (nombre.length < 3) return { ok: false, error: "nombre" };
  if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) return { ok: false, error: "matricula" };
  if (!correoValido(correo)) return { ok: false, error: "correo" };
  if (datos.clave.length < LARGO_MINIMO_CLAVE) return { ok: false, error: "claveCorta" };
  const cuenta: CuentaAlumno = {
    id: `al-${crypto.randomBytes(6).toString("hex")}`,
    correo,
    nombre,
    matricula,
    contrasena: hashContrasena(datos.clave),
    creadoEn: new Date().toISOString(),
  };
  const creada = modificar((db) => {
    if (cuentaAlumnoPorCorreo(db, correo)) return false;
    db.cuentasAlumno.push(cuenta);
    return true;
  });
  return creada ? { ok: true, cuenta } : { ok: false, error: "yaExiste" };
}
