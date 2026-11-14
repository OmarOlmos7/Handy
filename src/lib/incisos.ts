import type { Reactivo } from "./tipos";

// Incisos y claves de respuesta de un reactivo: para dibujar la hoja y la solución sobre ella.

/** Copia del texto con las fórmulas tapadas (misma longitud), para buscar incisos fuera de ellas. */
export function taparFormulas(texto: string) {
  return texto.replace(/\$\$[^$]+\$\$|\$[^$\n]+\$/g, (m) => "§".repeat(m.length));
}

/** Separa el planteamiento de los incisos a), b), c)… sin mirar dentro de las fórmulas. */
export function separarIncisos(texto: string) {
  const tapado = taparFormulas(texto);
  const inicio = tapado.search(/(?:^|\s)a\)\s/);
  const planteamiento = inicio > 0 ? texto.slice(0, inicio).trim() : inicio === 0 ? "" : texto;
  const incisos: string[] = [];
  if (inicio >= 0) {
    const cortes = [...tapado.slice(inicio).matchAll(/\s(?=[b-h]\)\s)/g)].map((m) => inicio + m.index!);
    [inicio, ...cortes].forEach((desde, i, xs) => incisos.push(texto.slice(desde, xs[i + 1] ?? texto.length).trim()));
  }
  return { planteamiento, incisos };
}

/** Letra de una opción o columna ("c) m/s²" → "c"). */
export const letraDe = (texto: string) => texto.trim().match(/^\(?([a-zA-Z0-9]+)\)/)?.[1]?.toLowerCase() ?? texto.trim().charAt(0).toLowerCase();

/** Respuesta de relación de columnas o paréntesis para cada renglón de la columna A, en orden. */
export function respuestasColumnas(r: Pick<Reactivo, "tipo" | "respuesta" | "columnaA">): string[] {
  const filas = r.columnaA?.length ?? 0;
  if (r.tipo === "parentesis") {
    const letras = [...r.respuesta.matchAll(/\(?\s*([a-zA-Z])\s*\)/g)].map((m) => m[1].toLowerCase());
    return Array.from({ length: filas }, (_, i) => letras[i] ?? "");
  }
  const pares = new Map([...r.respuesta.matchAll(/(\d+)\s*[-–→:]\s*([a-zA-Z])/g)].map((m) => [Number(m[1]), m[2].toLowerCase()]));
  return Array.from({ length: filas }, (_, i) => pares.get(i + 1) ?? "");
}

/**
 * Respuesta final de un problema de desarrollo repartida por inciso. Si la respuesta no trae
 * sus incisos (o no coinciden con los del enunciado), se devuelve completa en un solo recuadro.
 */
export function respuestasIncisos(enunciado: string, respuesta: string): { letras: string[]; textos: string[] } | { completa: string } {
  const letras = separarIncisos(enunciado).incisos.map((inc) => inc.slice(0, 2));
  const partes = separarIncisos(respuesta).incisos;
  if (letras.length > 1 && partes.length === letras.length && partes.every((p, i) => p.slice(0, 2) === letras[i])) {
    return { letras, textos: partes.map((p) => p.slice(2).trim().replace(/[;,]$/, "").trim()) };
  }
  return { completa: respuesta.trim() };
}

