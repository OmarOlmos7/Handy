// Reedición de la rúbrica de una actividad: limpia los criterios, las recomendaciones y las
// indicaciones que escribe el profesor, y mantiene alineadas las evaluaciones ya hechas.
import type { CriterioEvaluacion, Reactivo } from "./tipos";

export const MAX_CRITERIOS_ACTIVIDAD = 12;
export const MAX_RECOMENDACIONES = 12;

/** Criterio como lo edita el profesor: `origen` es su posición en la lista anterior (sin valor, es nuevo). */
export interface CriterioEditado extends CriterioEvaluacion {
  origen?: number;
}

/** Cambios de la rúbrica además de los reactivos. */
export interface CambiosRubrica {
  criterios?: CriterioEditado[];
  recomendaciones?: string[];
  instrucciones?: string;
}

/** Números de reactivo válidos (enteros que existen en la actividad), sin repetir y en orden. */
function limpiarNumeros(xs: unknown, existentes: Set<number>): number[] | undefined {
  if (!Array.isArray(xs)) return undefined;
  const ns = [...new Set(xs.map(Number).filter((n) => Number.isInteger(n) && existentes.has(n)))].sort((a, b) => a - b);
  return ns.length ? ns : undefined;
}

/**
 * Criterios limpios (sin nombre se descartan) y, para cada uno, su posición en la lista anterior.
 * El porcentaje se acota a 0-100 con un decimal.
 */
export function limpiarCriterios(
  xs: unknown,
  reactivos: Pick<Reactivo, "numero">[],
  anteriores: number,
): { criterios: CriterioEvaluacion[]; origenes: (number | undefined)[] } {
  const existentes = new Set(reactivos.map((r) => r.numero));
  const criterios: CriterioEvaluacion[] = [];
  const origenes: (number | undefined)[] = [];
  const usados = new Set<number>();
  for (const c of (Array.isArray(xs) ? xs : []) as Partial<CriterioEditado>[]) {
    if (criterios.length >= MAX_CRITERIOS_ACTIVIDAD) break;
    const nombre = String(c?.nombre ?? "").trim().slice(0, 120);
    if (!nombre) continue;
    const p = Number(c.porcentaje);
    const porcentaje = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p * 10) / 10)) : 0;
    const criterio: CriterioEvaluacion = { nombre, porcentaje, descripcion: String(c.descripcion ?? "").trim().slice(0, 600) };
    const ns = limpiarNumeros(c.reactivos, existentes);
    if (ns) criterio.reactivos = ns;
    criterios.push(criterio);
    // Cada criterio anterior conserva sus valores en un solo criterio nuevo.
    const o = Number(c.origen);
    const valido = Number.isInteger(o) && o >= 0 && o < anteriores && !usados.has(o);
    if (valido) usados.add(o);
    origenes.push(valido ? o : undefined);
  }
  return { criterios, origenes };
}

/** Recomendaciones sin vacíos ni repetidas. */
export function limpiarRecomendaciones(xs: unknown): string[] {
  const lista = Array.isArray(xs) ? xs : String(xs ?? "").split(/\r?\n/);
  return [...new Set(lista.map((x) => String(x).replace(/^\s*[-•*]\s*/, "").trim().slice(0, 300)).filter(Boolean))].slice(0, MAX_RECOMENDACIONES);
}

/**
 * Valores por criterio de una evaluación ya hecha, reacomodados a la lista nueva de criterios
 * (van alineados por posición). Un criterio nuevo queda en 0 hasta que se vuelva a evaluar.
 */
export function reacomodarValores(valores: number[] | undefined, origenes: (number | undefined)[]): number[] | undefined {
  if (!valores?.length) return valores;
  return origenes.map((o) => (o === undefined ? 0 : (valores[o] ?? 0)));
}

/** true si la lista de criterios cambió de forma (se agregó, quitó o movió alguno). */
export function cambioEstructura(origenes: (number | undefined)[], anteriores: number): boolean {
  return origenes.length !== anteriores || origenes.some((o, i) => o !== i);
}
