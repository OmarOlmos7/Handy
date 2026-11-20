// Calificación de reactivos cerrados por código: la IA solo transcribe lo que el
// alumno marcó; la comparación contra la clave se hace aquí, de forma exacta y auditable.
import type { Reactivo } from "./tipos";

function limpiar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** "c) m/s²" → "c"; "(b)" → "b"; "Verdadero" → "v". */
function opcion(s: string) {
  const t = limpiar(s);
  if (/^(v|verdadero|true|cierto)\b/.test(t)) return "v";
  if (/^(f|falso|false)\b/.test(t)) return "f";
  const m = t.match(/^\(?\s*([a-z0-9])\s*[).:-]?/);
  return m ? m[1] : t.replace(/[^a-z0-9]/g, "");
}

/** Pares de una relación de columnas o secuencia de paréntesis: "1-c, 2-a" → ["1c","2a"]; "(b)(a)(c)" → ["b","a","c"]. */
function pares(s: string) {
  const t = limpiar(s);
  const conNumero = [...t.matchAll(/(\d+)\s*[-–=:>.)]*\s*\(?([a-z])\)?/g)].map((m) => m[1] + m[2]);
  if (conNumero.length) return conNumero;
  return [...t.matchAll(/[a-z]/g)].map((m) => m[0]);
}

