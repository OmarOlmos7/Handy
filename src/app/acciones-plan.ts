"use server";

import { revalidatePath } from "next/cache";
import { leer, modificar } from "@/lib/almacen";
import { ErrorIA, generarPlanEvaluacion, iaDisponible } from "@/lib/ia";
import { errorPlan, limpiarPesos, normalizarA100, sumaPesos, TOLERANCIA_SUMA } from "@/lib/plan-evaluacion";
import { requerirProfesor } from "@/lib/sesion";
import type { PesoTipo } from "@/lib/tipos";

// Las acciones devuelven el error como dato (en producción React oculta los mensajes de las excepciones).
export type ResultadoPlan = { pesos: PesoTipo[]; notas: string; ajustado: boolean } | { error: string };

const LARGO_INSTRUCCIONES = 1500;

async function grupoPropio(grupoId: string) {
  const profesor = await requerirProfesor();
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
  return { profesor, db, grupo };
}

/** Propone un plan con IA a partir de las instrucciones. No lo guarda: el profesor lo revisa primero. */
export async function proponerPlan(grupoId: string, instrucciones: string): Promise<ResultadoPlan> {
  const texto = instrucciones.trim().slice(0, LARGO_INSTRUCCIONES);
  if (!texto) return { error: "sinInstrucciones" };
  const { profesor, db, grupo } = await grupoPropio(grupoId);
  if (!grupo) return { error: "noEncontrado" };
  if (!iaDisponible()) return { error: "sinIA" };
  // Solo van los nombres de los tipos de actividad del curso: nunca datos de alumnos.
  const etiquetas = [...new Set(db.actividades.filter((a) => a.grupoId === grupoId).map((a) => a.etiqueta?.trim()).filter((e): e is string => !!e))];
  try {
    const r = await generarPlanEvaluacion(texto, etiquetas, { profesorId: profesor.id });
    const limpios = limpiarPesos(r.pesos, etiquetas);
    if (limpios.length === 0) return { error: "sinPesos" };
    const ajustado = Math.abs(sumaPesos(limpios) - 100) > TOLERANCIA_SUMA;
    return { pesos: ajustado ? normalizarA100(limpios) : limpios, notas: r.notas.trim(), ajustado };
  } catch (e) {
    return { error: e instanceof ErrorIA ? e.message : "fallaIA" };
  }
}

/** Guarda el plan (generado o escrito a mano). Los porcentajes deben sumar 100. */
export async function guardarPlan(grupoId: string, pesos: PesoTipo[], instrucciones?: string, notas?: string): Promise<{ ok: true } | { error: string }> {
  const { db, grupo } = await grupoPropio(grupoId);
  if (!grupo) return { error: "noEncontrado" };
  const etiquetas = db.actividades.filter((a) => a.grupoId === grupoId).map((a) => a.etiqueta?.trim() ?? "");
  const limpios = limpiarPesos(
    pesos.map((p) => ({ etiqueta: String(p.etiqueta ?? ""), porcentaje: Number(p.porcentaje) })),
    etiquetas,
  );
  const error = errorPlan(limpios);
  if (error) return { error };
  modificar((d) => {
    const g = d.grupos.find((x) => x.id === grupoId);
    if (!g) return;
    g.planEvaluacion = {
      pesos: limpios,
      instrucciones: instrucciones?.trim().slice(0, LARGO_INSTRUCCIONES) || undefined,
      notas: notas?.trim().slice(0, 500) || undefined,
      actualizadoEn: new Date().toISOString(),
    };
  });
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

export async function quitarPlan(grupoId: string): Promise<{ ok: true } | { error: string }> {
  const { grupo } = await grupoPropio(grupoId);
  if (!grupo) return { error: "noEncontrado" };
  modificar((d) => {
    const g = d.grupos.find((x) => x.id === grupoId);
    if (g) delete g.planEvaluacion;
  });
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
  return { ok: true };
}
