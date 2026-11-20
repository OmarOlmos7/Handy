// Puntos por elemento de la rúbrica de un reactivo: los pasos de un desarrollo o los criterios
// de evaluación de un reactivo abierto. Los calcula el código con lo que marcó la IA.
import type { Actividad, CriterioEvaluacion, Reactivo, ResultadoReactivo } from "./tipos";

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

// "Ejercicio 2", "Exercice 2", "Pregunta 2", "Question 2", "Reactivo 2", "Problema 2", "Aufgabe 2"...
const NUMERO_EN_NOMBRE =
  /\b(?:ejercicio|exercice|exercise|exerc[ií]cio|pregunta|question|quest[aã]o|frage|aufgabe|reactivo|problema|probl[eè]me|problem|item|[ií]tem|inciso)\s*(?:n[°ºo.]?\s*)?(\d{1,3})\b/i;

/**
 * Reactivos a los que aplica un criterio. Si la IA o el profesor los indicaron, esos; si no, el
 * número que diga su nombre ("Exercice 2 : Associer l'heure" → reactivo 2); si no dice ninguno,
 * aplica a todos (undefined).
 */
export function reactivosDelCriterio(c: Pick<CriterioEvaluacion, "nombre" | "reactivos">): number[] | undefined {
  if (c.reactivos?.length) return c.reactivos;
  const m = NUMERO_EN_NOMBRE.exec(c.nombre);
  return m ? [Number(m[1])] : undefined;
}

/**
 * Criterios que califican un reactivo, con su posición en la lista de la actividad. Un criterio
 * de otro ejercicio no cuenta para este reactivo.
 */
export function criteriosDelReactivo(actividad: Pick<Actividad, "criterios">, numero: number) {
  return (actividad.criterios ?? [])
    .map((criterio, indice) => ({ criterio, indice }))
    .filter(({ criterio }) => {
      const aplica = reactivosDelCriterio(criterio);
      return !aplica || aplica.includes(numero);
    });
}

/** Pesos (suman 1) de los criterios que califican el reactivo, según sus porcentajes. */
function pesos(lista: { criterio: CriterioEvaluacion }[]) {
  const suma = lista.reduce((s, { criterio }) => s + (criterio.porcentaje || 0), 0);
  return lista.map(({ criterio }) => (suma > 0 ? (criterio.porcentaje || 0) / suma : 1 / lista.length));
}

/** Elementos de la rúbrica del reactivo con sus puntos; lista vacía si no tiene. */
export function puntosPorElemento(
  actividad: Pick<Actividad, "criterios">,
  r: Pick<Reactivo, "numero" | "puntos" | "pasos">,
  res: Pick<ResultadoReactivo, "pasos" | "criterios"> | undefined,
): PuntosElemento[] {
  if (!res) return [];
  if (r.pasos?.length && res.pasos?.length) {
    return r.pasos.map((p, i) => {
      const total = redondear(p.peso * r.puntos);
      return { nombre: p.nombre, total, obtenidos: redondear(total * (res.pasos?.[i] ?? 0)) };
    });
  }
  const lista = criteriosDelReactivo(actividad, r.numero);
  if (lista.length && res.criterios?.length) {
    const w = pesos(lista);
    return lista.map(({ criterio, indice }, j) => {
      const total = redondear(w[j] * r.puntos);
      return { nombre: criterio.nombre, total, obtenidos: redondear(total * (res.criterios?.[indice] ?? 0)) };
    });
  }
  return [];
}

/**
 * Fracción lograda del reactivo con sus criterios, ponderada por sus porcentajes. `valores` va
 * alineado con la lista completa de criterios de la actividad; solo cuentan los del reactivo.
 */
export function fraccionCriterios(actividad: Pick<Actividad, "criterios">, valores: number[], numero: number) {
  const lista = criteriosDelReactivo(actividad, numero);
  if (!lista.length || !valores.length) return undefined;
  const w = pesos(lista);
  return lista.reduce((s, { indice }, j) => s + w[j] * (valores[indice] ?? 0), 0);
}

const cuartos = (n: number) => Math.round(n * 4) / 4;

/**
 * Antes, un reactivo abierto se calificaba con todos los criterios de la actividad (también los
 * de otros ejercicios, que valían 0 y le bajaban los puntos). Si los puntos guardados son justo
 * los de esa fórmula vieja (no los cambió el profesor), se recalculan solo con los criterios del
 * reactivo, con los mismos valores que ya dio la evaluación: no hace falta volver a evaluar.
 * Devuelve true si cambió algo.
 */
export function corregirPuntosCriterios(actividad: Pick<Actividad, "criterios" | "reactivos">, res: ResultadoReactivo) {
  const criterios = actividad.criterios ?? [];
  const r = actividad.reactivos.find((x) => x.numero === res.numero);
  if (!r || r.tipo !== "abierto" || !res.criterios?.length || !criterios.length) return false;
  const propios = criteriosDelReactivo(actividad, r.numero);
  if (!propios.length || propios.length === criterios.length) return false;
  const suma = criterios.reduce((s, c) => s + (c.porcentaje || 0), 0);
  const vieja = criterios.reduce((s, c, i) => s + (suma > 0 ? (c.porcentaje || 0) / suma : 1 / criterios.length) * (res.criterios?.[i] ?? 0), 0);
  if (res.puntosObtenidos !== cuartos(vieja * r.puntos)) return false;
  const nuevos = cuartos((fraccionCriterios(actividad, res.criterios, r.numero) ?? 0) * r.puntos);
  if (nuevos === res.puntosObtenidos) return false;
  res.puntosObtenidos = nuevos;
  return true;
}

/**
 * Elementos del reactivo con su numeral (1.1, 1.2…). Si la evaluación dio dónde está cada uno en
 * la hoja, se numeran en orden de lectura: página, de arriba hacia abajo y de izquierda a derecha,
 * para que el numeral crezca conforme baja la revisión. Si no, en el orden de la rúbrica.
 */
export function elementosNumerados(
  actividad: Pick<Actividad, "criterios">,
  r: Pick<Reactivo, "numero" | "puntos" | "pasos">,
  res: Pick<ResultadoReactivo, "pasos" | "criterios" | "ubicacionesElementos">,
) {
  const lista = puntosPorElemento(actividad, r, res).map((el, j) => ({ ...el, ubicacion: res.ubicacionesElementos?.[j] }));
  if (lista.length && lista.every((e) => e.ubicacion)) {
    lista.sort(
      (a, b) =>
        a.ubicacion!.pagina - b.ubicacion!.pagina ||
        // Mismo renglón (diferencia menor a 1.5 % de la altura): de izquierda a derecha.
        (Math.abs(a.ubicacion!.y - b.ubicacion!.y) < 0.015 ? 0 : a.ubicacion!.y - b.ubicacion!.y) ||
        a.ubicacion!.x - b.ubicacion!.x,
    );
  }
  return lista.map((e, k) => ({ ...e, numeral: `${r.numero}.${k + 1}` }));
}
