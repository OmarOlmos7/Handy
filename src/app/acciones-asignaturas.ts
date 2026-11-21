"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modificar } from "@/lib/almacen";
import { limpiarUnidades, resumenTemario } from "@/lib/asignaturas";
import { requerirProfesor } from "@/lib/sesion";

/** Guarda los cambios del profesor a la tabla del temario. */
export async function guardarAsignatura(id: string, datos: { nombre: string; nivel: string; unidades: unknown }): Promise<{ ok: true } | { error: "noEncontrada" | "sinTemas" }> {
  const profesor = await requerirProfesor();
  const unidades = limpiarUnidades(datos.unidades);
  if (resumenTemario(unidades).temas === 0) return { error: "sinTemas" };
  const ok = modificar((db) => {
    const a = db.asignaturas?.find((x) => x.id === id && x.profesorId === profesor.id);
    if (!a) return false;
    a.nombre = datos.nombre.trim().slice(0, 120) || a.nombre;
    a.nivel = datos.nivel.trim().slice(0, 120) || undefined;
    a.unidades = unidades;
    a.actualizadaEn = new Date().toISOString();
    return true;
  });
  if (!ok) return { error: "noEncontrada" };
  revalidatePath("/profesor", "layout");
  return { ok: true };
}

/** Borra la asignatura. Las actividades conservan los temas que ya tenían. */
export async function borrarAsignatura(id: string) {
  const profesor = await requerirProfesor();
  modificar((db) => {
    db.asignaturas = (db.asignaturas ?? []).filter((x) => !(x.id === id && x.profesorId === profesor.id));
  });
  revalidatePath("/profesor", "layout");
  redirect("/profesor/asignaturas");
}
