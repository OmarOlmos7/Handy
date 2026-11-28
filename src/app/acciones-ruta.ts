"use server";

import { revalidatePath } from "next/cache";
import { leer, modificar } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { limpiarNiveles } from "@/lib/ruta-aprendizaje";
import { alumnoActual } from "@/lib/sesion";

/**
 * El alumno guarda su valoración inicial del curso: su nivel en cada unidad del temario. Con ella
 * se arma su ruta de aprendizaje. Debe responder todas las unidades.
 */
export async function guardarValoracion(grupoId: string, niveles: Record<string, string>): Promise<{ ok: true } | { error: string }> {
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const curso = alumno.cursos.find((c) => c.grupo.id === grupoId);
  if (!curso) return { error: "noEncontrada" };
  const asig = asignaturaDelCurso(await leer(), curso.grupo);
  if (!asig || asig.unidades.length === 0) return { error: "noEncontrada" };
  const limpios = limpiarNiveles(asig, niveles);
  if (Object.keys(limpios).length < asig.unidades.length) return { error: "incompleta" };
  const ahora = new Date().toISOString();
  modificar((db) => {
    const lista = (db.valoraciones ??= []);
    const previa = lista.find((v) => v.alumnoId === alumno.id && v.grupoId === grupoId && v.asignaturaId === asig.id);
    if (previa) {
      previa.niveles = limpios;
      previa.matricula = curso.alumno.matricula;
      previa.actualizadaEn = ahora;
    } else lista.push({ alumnoId: alumno.id, grupoId, matricula: curso.alumno.matricula, asignaturaId: asig.id, niveles: limpios, creadaEn: ahora, actualizadaEn: ahora });
  });
  revalidatePath(`/alumno/cursos/${grupoId}`, "layout");
  return { ok: true };
}