/** Palabra elegida, comparada sin mayúsculas ni signos alrededor (los acentos sí cuentan). */
function palabra(s: string, limpia = true) {
  // La clave a veces trae marcas de corrección (✔, ✗) junto a la palabra: no son parte de ella.
  const base = limpia ? s.replace(/[✔✓☑✗✘✕×]/g, " ") : s;
  return base
    .normalize("NFC")
    .toLowerCase()
    .replace(/^[\s"'«»“”.()]+|[\s"'«»“”.()]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Renglones numerados con una palabra elegida de un conjunto ("1) sportive, 2) divorcée"):
 * número → palabra. Solo si hay dos o más y alguna es más que una letra (si todas son letras,
 * es una relación de columnas o paréntesis y se califica por letra).
 */
export function palabrasNumeradas(s: string, limpia = true): Map<number, string> | null {
  // Quita las alternativas entre paréntesis ("sportive ✔ (sportife ✗, sportie ✗)"), salvo "(1)".
  const texto = limpia ? s.replace(/\((?!\s*\d+\s*\))[^()]*\)/g, " ") : s;
  const items = [...texto.matchAll(/(?:^|[,;\n])\s*(\d+)\s*[).:\-–]\s*([^,;\n]+)/g)].map((m) => [Number(m[1]), palabra(m[2], limpia)] as const);
  if (items.length < 2 || !items.some(([, v]) => v.replace(/[^\p{L}\p{N}]/gu, "").length > 1)) return null;
  return new Map(items);
}

/**
 * Puntos de un reactivo cerrado según la respuesta leída.
 * Devuelve null si el tipo no es cerrado (lo califica la IA con la rúbrica).
 */
export function puntosReactivoCerrado(r: Reactivo, leida: string): number | null {
  if (!leida.trim()) {
    return r.tipo === "desarrollo" || r.tipo === "abierto" ? null : 0;
  }
  // Elegir la palabra correcta en cada renglón: se compara la palabra completa, no su inicial.
  const clavePalabras = esCerrado(r) ? palabrasNumeradas(r.respuesta) : null;
  if (clavePalabras) {
    const alumno = palabrasNumeradas(leida) ?? new Map<number, string>();
    const aciertos = [...clavePalabras].filter(([n, v]) => alumno.get(n) === v).length;
    return Math.round((aciertos / clavePalabras.size) * r.puntos * 4) / 4;
  }
  return puntosCerradoPorLetra(r, leida);
}

/** Calificación por letra (opción, V/F, relación, paréntesis). Antes también se usaba para palabras. */
export function puntosCerradoPorLetra(r: Reactivo, leida: string): number | null {
  if (!leida.trim()) {
    return r.tipo === "desarrollo" || r.tipo === "abierto" ? null : 0;
  }
  switch (r.tipo) {
    case "verdadero_falso":
    case "opcion_multiple":
      return opcion(leida) === opcion(r.respuesta) ? r.puntos : 0;
    case "relacion_columnas":
    case "parentesis": {
      const clave = pares(r.respuesta);
      const alumno = pares(leida);
      if (clave.length === 0) return limpiar(leida) === limpiar(r.respuesta) ? r.puntos : 0;
      const aciertos = clave.filter((c, i) =>
        r.tipo === "parentesis" ? alumno[i] === c : alumno.includes(c),
      ).length;
      // Crédito parcial en múltiplos de 0.25.
      return Math.round((aciertos / clave.length) * r.puntos * 4) / 4;
    }
    default:
      return null;
  }
}

export function esCerrado(r: Pick<Reactivo, "tipo">) {
  return r.tipo !== "desarrollo" && r.tipo !== "abierto";
}

export interface IncisoCerrado {
  correcto: boolean;
  /** Respuesta correcta de ese renglón, para escribirla junto al tache ("c", "V"). */
  correcta: string;
  /** Se eligió una palabra de un conjunto: la paloma va sobre la elegida; el tache, sobre la correcta. */
  palabra?: boolean;
}

/**
 * Acierto de cada respuesta de un reactivo cerrado, en el orden de la clave: un renglón por
 * relación o paréntesis; uno solo para opción múltiple y verdadero/falso. Mismo criterio que
 * `puntosReactivoCerrado`.
 */
export function incisosCerrado(r: Pick<Reactivo, "tipo" | "respuesta">, leida: string): IncisoCerrado[] {
  const clavePalabras = r.tipo !== "desarrollo" && r.tipo !== "abierto" ? palabrasNumeradas(r.respuesta) : null;
  if (clavePalabras) {
    const alumno = (leida.trim() && palabrasNumeradas(leida)) || new Map<number, string>();
    return [...clavePalabras]
      .sort(([a], [b]) => a - b)
      .map(([n, v]) => ({ correcto: alumno.get(n) === v, correcta: v, palabra: true }));
  }
  switch (r.tipo) {
    case "verdadero_falso":
    case "opcion_multiple": {
      const clave = opcion(r.respuesta);
      const correcta = r.tipo === "verdadero_falso" ? clave.toUpperCase() : clave;
      return [{ correcto: Boolean(leida.trim()) && opcion(leida) === clave, correcta }];
    }
    case "relacion_columnas":
    case "parentesis": {
      const clave = pares(r.respuesta);
      const alumno = leida.trim() ? pares(leida) : [];
      if (clave.length === 0) return [{ correcto: Boolean(leida.trim()) && limpiar(leida) === limpiar(r.respuesta), correcta: r.respuesta.trim() }];
      return clave.map((c, i) => ({
        correcto: r.tipo === "parentesis" ? alumno[i] === c : alumno.includes(c),
        correcta: c.replace(/^\d+/, ""),
      }));
    }
    default:
      return [];
  }
}

/**
 * Antes, elegir una palabra de un conjunto ("1) sportive, 2) divorcée") se calificaba solo por la
 * inicial, así que "sportife" contaba como "sportive". Si los puntos guardados son justo los de
 * esa fórmula (no los cambió el profesor), se recalculan comparando la palabra completa con lo
 * que ya leyó la evaluación. Devuelve true si cambió algo.
 */
export function corregirPuntosPalabras(r: Reactivo, res: { puntosObtenidos: number; respuestaLeida: string }) {
  if (!esCerrado(r) || !palabrasNumeradas(r.respuesta)) return false;
  const nuevos = puntosReactivoCerrado(r, res.respuestaLeida);
  if (nuevos === null || nuevos === res.puntosObtenidos) return false;
  // Solo si los puntos guardados salieron de una fórmula anterior: por inicial, o por palabra sin
  // limpiar la clave (con ✔, ✗ y alternativas entre paréntesis nada coincidía).
  const crudaClave = palabrasNumeradas(r.respuesta, false);
  const crudaAlumno = palabrasNumeradas(res.respuestaLeida, false) ?? new Map<number, string>();
  const cruda = crudaClave ? Math.round(([...crudaClave].filter(([n, v]) => crudaAlumno.get(n) === v).length / crudaClave.size) * r.puntos * 4) / 4 : null;
  if (res.puntosObtenidos !== puntosCerradoPorLetra(r, res.respuestaLeida) && res.puntosObtenidos !== cruda) return false;
  res.puntosObtenidos = nuevos;
  return true;
}

/**
 * En cerrados con varios renglones, el comentario "La respuesta correcta es …" repetía toda la
 * clave, que ya se marca sobre la hoja. Si el comentario guardado la trae completa, se quita.
 * Devuelve true si cambió algo.
 */
export function quitarClaveRepetida(r: Reactivo, res: { comentario: string; respuestaLeida: string }) {
  const clave = r.respuesta.trim();
  if (!esCerrado(r) || clave.length < 10 || incisosCerrado(r, res.respuestaLeida).length < 2) return false;
  if (!res.comentario.includes(clave)) return false;
  res.comentario = "";
  return true;
}
