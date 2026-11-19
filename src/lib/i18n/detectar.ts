// Idioma en que está escrito un texto (la actividad), para que la IA redacte la retroalimentación
// en ese idioma. Es un cálculo sencillo y local: escritura (japonés o chino) y palabras frecuentes.
import type { Idioma } from "./idiomas";

const FRECUENTES: Record<Exclude<Idioma, "ja" | "zh">, string[]> = {
  es: ["el", "la", "los", "las", "de", "del", "que", "y", "en", "un", "una", "es", "con", "por", "para", "su", "cuál", "qué", "calcula", "explica", "describe", "se", "al", "como"],
  en: ["the", "of", "and", "to", "in", "is", "a", "an", "that", "what", "which", "for", "with", "on", "are", "calculate", "explain", "describe", "find", "how", "its", "be", "this", "from"],
  fr: ["le", "la", "les", "des", "du", "et", "est", "un", "une", "que", "qui", "pour", "dans", "avec", "sur", "quelle", "quel", "calcule", "calculez", "explique", "expliquez", "ce", "au", "aux"],
  de: ["der", "die", "das", "und", "ist", "ein", "eine", "den", "dem", "mit", "von", "zu", "für", "auf", "im", "wie", "was", "welche", "berechne", "berechnen", "erkläre", "nicht", "sich", "des"],
  pt: ["o", "a", "os", "as", "de", "do", "da", "dos", "das", "que", "e", "em", "um", "uma", "é", "com", "para", "por", "qual", "calcule", "explique", "não", "no", "na"],
};

/** Idioma más probable del texto; undefined si es muy corto o no se distingue. */
export function detectarIdioma(texto: string | undefined | null): Idioma | undefined {
  if (!texto) return undefined;
  // Fuera fórmulas en LaTeX, que no dicen nada del idioma.
  const limpio = texto.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, " ");
  const kana = (limpio.match(/[぀-ヿ]/g) ?? []).length;
  const han = (limpio.match(/[一-鿿]/g) ?? []).length;
  if (kana >= 3) return "ja";
  if (han >= 4) return "zh";
  const palabras = limpio.toLowerCase().match(/[a-zà-öø-ÿ]+/g) ?? [];
  if (palabras.length < 3) return undefined;
  let mejor: Idioma | undefined;
  let max = 0;
  let segundo = 0;
  for (const [idioma, lista] of Object.entries(FRECUENTES) as [Idioma, string[]][]) {
    const conjunto = new Set(lista);
    let n = palabras.filter((p) => conjunto.has(p)).length;
    // Letras propias de cada idioma desempatan español y portugués, y francés y alemán.
    if (idioma === "es") n += (limpio.match(/[ñ¿¡]/g) ?? []).length * 2;
    if (idioma === "pt") n += (limpio.match(/[ãõç]|ção|ções/g) ?? []).length * 2;
    if (idioma === "de") n += (limpio.match(/[äöüß]/g) ?? []).length * 2;
    if (idioma === "fr") n += (limpio.match(/[èêëàâîôûœ]|\b[ldjqu]'/gi) ?? []).length * 2;
    if (n > max) {
      segundo = max;
      max = n;
      mejor = idioma;
    } else if (n > segundo) segundo = n;
  }
  return max >= 2 && max > segundo ? mejor : undefined;
}

/** Texto de la actividad para detectar su idioma: título, instrucciones y enunciados. */
export function textoDeActividad(a: { titulo: string; prompt?: string; instruccionesAlumno?: string[]; reactivos: { enunciado: string }[] }) {
  return [a.titulo, a.prompt ?? "", ...(a.instruccionesAlumno ?? []), ...a.reactivos.map((r) => r.enunciado)].join("\n");
}
