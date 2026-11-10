// Sesiones de profesor (correo y contraseña) y de alumno (ID de curso y matrícula).
// Toda página, acción y ruta que toque datos de un curso pasa por aquí.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leer, modificar } from "./almacen";
import { datosDeProfesor, hashToken, nuevoToken } from "./cuentas";
import type { BaseDeDatos, Grupo } from "./tipos";

const COOKIE_PROFESOR = "rt_sesion";
const COOKIE_ALUMNO = "rt_alumno";
const DIAS_PROFESOR = 30;
const DIAS_ALUMNO = 7;

// Con http (pruebas en la red local) la cookie no puede ser "secure".
const SEGURA = (process.env.APP_URL ?? "").startsWith("https://");

async function abrir(nombreCookie: string, dias: number, datos: { profesorId?: string; alumno?: { grupoId: string; matricula: string } }) {
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
export const iniciarSesionAlumno = (grupoId: string, matricula: string) =>
  abrir(COOKIE_ALUMNO, DIAS_ALUMNO, { alumno: { grupoId, matricula } });
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

/** Datos del profesor con sesión: solo sus cursos, actividades, entregas y créditos. */
export async function datosProfesor() {
  const profesor = await requerirProfesor();
  return { profesor, db: datosDeProfesor(await leer(), profesor.id) };
}

/** Alumno con sesión abierta (entró con ID de curso y matrícula), o undefined. */
export const alumnoActual = cache(async (): Promise<{ grupo: Grupo; matricula: string; nombre: string } | undefined> => {
  const db = await leer();
  const sesion = await sesionDe(COOKIE_ALUMNO, db);
  if (!sesion?.alumno) return undefined;
  const grupo = db.grupos.find((g) => g.id === sesion.alumno!.grupoId);
  const alumno = grupo?.alumnos.find((a) => a.matricula === sesion.alumno!.matricula);
  return grupo && alumno ? { grupo, matricula: alumno.matricula, nombre: alumno.nombre } : undefined;
});
