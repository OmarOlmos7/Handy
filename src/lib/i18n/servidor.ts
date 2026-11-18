// Idioma de la petición actual. Orden: el que eligió el visitante (cookie), el guardado
// en la configuración del profesor, el del país de su IP y, al final, el del navegador.
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { diccionarioDe } from "./diccionario";
import { paisDeIp } from "./geoip";
import { LOCALE, elegirIdioma, esIdioma, type Idioma } from "./idiomas";

export const COOKIE_IDIOMA = "idioma";

/** IP del visitante según el proxy (Caddy pone X-Forwarded-For). */
export function ipDeCabeceras(h: Headers): string | undefined {
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || h.get("x-real-ip") || undefined;
}

export const idiomaActual = cache(async (): Promise<Idioma> => {
  const elegido = (await cookies()).get(COOKIE_IDIOMA)?.value;
  if (esIdioma(elegido)) return elegido;
  // El idioma guardado del profesor se lee sin importar sesion.ts (evita una dependencia circular).
  const { profesorActual } = await import("../sesion");
  const guardado = (await profesorActual())?.config?.idioma;
  if (esIdioma(guardado)) return guardado;
  const h = await headers();
  return elegirIdioma({ pais: paisDeIp(ipDeCabeceras(h)), acceptLanguage: h.get("accept-language") });
});

/** Diccionario y formato regional de la petición actual. */
export async function textos() {
  const idioma = await idiomaActual();
  return { idioma, t: diccionarioDe(idioma), locale: LOCALE[idioma] };
}
