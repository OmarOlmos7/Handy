"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actividadDe, modificar, slug } from "@/lib/almacen";
import type { Reactivo, ResultadoReactivo } from "@/lib/tipos";

export async function crearGrupo(form: FormData) {
  const materia = String(form.get("materia") ?? "").trim();
  const nombre = String(form.get("nombre") ?? "").trim();
  const lista = String(form.get("alumnos") ?? "");
  // Una línea por alumno: "matrícula, nombre completo, correo (opcional)". Acepta comas o tabuladores (pegado desde Excel).
  const alumnos = lista
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).map((x) => x.trim()))
    .filter(([m, n]) => m && n)
    .map(([matricula, nombreAl, correo]) => ({ matricula, nombre: nombreAl, correo: correo || "" }));
  if (!materia || !nombre || alumnos.length === 0) throw new Error("Faltan datos del grupo");
  modificar((db) => {
    db.grupos.push({ id: slug(`${materia}-${nombre}`), materia, nombre, ciclo: "2026-2027", alumnos });
  });
  revalidatePath("/profesor");
  redirect("/profesor");
}

export async function crearActividad(form: FormData) {
  const titulo = String(form.get("titulo") ?? "").trim();
  const grupoId = String(form.get("grupo") ?? "");
  if (!titulo || !grupoId) throw new Error("Faltan datos de la actividad");
  const id = slug(titulo);
  modificar((db) => {
    db.actividades.unshift({
      id,
      grupoId,
      titulo,
      descripcion: "",
      fechaAplicacion: String(form.get("fecha") || new Date().toISOString().slice(0, 10)),
      paginas: Number(form.get("paginas") || 1),
      estado: "esperando_entregas",
      instrucciones: String(form.get("instrucciones") ?? ""),
      reactivos: [],
      rubricaConfirmada: false,
    });
  });
  redirect(`/profesor/actividades/${id}/rubrica`);
}

export async function guardarRubrica(actividadId: string, reactivos: Reactivo[], confirmar: boolean) {
  modificar((db) => {
    const a = actividadDe(db, actividadId);
    if (!a) throw new Error("Actividad no encontrada");
    a.reactivos = reactivos;
    a.rubricaConfirmada = confirmar;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

export async function guardarRevision(
  actividadId: string,
  matricula: string,
  cambios: { resultados: ResultadoReactivo[]; positivos: string[]; mejoras: string[] },
  aprobar: boolean,
) {
  modificar((db) => {
    const e = db.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    if (!e) throw new Error("Entrega no encontrada");
    Object.assign(e, cambios);
    if (aprobar) e.estado = "aprobada";
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

export async function aprobarTodas(actividadId: string) {
  const n = modificar((db) => {
    const es = db.entregas.filter((x) => x.actividadId === actividadId && x.estado === "evaluada");
    es.forEach((e) => (e.estado = "aprobada"));
    return es.length;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
  return n;
}

/** Reinicia la demo a los datos de ejemplo (borra lo que se haya subido). */
export async function reiniciarDemo() {
  const { semilla } = await import("@/lib/datos-ejemplo");
  const { borrarCarpeta } = await import("@/lib/almacen");
  borrarCarpeta("actividades");
  modificar((db) => Object.assign(db, semilla()));
  revalidatePath("/", "layout");
  redirect("/profesor");
}
