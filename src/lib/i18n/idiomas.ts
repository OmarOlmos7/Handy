// Idiomas de la interfaz y cómo se elige uno para cada visitante.
// Funciones puras (sin Next) para poder probarlas.

export const IDIOMAS = ["es", "en", "fr", "de", "ja", "pt", "zh"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PREDETERMINADO: Idioma = "es";
/** Idioma de las vistas de trabajo del profesor (y de la IA) mientras no elija otro en Configuración. */
export const IDIOMA_PROFESOR_INICIAL: Idioma = "en";

/** Nombre de cada idioma escrito en ese mismo idioma, para el selector. */
export const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
  zh: "中文",
};

/** Formato regional de números y fechas para cada idioma. */
export const LOCALE: Record<Idioma, string> = {
  es: "es-MX",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
  pt: "pt-BR",
  zh: "zh-CN",
};

export function esIdioma(x: unknown): x is Idioma {
  return typeof x === "string" && (IDIOMAS as readonly string[]).includes(x);
}

// Idiomas oficiales (de los que ofrece la app) de cada país, por código ISO 3166-1.
// En los países con más de uno, el primero es el más hablado.
const ES = ["MX", "ES", "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GQ", "GT", "HN", "NI", "PA", "PY", "PE", "PR", "UY", "VE"];
const EN = [
  "US", "GB", "IE", "AU", "NZ", "ZA", "NG", "GH", "KE", "UG", "TZ", "ZM", "ZW", "BW", "NA", "LR", "SL", "GM", "MW", "SS",
  "JM", "TT", "BS", "BB", "BZ", "GY", "AG", "DM", "GD", "KN", "LC", "VC", "IN", "PK", "PH", "MT", "FJ", "PG", "SB",
  "WS", "TO", "KI", "TV", "NR", "MH", "FM", "PW", "GU", "VI", "AS", "MP", "BM", "KY", "VG", "TC", "AI", "MS", "FK",
  "GI", "IM", "JE", "GG", "SZ", "LS", "SD", "ER", "ET",
];
const FR = [
  "FR", "MC", "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GN", "GA", "CG", "CD", "CF", "TD", "MG", "DJ", "KM", "HT",
  "BI", "GF", "GP", "MQ", "RE", "YT", "PM", "NC", "PF", "WF", "BL", "MF",
];
const DE = ["DE", "AT", "LI"];
const PT = ["BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL"];
const ZH = ["CN", "TW", "HK", "MO"];

export const PAIS_IDIOMAS: Record<string, Idioma[]> = {
  ...Object.fromEntries(ES.map((p) => [p, ["es"] as Idioma[]])),
  ...Object.fromEntries(EN.map((p) => [p, ["en"] as Idioma[]])),
  ...Object.fromEntries(FR.map((p) => [p, ["fr"] as Idioma[]])),
  ...Object.fromEntries(DE.map((p) => [p, ["de"] as Idioma[]])),
  ...Object.fromEntries(PT.map((p) => [p, ["pt"] as Idioma[]])),
  ...Object.fromEntries(ZH.map((p) => [p, ["zh"] as Idioma[]])),
  JP: ["ja"],
  // Países con dos o más idiomas oficiales entre los que ofrece la app.
  CA: ["en", "fr"],
  CH: ["de", "fr"],
  BE: ["fr", "de"],
  LU: ["fr", "de"],
  CM: ["fr", "en"],
  RW: ["en", "fr"],
  SC: ["en", "fr"],
  VU: ["en", "fr"],
  SG: ["en", "zh"],
  MU: ["en", "fr"],
};

/** Idiomas que prefiere el navegador (Accept-Language), en orden y solo los que ofrece la app. */
export function idiomasDelNavegador(cabecera: string | null | undefined): Idioma[] {
  if (!cabecera) return [];
  const lista = cabecera
    .split(",")
    .map((parte, i) => {
      const [etiqueta, ...params] = parte.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const peso = q ? Number(q.slice(2)) : 1;
      return { idioma: etiqueta.trim().toLowerCase().split("-")[0], peso: Number.isFinite(peso) ? peso : 0, i };
    })
    .filter((x) => x.peso > 0)
    .sort((a, b) => b.peso - a.peso || a.i - b.i)
    .map((x) => x.idioma)
    .filter(esIdioma);
  return [...new Set(lista)];
}

/**
 * Elige el idioma de un visitante sin preferencia guardada:
 * 1. Si el país de su IP tiene como idioma oficial uno de la app, ese (si el país tiene
 *    varios, el que prefiera el navegador).
 * 2. Si el país no tiene ninguno, el del navegador; si tampoco, inglés.
 * 3. Sin país (IP local o sin base de datos), el del navegador; si no, español.
 */
export function elegirIdioma({ pais, acceptLanguage }: { pais?: string; acceptLanguage?: string | null }): Idioma {
  const navegador = idiomasDelNavegador(acceptLanguage);
  if (pais) {
    const oficiales = PAIS_IDIOMAS[pais.toUpperCase()];
    if (oficiales?.length) return navegador.find((n) => oficiales.includes(n)) ?? oficiales[0];
    return navegador[0] ?? "en";
  }
  return navegador[0] ?? IDIOMA_PREDETERMINADO;
}

/** Sustituye {nombre} en un texto del diccionario. */
export function formato(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (m, k: string) => (k in valores ? String(valores[k]) : m));
}

export type Vista = "trabajo" | "publica" | "api";

/** Qué clase de vista es una ruta (la pone src/proxy.ts en la cabecera x-ruta). */
export function vistaDeRuta(ruta: string | null | undefined): Vista {
  if (!ruta) return "api";
  if (/^\/(profesor|admin)(\/|$)/.test(ruta)) return "trabajo";
  if (ruta.startsWith("/api/")) return "api";
  return "publica";
}
