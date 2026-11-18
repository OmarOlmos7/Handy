// Diccionarios de la interfaz. Todos tienen la forma del español (es.ts).
import de from "./diccionarios/de";
import en from "./diccionarios/en";
import es from "./diccionarios/es";
import fr from "./diccionarios/fr";
import ja from "./diccionarios/ja";
import pt from "./diccionarios/pt";
import zh from "./diccionarios/zh";
import type { Idioma } from "./idiomas";

export type Diccionario = typeof es;

const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en, fr, de, ja, pt, zh };

export function diccionarioDe(idioma: Idioma): Diccionario {
  return DICCIONARIOS[idioma] ?? es;
}
