// Quién puede ver un archivo guardado (actividades/<id>/...): lo usan la descarga y el
// previsualizador de documentos.
import "server-only";
import { esDelProfesor } from "./cuentas";
import { matriculasDeSujeto, puedeEvaluar } from "./proyectos";
import { resultadosDisponibles } from "./resultados";
import { alumnoActual, matriculaEnCurso, profesorActual } from "./sesion";
import type { BaseDeDatos } from "./tipos";

export async function puedeVerArchivo(db: BaseDeDatos, ruta: string[]): Promise<"si" | "no" | "no_encontrado"> {
  const [raiz, actividadId, tipo, matricula] = ruta;
  if (raiz === "proyectos" && actividadId) return puedeVerEvidenciaProyecto(db, ruta);
  if (raiz !== "actividades" || !actividadId) return "no_encontrado";
  const profesor = await profesorActual();
  if (profesor && esDelProfesor(db, actividadId, profesor.id)) return "si";
  const actividad = db.actividades.find((a) => a.id === actividadId);
  if (!actividad) return "no";
  const alumno = await alumnoActual();
  const enCurso = matriculaEnCurso(alumno, actividad.grupoId);
  // Material de una actividad de contenido: lo ven todos los alumnos del curso.
  if (tipo === "anexos" && actividad.contenido && enCurso) return "si";
  if (tipo === "entregas" && matricula && enCurso === matricula) {
    const entrega = db.entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
    if (entrega?.estado === "aprobada" && resultadosDisponibles(actividad)) return "si";
  }
  return "no";
}

/**
 * Evidencia de una etapa de proyecto (proyectos/<id>/...): la ven los profesores evaluadores y el
 * alumno (o los integrantes del equipo) que la entregó.
 */
async function puedeVerEvidenciaProyecto(db: BaseDeDatos, ruta: string[]): Promise<"si" | "no" | "no_encontrado"> {
  const proyecto = (db.proyectos ?? []).find((p) => p.id === ruta[1]);
  if (!proyecto) return "no_encontrado";
  const profesor = await profesorActual();
  if (profesor && puedeEvaluar(proyecto, profesor.id)) return "si";
  const relativa = ruta.join("/");
  const entrega = (db.entregasProyecto ?? []).find((e) => e.proyectoId === proyecto.id && e.archivos.includes(relativa));
  if (!entrega) return "no";
  const enCurso = matriculaEnCurso(await alumnoActual(), proyecto.grupoId);
  return enCurso && matriculasDeSujeto(proyecto, entrega.sujeto).includes(enCurso) ? "si" : "no";
}
