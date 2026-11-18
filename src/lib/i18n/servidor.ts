// Idioma de la petición actual. Depende de la vista:
// - Vistas de trabajo del profesor (/profesor, /admin): el idioma guardado en su configuración;
//   si nunca lo eligió, inglés.
// - Páginas públicas y del alumno: el que eligió el visitante (cookie), si no el idioma oficial
//   del país de su IP y, al final, el del navegador.
// - API: como el profesor si hay sesión de profesor; si no, como las páginas públicas.
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { diccionarioDe } from "./diccionario";
import { paisDeIp } from "./geoip";
import { IDIOMA_PROFESOR_INICIAL, LOCALE, elegirIdioma, esIdioma, vistaDeRuta, type Idioma } from "./idiomas";

export { vistaDeRuta };

export const COOKIE_IDIOMA = "idioma";

/** IP del visitante según el proxy (Caddy pone X-Forwarded-For). */
export function ipDeCabeceras(h: Headers): string | undefined {
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || h.get("x-real-ip") || undefined;
}

/** Idioma de las páginas públicas y del alumno: cookie, país de la IP, navegador. */
export const idiomaPublico = cache(async (): Promise<Idioma> => {
  const elegido = (await cookies()).get(COOKIE_IDIOMA)?.value;
  if (esIdioma(elegido)) return elegido;
  const h = await headers();
  return elegirIdioma({ pais: paisDeIp(ipDeCabeceras(h)), acceptLanguage: h.get("accept-language") });
});

/** Idioma guardado del profesor con sesión (undefined si no hay sesión). */
const idiomaDelProfesor = cache(async (): Promise<Idioma | undefined> => {
  // Se lee sin importar sesion.ts arriba (evita una dependencia circular).
  const { profesorActual } = await import("../sesion");
  const yo = await profesorActual();
  if (!yo) return undefined;
  const guardado = yo.config?.idioma;
  return esIdioma(guardado) ? guardado : IDIOMA_PROFESOR_INICIAL;
});

export const idiomaActual = cache(async (): Promise<Idioma> => {
  const vista = vistaDeRuta((await headers()).get("x-ruta"));
  if (vista === "trabajo") return (await idiomaDelProfesor()) ?? IDIOMA_PROFESOR_INICIAL;
  if (vista === "api") return (await idiomaDelProfesor()) ?? (await idiomaPublico());
  return idiomaPublico();
});

function paquete(idioma: Idioma) {
  return { idioma, t: diccionarioDe(idioma), locale: LOCALE[idioma] };
}

/** Diccionario y formato regional de la petición actual. */
export async function textos() {
  return paquete(await idiomaActual());
}

/** Textos de las páginas públicas (los usa el layout raíz, que no se vuelve a dibujar al navegar). */
export async function textosPublicos() {
  return paquete(await idiomaPublico());
}
