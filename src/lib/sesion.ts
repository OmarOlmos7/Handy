// Sesiones de profesor (correo y contraseña) y de alumno (correo y clave de acceso).
// Toda página, acción y ruta que toque datos de un curso pasa por aquí.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { esAdmin } from "./admin";
import { leer, modificar } from "./almacen";
import { cursosDeAlumno, datosDeProfesor, hashToken, nuevoToken } from "./cuentas";
import type { Alumno, BaseDeDatos, Grupo } from "./tipos";

const COOKIE_PROFESOR = "rt_sesion";
const COOKIE_ALUMNO = "rt_alumno";
const DIAS_PROFESOR = 30;
const DIAS_ALUMNO = 30;

// Con http (pruebas en la red local) la cookie no puede ser "secure".
const SEGURA = (process.env.APP_URL ?? "").startsWith("https://");

async function abrir(nombreCookie: string, dias: number, datos: { profesorId?: string; alumnoId?: string }) {
  const token = nuevoToken();
  const expira = new Date(Date.now() + dias * 86_400_000);
  modificar((db) => {
    const ahora = new Date().toISOString();
    db.sesiones = db.sesiones.filter((s) => s.expira > ahora);
    db.sesiones.push({ token: hashToken(token), expira: expira.toISOString(), ...datos });
  });
  (await cookies()).set(nombreCookie, token, { httpOnly: true, secure: SEGURA, sameSite: "lax", path: "/", expires: expira });
}

async function cerrar(nombreCookie: string) {
  const almacen = await cookies();
  const token = almacen.get(nombreCookie)?.value;
  if (token) {
    const h = hashToken(token);
    modificar((db) => {
      db.sesiones = db.sesiones.filter((s) => s.token !== h);
    });
  }
  almacen.delete(nombreCookie);
}

async function sesionDe(nombreCookie: string, db: BaseDeDatos) {
  const token = (await cookies()).get(nombreCookie)?.value;
  if (!token) return undefined;
  const h = hashToken(token);
  const ahora = new Date().toISOString();
  return db.sesiones.find((s) => s.token === h && s.expira > ahora);
}

export const iniciarSesionProfesor = (profesorId: string) => abrir(COOKIE_PROFESOR, DIAS_PROFESOR, { profesorId });
export const cerrarSesionProfesor = () => cerrar(COOKIE_PROFESOR);
export const iniciarSesionAlumno = (alumnoId: string) => abrir(COOKIE_ALUMNO, DIAS_ALUMNO, { alumnoId });
export const cerrarSesionAlumno = () => cerrar(COOKIE_ALUMNO);

/** Profesor con sesión abierta, o undefined. Se memoriza durante una petición. */
export const profesorActual = cache(async () => {
  const db = await leer();
  const sesion = await sesionDe(COOKIE_PROFESOR, db);
  const p = sesion?.profesorId ? db.profesores.find((x) => x.id === sesion.profesorId) : undefined;
  return p ? { id: p.id, nombre: p.nombre, correo: p.correo } : undefined;
});

/** Exige sesión de profesor; si no hay, manda a /ingresar. */
export async function requerirProfesor() {
  const p = await profesorActual();
  if (!p) redirect("/ingresar");
  return p;
}

/**
 * Exige sesión de un administrador (su correo está en ADMIN_CORREOS). A los demás
 * la página les responde "no encontrada" para no revelar que existe.
 */
export async function requerirAdmin() {
  const p = await requerirProfesor();
  if (!esAdmin(p.correo)) notFound();
  return p;
}

/** Datos del profesor con sesión: solo sus cursos, actividades, entregas y créditos. */
export async function datosProfesor() {
  const profesor = await requerirProfesor();
  return { profesor, db: datosDeProfesor(await leer(), profesor.id) };
}

export interface AlumnoConSesion {
  id: string;
  nombre: string;
  correo: string;
  matricula: string;
  /** Cursos donde está inscrito, con la matrícula que tiene en cada uno. */
  cursos: { grupo: Grupo; alumno: Alumno }[];
}

/** Alumno con sesión abierta (entró con su correo y clave), o undefined. */
export const alumnoActual = cache(async (): Promise<AlumnoConSesion | undefined> => {
  const db = await leer();
  const sesion = await sesionDe(COOKIE_ALUMNO, db);
  const cuenta = sesion?.alumnoId ? db.cuentasAlumno.find((c) => c.id === sesion.alumnoId) : undefined;
  if (!cuenta) return undefined;
  return { id: cuenta.id, nombre: cuenta.nombre, correo: cuenta.correo, matricula: cuenta.matricula, cursos: cursosDeAlumno(db, cuenta) };
});

/** Matrícula con que el alumno con sesión aparece en el curso, si está inscrito. */
export function matriculaEnCurso(alumno: AlumnoConSesion | undefined, grupoId: string): string | undefined {
  return alumno?.cursos.find((c) => c.grupo.id === grupoId)?.alumno.matricula;
}
