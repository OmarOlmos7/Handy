// Acceso a los proyectos desde el servidor: el dueño (profesor del curso) y los profesores
// evaluadores invitados. Los evaluadores no ven nada más del curso.
import "server-only";
import { evaluadoresDe, puedeEvaluar } from "./proyectos";
import type { BaseDeDatos, Grupo, Proyecto } from "./tipos";

export interface AccesoProyecto {
  proyecto: Proyecto;
  grupo: Grupo;
  /** true si es el profesor del curso (arma el modelo y cierra etapas). */
  esDueno: boolean;
}

export function accesoProyecto(db: BaseDeDatos, proyectoId: string, profesorId: string): AccesoProyecto | undefined {
  const proyecto = (db.proyectos ?? []).find((p) => p.id === proyectoId);
  const grupo = proyecto && db.grupos.find((g) => g.id === proyecto.grupoId);
  if (!proyecto || !grupo || !puedeEvaluar(proyecto, profesorId)) return undefined;
  return { proyecto, grupo, esDueno: proyecto.profesorId === profesorId && grupo.profesorId === profesorId };
}

/** Proyectos de otros profesores donde este profesor es evaluador. */
export function proyectosComoEvaluador(db: BaseDeDatos, profesorId: string): { proyecto: Proyecto; grupo: Grupo; dueno: string }[] {
  return (db.proyectos ?? []).flatMap((proyecto) => {
    if (proyecto.profesorId === profesorId || !proyecto.evaluadores.includes(profesorId)) return [];
    const grupo = db.grupos.find((g) => g.id === proyecto.grupoId);
    const dueno = db.profesores.find((p) => p.id === proyecto.profesorId)?.nombre ?? "";
    return grupo ? [{ proyecto, grupo, dueno }] : [];
  });
}

/** Nombre y correo de los evaluadores, en su orden (el dueño primero). */
export function evaluadoresConNombre(db: BaseDeDatos, proyecto: Proyecto): { id: string; nombre: string; correo: string }[] {
  return evaluadoresDe(proyecto).map((id) => {
    const p = db.profesores.find((x) => x.id === id);
    return { id, nombre: p?.nombre ?? "—", correo: p?.correo ?? "" };
  });
}
