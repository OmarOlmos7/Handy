import { revalidatePath } from "next/cache";
import { borrarCarpeta, guardarArchivo, leerArchivo, modificar } from "@/lib/almacen";
import { MAX_BYTES_LOGO, normalizarLogo, rutaLogo } from "@/lib/logo";
import { profesorActual } from "@/lib/sesion";

const VOLVER = "/profesor/configuracion";

/** Regresa a la configuración con el aviso (clave de configuracion.avisos). */
function volver(clave: "ok" | "error", aviso: string) {
  return new Response(null, { status: 303, headers: { Location: `${VOLVER}?${clave}=${aviso}&s=logo#logo` } });
}

/** Sirve el logo propio del profesor con sesión. */
export async function GET() {
  const profesor = await profesorActual();
  if (!profesor?.config?.logo) return new Response("No encontrado", { status: 404 });
  try {
    return new Response(new Uint8Array(leerArchivo(rutaLogo(profesor.id))), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
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
