"use server";

import { revalidatePath } from "next/cache";
import { modificar } from "@/lib/almacen";
import { ANIMOS, LARGO_SENTIR, pesoAutoestudio, senalesDeRiesgo } from "@/lib/autoestudio";
import { alumnoActual, requerirProfesor } from "@/lib/sesion";

/**
 * El alumno cuenta cómo se sintió al hacer su actividad autoasignada. Si el texto tiene señales de
 * agresión, tristeza profunda, enojo o violencia, el compañero no responde ni aconseja: la vista
 * muestra solo la frase de apoyo y el profesor ve el aviso en su tabla.
 */
export async function guardarSentir(id: string, sentir: string, animo: string): Promise<{ bloqueado: boolean }> {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  const texto = sentir.trim().slice(0, LARGO_SENTIR);
  const bloqueado = senalesDeRiesgo(texto);
  modificar((db) => {
    const a = db.autoactividades?.find((x) => x.id === id && x.alumnoId === alumno.id);
    if (!a) throw new Error("No encontrada");
    a.sentir = texto || undefined;
    a.animo = (ANIMOS as readonly string[]).includes(animo) ? animo : undefined;
    if (bloqueado) a.alerta = true;
  });
  revalidatePath("/alumno", "layout");
  return { bloqueado };
}

/** El profesor fija qué porcentaje de la nota final aportan las actividades autoasignadas. */
export async function cambiarPesoAutoestudio(grupoId: string, peso: number) {
  const profesor = await requerirProfesor();
  modificar((db) => {
    const g = db.grupos.find((x) => x.id === grupoId && x.profesorId === profesor.id);
    if (!g) throw new Error("Curso no encontrado");
    const p = pesoAutoestudio(peso);
    if (p > 0) g.pesoAutoestudio = p;
    else delete g.pesoAutoestudio;
  });
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
}
