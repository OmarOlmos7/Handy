"use server";

import { revalidatePath } from "next/cache";
import { modificar } from "@/lib/almacen";
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
 * Quita un curso del portal del alumno (bote de la tarjeta). Solo cambia su vista: el profesor
 * conserva la lista, las entregas y las calificaciones. Vuelve si el alumno ingresa el código del curso.
 */
export async function quitarCursoAlumno(grupoId: string) {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  if (![...alumno.cursos, ...alumno.porActivar].some((c) => c.grupo.id === grupoId)) throw new Error("No autorizado");
  modificar((db) => {
    const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
    if (!cuenta) return;
    cuenta.quitados = [...new Set([...(cuenta.quitados ?? []), grupoId])];
    if (cuenta.archivados?.[grupoId]) {
      const resto = { ...cuenta.archivados };
      delete resto[grupoId];
      cuenta.archivados = Object.keys(resto).length ? resto : undefined;
    }
  });
  revalidatePath("/alumno", "layout");
}
