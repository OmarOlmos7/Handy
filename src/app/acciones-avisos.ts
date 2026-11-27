"use server";

import { revalidatePath } from "next/cache";
import { borrarCarpeta, leer, modificar } from "@/lib/almacen";
import { LECTOR_PROFESOR, carpetaAviso, marcarLeido } from "@/lib/avisos";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";

/** ¿Quién es el lector de este aviso? El profesor del curso o el alumno inscrito (por su matrícula). */
async function lectorDe(avisoId: string) {
  const db = await leer();
  const aviso = (db.avisos ?? []).find((a) => a.id === avisoId);
  if (!aviso) return undefined;
  const grupo = db.grupos.find((g) => g.id === aviso.grupoId);
  const profesor = await profesorActual();
  if (profesor && grupo?.profesorId === profesor.id) return { aviso, lector: LECTOR_PROFESOR, profesor: true };
  const matricula = matriculaEnCurso(await alumnoActual(), aviso.grupoId);
  return matricula ? { aviso, lector: matricula, profesor: false } : undefined;
}

/** Al abrir un aviso se marca como leído para quien lo abre (si le llegó a él). */
export async function marcarAvisoLeido(avisoId: string) {
  const quien = await lectorDe(avisoId);
  if (!quien) return;
  const cambio = modificar((db) => {
    const aviso = (db.avisos ?? []).find((a) => a.id === avisoId);
    return aviso ? marcarLeido(aviso, quien.lector) : false;
  });
  if (cambio) {
    revalidatePath("/profesor", "layout");
    revalidatePath("/alumno", "layout");
  }
}

/** Borra un aviso con sus anexos. El profesor puede borrar cualquiera de su curso; el alumno, los suyos. */
export async function borrarAviso(avisoId: string) {
  const quien = await lectorDe(avisoId);
  const suyo = quien && (quien.profesor || (quien.aviso.autor.tipo === "alumno" && quien.aviso.autor.matricula === quien.lector));
  if (!suyo) throw new Error("No autorizado");
  modificar((db) => {
    db.avisos = (db.avisos ?? []).filter((a) => a.id !== avisoId);
  });
  borrarCarpeta(carpetaAviso(avisoId));
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
}
