// Puntos por elemento de la rúbrica de un reactivo: los pasos de un desarrollo o los criterios
// de evaluación de un reactivo abierto. Los calcula el código con lo que marcó la IA.
import type { Actividad, Reactivo, ResultadoReactivo } from "./tipos";

export interface PuntosElemento {
  nombre: string;
  obtenidos: number;
  total: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Número corto para mostrar puntos: 1, 0.5, 1.25. */
export function puntosTexto(n: number) {
  return String(redondear(n));
}

/** Elementos de la rúbrica del reactivo con sus puntos; lista vacía si no tiene. */
export function puntosPorElemento(
  actividad: Pick<Actividad, "criterios">,
  r: Pick<Reactivo, "puntos" | "pasos">,
  res: Pick<ResultadoReactivo, "pasos" | "criterios"> | undefined,
): PuntosElemento[] {
  if (!res) return [];
  if (r.pasos?.length && res.pasos?.length) {
    return r.pasos.map((p, i) => {
      const total = redondear(p.peso * r.puntos);
      return { nombre: p.nombre, total, obtenidos: redondear(total * (res.pasos?.[i] ?? 0)) };
    });
  }
  const criterios = actividad.criterios ?? [];
  if (criterios.length && res.criterios?.length) {
    const suma = criterios.reduce((s, c) => s + (c.porcentaje || 0), 0);
    return criterios.map((c, i) => {
      const peso = suma > 0 ? (c.porcentaje || 0) / suma : 1 / criterios.length;
      const total = redondear(peso * r.puntos);
      return { nombre: c.nombre, total, obtenidos: redondear(total * (res.criterios?.[i] ?? 0)) };
    });
  }
  return [];
}

/** Fracción de los criterios ponderada por sus porcentajes (para calcular los puntos del reactivo). */
export function fraccionCriterios(actividad: Pick<Actividad, "criterios">, valores: number[]) {
  const criterios = actividad.criterios ?? [];
  if (!criterios.length || !valores.length) return undefined;
  const suma = criterios.reduce((s, c) => s + (c.porcentaje || 0), 0);
  return criterios.reduce((s, c, i) => s + (suma > 0 ? (c.porcentaje || 0) / suma : 1 / criterios.length) * (valores[i] ?? 0), 0);
}
