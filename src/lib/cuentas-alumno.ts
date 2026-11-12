// Cuentas de alumno: correo + clave de acceso. El alumno solo ve sus propios resultados.
import "server-only";
import crypto from "node:crypto";
import { modificar } from "./almacen";
import { correoValido, cuentaAlumnoPorCorreo, hashContrasena, normalizarCorreo, normalizarMatricula, verificarContrasena } from "./cuentas";
import type { BaseDeDatos, CuentaAlumno } from "./tipos";

export const LARGO_MINIMO_CLAVE = 6;

export type ResultadoCuenta = { ok: true; cuenta: CuentaAlumno } | { ok: false; error: string };

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
  if (nombre.length < 3) return { ok: false, error: "Escribe tu nombre completo." };
  if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) return { ok: false, error: "Escribe tu matrícula (letras y números, sin espacios)." };
  if (!correoValido(correo)) return { ok: false, error: "Escribe un correo válido." };
  if (datos.clave.length < LARGO_MINIMO_CLAVE) {
    return { ok: false, error: `Tu clave de acceso debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` };
  }
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
  return creada ? { ok: true, cuenta } : { ok: false, error: "Ya existe una cuenta con ese correo. Entra con tu clave de acceso." };
}
