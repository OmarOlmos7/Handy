"use server";

import { revalidatePath } from "next/cache";
import { leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { generarEstudio } from "@/lib/evaluacion";
import { requerirProfesor } from "@/lib/sesion";

/** El profesor pide (otra vez) los videos sugeridos y los ejercicios de repaso de un alumno. */
export async function generarRecomendaciones(actividadId: string, matricula: string): Promise<{ ok: boolean }> {
  const profesor = await requerirProfesor();
  if (!esDelProfesor(await leer(), actividadId, profesor.id)) return { ok: false };
  const ok = await generarEstudio(actividadId, matricula);
  revalidatePath(`/profesor/actividades/${actividadId}/revision/${matricula}/retroalimentacion`);
  revalidatePath("/alumno", "layout");
  return { ok };
}
