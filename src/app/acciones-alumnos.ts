"use server";

import { revalidatePath } from "next/cache";
import { borrarCarpeta, modificar } from "@/lib/almacen";
import { ErrorAlumnoGrupo, altaAlumno, altaVarios, bajaAlumno, cambiarAlumno, type ErrorAlumno } from "@/lib/alumnos-grupo";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, Grupo } from "@/lib/tipos";

type Respuesta<T = object> = ({ ok: true } & T) | { error: ErrorAlumno | "general" };

/** Corre el cambio en un curso del profesor con sesión y traduce los errores a códigos. */
async function enCursoPropio<T extends object>(grupoId: string, cambio: (db: BaseDeDatos, grupo: Grupo) => T): Promise<Respuesta<T>> {
  const profesor = await requerirProfesor();
  try {
    const r = modificar((db) => {
      const grupo = db.grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
      if (!grupo) throw new ErrorAlumnoGrupo("noEncontrado");
      return cambio(db, grupo);
    });
    revalidatePath("/profesor", "layout");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ErrorAlumnoGrupo) return { error: e.codigo };
    console.error(e);
    return { error: "general" };
  }
}

/** Alta de un alumno en la lista del curso. */
export async function darDeAltaAlumno(grupoId: string, datos: { matricula: string; nombre: string; correo: string }) {
  return enCursoPropio(grupoId, (_db, grupo) => ({ matricula: altaAlumno(grupo, datos).matricula }));
}

/** Alta de varios alumnos pegados de Excel o de una lista. */
export async function darDeAltaLista(grupoId: string, lista: string) {
  return enCursoPropio(grupoId, (_db, grupo) => altaVarios(grupo, String(lista).slice(0, 200_000)));
}

/** Cambia nombre, matrícula o correo; su trabajo en el curso sigue con él. */
export async function cambiarDatosAlumno(grupoId: string, matricula: string, datos: { matricula: string; nombre: string; correo: string }) {
  return enCursoPropio(grupoId, (db, grupo) => ({ matricula: cambiarAlumno(db, grupo, matricula, datos).matricula }));
}

/** Baja del alumno: sale de la lista y se borra su trabajo en este curso. No se puede deshacer. */
export async function darDeBajaAlumno(grupoId: string, matricula: string) {
  let archivos: string[] = [];
  const r = await enCursoPropio(grupoId, (db, grupo) => {
    archivos = bajaAlumno(db, grupo, matricula).archivos;
    return {};
  });
  if ("ok" in r) for (const a of archivos) borrarCarpeta(a);
  return r;
}
