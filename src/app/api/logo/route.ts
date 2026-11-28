import { revalidatePath } from "next/cache";
import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, leerArchivo, modificar } from "@/lib/almacen";
import { LOGO_ORIGINAL, MAX_BYTES_LOGO, normalizarLogo, rutaLogo } from "@/lib/logo";
import type { BaseDeDatos } from "@/lib/tipos";
import { profesorActual } from "@/lib/sesion";

const VOLVER = "/profesor/configuracion";

/** Regresa a la configuración con el aviso (clave de configuracion.avisos). */
function volver(clave: "ok" | "error", aviso: string) {
  return new Response(null, { status: 303, headers: { Location: `${VOLVER}?${clave}=${aviso}&s=logo#logo` } });
}

/**
 * Sirve el logo propio del profesor con sesión o, con ?a=<actividad>, el del profesor dueño de esa
 * actividad (lo ve el alumno en la ficha de instrucciones). Si no tiene logo, manda el original.
 */
export async function GET(req: Request) {
  const actividadId = new URL(req.url).searchParams.get("a");
  const profesor = actividadId ? profesorDeActividad(await leer(), actividadId) : await profesorActual();
  if (actividadId && !profesor?.config?.logo) return Response.redirect(new URL(LOGO_ORIGINAL, req.url), 302);
  if (!profesor?.config?.logo) return new Response("No encontrado", { status: 404 });
  try {
    return new Response(new Uint8Array(leerArchivo(rutaLogo(profesor.id))), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}

function profesorDeActividad(db: BaseDeDatos, actividadId: string) {
  const actividad = actividadDe(db, actividadId);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  return grupo?.profesorId ? db.profesores.find((p) => p.id === grupo.profesorId) : undefined;
}

/** Sube una imagen nueva o, con accion=restaurar, vuelve al logo de iEureka-Grader. */
export async function POST(req: Request) {
  const profesor = await profesorActual();
  if (!profesor) return new Response("No autorizado", { status: 403 });
  const form = await req.formData();

  if (form.get("accion") === "restaurar") {
    modificar((db) => {
      const p = db.profesores.find((x) => x.id === profesor.id);
      if (p?.config) delete p.config.logo;
    });
    try {
      borrarCarpeta(rutaLogo(profesor.id));
    } catch {
      // Ya no estaba.
    }
    revalidatePath("/profesor", "layout");
    return volver("ok", "logoRestaurado");
  }

  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return volver("error", "logoFalta");
  if (archivo.size > MAX_BYTES_LOGO) return volver("error", "logoGrande");
  let png: Buffer;
  try {
    png = await normalizarLogo(Buffer.from(await archivo.arrayBuffer()));
  } catch {
    return volver("error", "logoInvalido");
  }
  guardarArchivo(rutaLogo(profesor.id), png);
  const version = Date.now().toString(36);
  modificar((db) => {
    const p = db.profesores.find((x) => x.id === profesor.id);
    if (p) p.config = { ...p.config, logo: version };
  });
  revalidatePath("/profesor", "layout");
  return volver("ok", "logoGuardado");
}
