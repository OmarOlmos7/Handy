"use server";

import { revalidatePath } from "next/cache";
import { borrarCarpeta, modificar } from "@/lib/almacen";
import { bajaAlumno } from "@/lib/alumnos-grupo";
import { COLORES } from "@/lib/colores";
import { alumnoActual } from "@/lib/sesion";

/** Color de la tarjeta de un curso en el portal del alumno. Solo cambia su propia vista. */
export async function colorCursoAlumno(grupoId: string, color: string) {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  if (!alumno.cursos.some((c) => c.grupo.id === grupoId)) throw new Error("No autorizado");
  const valido = COLORES.some((c) => c.clave === color) ? color : undefined;
  modificar((db) => {
    const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
    if (!cuenta) return;
    const colores = { ...(cuenta.colores ?? {}) };
    // "ninguno" quita el color propio y vuelve al que puso el profesor.
    if (valido) colores[grupoId] = valido;
    else delete colores[grupoId];
    cuenta.colores = colores;
  });
  revalidatePath("/alumno", "layout");
}

/** Archiva o restaura un curso en el portal del alumno. Solo cambia su propia vista. */
export async function archivarCursoAlumno(grupoId: string, archivar: boolean) {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  if (!alumno.cursos.some((c) => c.grupo.id === grupoId)) throw new Error("No autorizado");
  modificar((db) => {
    const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
    if (!cuenta) return;
    const archivados = { ...(cuenta.archivados ?? {}) };
    if (archivar) archivados[grupoId] = new Date().toISOString();
    else delete archivados[grupoId];
    cuenta.archivados = Object.keys(archivados).length ? archivados : undefined;
  });
  revalidatePath("/alumno", "layout");
}

/**
 * El alumno sale del curso por completo (bote de su tarjeta): deja la lista del profesor y se borra
 * su trabajo en ese curso (entregas, calificaciones, autoestudio, valoración y tiempos) con sus
 * archivos. Es la misma baja que hace el profesor. No se puede deshacer; su cuenta y sus otros cursos
 * no cambian.
 */
export async function salirDelCursoAlumno(grupoId: string) {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  const enCurso = [...alumno.cursos, ...alumno.porActivar].find((c) => c.grupo.id === grupoId);
  if (!enCurso) throw new Error("No autorizado");
  const archivos = modificar((db) => {
    const grupo = db.grupos.find((g) => g.id === grupoId);
    if (!grupo) throw new Error("Curso no encontrado");
    const { archivos } = bajaAlumno(db, grupo, enCurso.alumno.matricula);
    const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
    if (cuenta?.archivados?.[grupoId]) {
      const resto = { ...cuenta.archivados };
      delete resto[grupoId];
      cuenta.archivados = Object.keys(resto).length ? resto : undefined;
    }
    if (cuenta?.colores?.[grupoId]) {
      const resto = { ...cuenta.colores };
      delete resto[grupoId];
      cuenta.colores = resto;
    }
    return archivos;
  });
  for (const a of archivos) borrarCarpeta(a);
  revalidatePath("/alumno", "layout");
  revalidatePath("/profesor", "layout");
}
