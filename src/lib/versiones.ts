// Versiones de una actividad (A, B, C…): los mismos reactivos con otros valores numéricos.
// La A es la actividad misma; las demás guardan solo lo que cambia (texto impreso y solución).
// La rúbrica (tipo, puntos, pasos, criterios) es la misma para todas.
import { letras, opcion, pares, primerNumero, siNo } from "./calificar";
import type { Actividad, Reactivo, ReactivoVersion, TipoReactivo, VersionActividad } from "./tipos";

/** Máximo de versiones que se pueden pedir al crear una actividad. */
export const MAX_VERSIONES = 5;

export function letraVersion(i: number): string {
  return String.fromCharCode(65 + i);
}

/** Cantidad de versiones pedida en el formulario, entre 1 y MAX_VERSIONES. */
export function cantidadVersiones(valor: unknown): number {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_VERSIONES, n)) : 1;
}

/** Letras de todas las versiones de la actividad: ["A"] si no tiene versiones. */
export function letrasVersiones(act: Pick<Actividad, "versiones">): string[] {
  return ["A", ...(act.versiones ?? []).map((v) => v.letra)];
}

/** Letra válida de la actividad, o undefined (que equivale a la A). */
export function versionValida(act: Pick<Actividad, "versiones">, letra: unknown): string | undefined {
  const l = typeof letra === "string" ? letra.trim().toUpperCase() : "";
  return l && l !== "A" && letrasVersiones(act).includes(l) ? l : undefined;
}

/** Reactivo de la actividad con el texto y la solución de otra versión; la rúbrica no cambia. */
export function reactivoDeVersion(r: Reactivo, v: ReactivoVersion | undefined): Reactivo {
  if (!v) return r;
  return {
    ...r,
    enunciado: v.enunciado,
    opciones: v.opciones ?? r.opciones,
    columnaA: v.columnaA ?? r.columnaA,
    columnaB: v.columnaB ?? r.columnaB,
    ilustracion: v.ilustracion ?? r.ilustracion,
    respuesta: v.respuesta,
    solucionPasos: v.solucionPasos,
  };
}

/** La actividad como la ve quien tiene la versión dada (A o sin letra: la actividad misma). */
export function actividadDeVersion(act: Actividad, letra: string | undefined): Actividad {
  const v = letra ? act.versiones?.find((x) => x.letra === letra) : undefined;
  if (!v) return act;
  return { ...act, reactivos: act.reactivos.map((r) => reactivoDeVersion(r, v.reactivos.find((x) => x.numero === r.numero))) };
}

/** Todas las versiones como actividades completas, con su letra. */
export function versionesCompletas(act: Actividad): { letra: string; actividad: Actividad; version?: VersionActividad }[] {
  return [{ letra: "A", actividad: act }, ...(act.versiones ?? []).map((v) => ({ letra: v.letra, actividad: actividadDeVersion(act, v.letra), version: v }))];
}

/** Números de una respuesta, en orden ("1/2 ≈ 0.86 m/s²" → [1, 2, 0.86]); acepta coma decimal. */
export function numerosDe(texto: string): number[] {
  return [...texto.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d),(\d)/g, "$1.$2").matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)].map((m) => Number(m[0]));
}

function cerca(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 0.01);
}

/**
 * true si dos soluciones del mismo reactivo coinciden. Cerrados: misma letra (o mismos pares).
 * Desarrollo: los valores finales coinciden dentro de 1 % (los de la verificación vienen aparte).
 */
export function coinciden(tipo: TipoReactivo, a: { respuesta: string; valores?: number[] }, b: { respuesta: string; valores?: number[] }): boolean {
  if (tipo === "abierto") return true;
  if (tipo === "opcion_multiple" || tipo === "verdadero_falso") return opcion(a.respuesta) === opcion(b.respuesta);
  if (tipo === "relacion_columnas" || tipo === "parentesis" || tipo === "relacion_imagenes") return pares(a.respuesta).join() === pares(b.respuesta).join();
  if (tipo === "si_no") return siNo(a.respuesta) === siNo(b.respuesta);
  if (tipo === "seleccion_multiple" || tipo === "seleccion_imagenes") return [...letras(a.respuesta)].sort().join() === [...letras(b.respuesta)].sort().join();
  if (tipo === "orden") return letras(a.respuesta).join() === letras(b.respuesta).join();
  if (tipo === "numerica") {
    const x = primerNumero(a.respuesta);
    const y = primerNumero(b.respuesta);
    return x !== null && y !== null && cerca(x, y);
  }
  const va = a.valores?.length ? a.valores : numerosDe(a.respuesta);
  const vb = b.valores?.length ? b.valores : numerosDe(b.respuesta);
  if (!va.length || !vb.length) return va.length === vb.length;
  // Cada valor de un lado tiene su par en el otro (el orden de los incisos puede variar).
  return vb.every((y) => va.some((x) => cerca(x, y))) && va.every((x) => vb.some((y) => cerca(x, y)));
}
