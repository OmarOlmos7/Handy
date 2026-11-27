// Avance de cada actividad de un grupo (vista del profesor), para el resumen de las secciones
// plegables por tipo de actividad. Lo calcula el código, nunca la IA.
import { estadoEnvio } from "./periodo";
import { resumenAvance, type AvanceActividad, type ResumenAvance } from "./portal-alumno";
import type { Actividad, Entrega } from "./tipos";

/**
 * Terminada: ya no se esperan entregas (cerró la recepción o entregó todo el grupo) y todas las
 * recibidas están aprobadas. Sin iniciar: no ha llegado ninguna entrega y la recepción aún no abre
 * (o no tiene fechas). En proceso: lo demás (recibiendo entregas o con entregas por revisar).
 */
export function avanceActividadGrupo(a: Actividad, entregas: Entrega[], alumnos: number, ahora: Date = new Date()): AvanceActividad {
  const recibidas = entregas.filter((e) => e.actividadId === a.id && e.estado !== "sin_entregar");
  const envio = estadoEnvio(a, ahora);
  const sinEsperar = envio === "cerrado" || (alumnos > 0 && recibidas.length >= alumnos);
  if (sinEsperar && recibidas.every((e) => e.estado === "aprobada")) return "terminada";
  if (recibidas.length === 0 && (envio === "proximo" || (!a.envioDesde && !a.envioHasta))) return "sin_iniciar";
  return "en_proceso";
}

/** Resumen de un conjunto de actividades del grupo. */
export function resumenActividadesGrupo(actividades: Actividad[], entregas: Entrega[], alumnos: number, ahora: Date = new Date()): ResumenAvance {
  return resumenAvance(actividades.map((a) => avanceActividadGrupo(a, entregas, alumnos, ahora)));
}
