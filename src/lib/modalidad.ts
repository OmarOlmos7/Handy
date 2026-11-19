// Modalidades de una actividad: con o sin solución, y rúbrica con o sin puntaje.
import type { Actividad } from "./tipos";

/** true si la rúbrica lleva puntaje (calificación y puntos visibles). */
export function conPuntaje(actividad: Pick<Actividad, "sinPuntaje">) {
  return !actividad.sinPuntaje;
}

/** true si ya se puede revisar la rúbrica: hay solución o la actividad no la requiere. */
export function listaParaRubrica(actividad: Pick<Actividad, "sinSolucion" | "reactivos">) {
  if (actividad.sinSolucion) return actividad.reactivos.length > 0;
  return actividad.reactivos.some((r) => r.respuesta.trim());
}

/** true si el paso de la solución está terminado (o no hace falta). */
export function solucionLista(actividad: Pick<Actividad, "sinSolucion" | "reactivos">) {
  return !!actividad.sinSolucion || actividad.reactivos.some((r) => r.respuesta.trim() || r.pasos?.length);
}
