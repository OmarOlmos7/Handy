// Opciones comunes de KaTeX. En México se escribe "sen" (no "sin") y "tg"/"cosec": KaTeX no
// conoce \sen y lo dibujaba en rojo como comando desconocido. Estas macros lo dibujan como
// las demás funciones (letra recta y espacio correcto).
import type { KatexOptions } from "katex";

const MACROS_ES: Record<string, string> = {
  "\\sen": "\\operatorname{sen}",
  "\\senh": "\\operatorname{senh}",
  "\\arcsen": "\\operatorname{arcsen}",
  "\\tg": "\\operatorname{tg}",
  "\\arctg": "\\operatorname{arctg}",
  "\\cotg": "\\operatorname{cotg}",
  "\\ctg": "\\operatorname{ctg}",
  "\\cosec": "\\operatorname{cosec}",
};

/** Opciones para katex.renderToString; las macros van en un objeto nuevo porque KaTeX lo modifica. */
export function opcionesKatex(bloque: boolean): KatexOptions {
  return { displayMode: bloque, throwOnError: false, strict: "ignore", output: "html", macros: { ...MACROS_ES } };
}
