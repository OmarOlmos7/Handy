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

/**
 * Puntos de un reactivo cerrado según la respuesta leída.
 * Devuelve null si el tipo no es cerrado (lo califica la IA con la rúbrica).
 */
export function puntosReactivoCerrado(r: Reactivo, leida: string): number | null {
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

export function esCerrado(r: Reactivo) {
  return r.tipo !== "desarrollo" && r.tipo !== "abierto";
}
