"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actividadDe, borrarCarpeta, modificar, slug } from "@/lib/almacen";
import { esDelProfesor, normalizarMatricula, nuevoCodigoCurso } from "@/lib/cuentas";
import { entregasPorEvaluar, evaluarVarias, marcarEnFila } from "@/lib/evaluacion";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, Reactivo, ResultadoReactivo } from "@/lib/tipos";

/** Corre el cambio solo si la actividad es de un curso del profesor con sesión. */
async function enActividadPropia<T>(actividadId: string, cambio: (db: BaseDeDatos) => T) {
  const profesor = await requerirProfesor();
  return modificar((db) => {
    if (!esDelProfesor(db, actividadId, profesor.id)) throw new Error("Actividad no encontrada");
    return cambio(db);
  });
}

export async function crearGrupo(form: FormData) {
  const profesor = await requerirProfesor();
  const materia = String(form.get("materia") ?? "").trim();
  const nombre = String(form.get("nombre") ?? "").trim();
  const lista = String(form.get("alumnos") ?? "");
  // Una línea por alumno: "matrícula, nombre completo, correo (opcional)". Acepta comas o tabuladores (pegado desde Excel).
  // La lista es opcional: los alumnos también se agregan solos al entregar su primera actividad.
  const alumnos = lista
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).map((x) => x.trim()))
    .filter(([m, n]) => m && n)
    .map(([matricula, nombreAl, correo]) => ({ matricula: normalizarMatricula(matricula), nombre: nombreAl, correo: correo || "" }));
  if (!materia || !nombre) throw new Error("Faltan datos del grupo");
  modificar((db) => {
    db.grupos.push({
      id: slug(`${materia}-${nombre}`),
      profesorId: profesor.id,
      codigo: nuevoCodigoCurso(materia, db.grupos.map((g) => g.codigo ?? "")),
      materia,
      nombre,
      ciclo: "2026-2027",
      alumnos,
    });
  });
  revalidatePath("/profesor");
  redirect("/profesor");
}

export async function guardarRubrica(actividadId: string, reactivos: Reactivo[], confirmar: boolean) {
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    a.reactivos = reactivos;
    a.rubricaConfirmada = confirmar;
  });
  // Al confirmar, las entregas que ya llegaron se evalúan solas.
  if (confirmar) {
    const pendientes = entregasPorEvaluar(actividadId);
    if (pendientes.length) {
      marcarEnFila(actividadId, pendientes);
      after(() => evaluarVarias(actividadId, pendientes));
    }
  }
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

export async function guardarRevision(
  actividadId: string,
  matricula: string,
  cambios: { resultados: ResultadoReactivo[]; positivos: string[]; mejoras: string[] },
  aprobar: boolean,
) {
  await enActividadPropia(actividadId, (db) => {
    const e = db.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    if (!e) throw new Error("Entrega no encontrada");
    Object.assign(e, cambios);
    if (aprobar) e.estado = "aprobada";
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

export async function aprobarTodas(actividadId: string) {
  const n = await enActividadPropia(actividadId, (db) => {
    const es = db.entregas.filter((x) => x.actividadId === actividadId && x.estado === "evaluada");
    es.forEach((e) => (e.estado = "aprobada"));
    return es.length;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
  return n;
}

/** Quita del panel del profesor las actividades de ejemplo y los cursos de ejemplo que queden vacíos. */
export async function quitarDatosEjemplo() {
  const profesor = await requerirProfesor();
  const ids = modificar((db) => {
    const propios = new Set(db.grupos.filter((g) => g.profesorId === profesor.id).map((g) => g.id));
    const demo = db.actividades.filter((a) => a.demo && propios.has(a.grupoId)).map((a) => a.id);
    db.actividades = db.actividades.filter((a) => !demo.includes(a.id));
    db.entregas = db.entregas.filter((e) => !demo.includes(e.actividadId));
    const conActividades = new Set(db.actividades.map((a) => a.grupoId));
    db.grupos = db.grupos.filter((g) => !(propios.has(g.id) && ["fis-3b", "mat-2a"].includes(g.id) && !conActividades.has(g.id)));
    return demo;
  });
  ids.forEach((id) => borrarCarpeta(`actividades/${id}`));
  revalidatePath("/", "layout");
  redirect("/profesor");
}
