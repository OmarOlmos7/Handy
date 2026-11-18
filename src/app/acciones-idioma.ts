"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modificar } from "@/lib/almacen";
import { esIdioma } from "@/lib/i18n/idiomas";
import { COOKIE_IDIOMA, vistaDeRuta } from "@/lib/i18n/servidor";
import { profesorActual } from "@/lib/sesion";

const UN_ANIO = 365 * 86_400;

/** Guarda el idioma en una cookie de este navegador (un año). */
export async function recordarIdioma(idioma: unknown) {
  if (!esIdioma(idioma)) return;
  (await cookies()).set(COOKIE_IDIOMA, idioma, { path: "/", maxAge: UN_ANIO, sameSite: "lax" });
}

/**
 * Cambia el idioma de la interfaz. En las vistas de trabajo del profesor se guarda en su
 * configuración (lo encuentra al entrar desde cualquier equipo); en las páginas públicas y del
 * alumno lo recuerda este navegador.
 */
export async function cambiarIdioma(form: FormData) {
  const idioma = form.get("idioma");
  if (!esIdioma(idioma)) return;
  const yo = await profesorActual();
  const enTrabajo = vistaDeRuta((await headers()).get("x-ruta")) === "trabajo";
  if (!yo || !enTrabajo) await recordarIdioma(idioma);
  if (yo && enTrabajo) {
    modificar((db) => {
      const p = db.profesores.find((x) => x.id === yo.id);
      if (p) p.config = { ...p.config, idioma };
    });
  }
  revalidatePath("/", "layout");
  const volverA = form.get("volver");
  if (typeof volverA === "string" && volverA.startsWith("/") && !volverA.startsWith("//")) redirect(volverA);
}
