import { leer, rutaAbsoluta } from "@/lib/almacen";
import { MAX_BYTES_ARCHIVO, claseDeArchivo } from "@/lib/contenido";
import { convertirAPdf, vistaPdfGuardada } from "@/lib/office-pdf";
import { puedeVerArchivo } from "@/lib/permiso-archivo";
import { alumnoActual, profesorActual } from "@/lib/sesion";
import fs from "node:fs";

// Vista con el formato original de un documento de Office: el PDF que LibreOffice genera en el
// servidor. Mismos permisos que la descarga. Si no se puede convertir, responde 503 y el visor
// usa la vista de solo texto (/api/vista).
const office = (c: unknown) => c === "word" || c === "excel" || c === "ppt";

function pdf(datos: Buffer, nombre: string, cache?: string) {
  return new Response(new Uint8Array(datos), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre.replace(/\.[^.]+$/, ""))}.pdf`,
      ...(cache ? { "Cache-Control": cache } : {}),
    },
  });
}

export async function GET(_req: Request, ctx: RouteContext<"/api/vista-pdf/[...ruta]">) {
  const { ruta } = await ctx.params;
  const db = await leer();
  const permiso = await puedeVerArchivo(db, ruta);
  if (permiso === "no_encontrado") return Response.json({ error: "No encontrado" }, { status: 404 });
  if (permiso !== "si") return Response.json({ error: "No autorizado" }, { status: 403 });
  const nombre = ruta.at(-1) ?? "";
  const clase = claseDeArchivo(nombre);
  if (!office(clase)) return Response.json({ error: "Sin vista en PDF" }, { status: 415 });
  const relativa = ruta.join("/");
  if (!fs.existsSync(rutaAbsoluta(relativa))) return Response.json({ error: "No encontrado" }, { status: 404 });
  try {
    return pdf(await vistaPdfGuardada(relativa, clase!), nombre, "private, max-age=300");
  } catch (e) {
    console.error("Vista en PDF no disponible", relativa, e);
    return Response.json({ error: "Vista en PDF no disponible" }, { status: 503 });
  }
}

// Vista de un documento recién elegido (aún sin guardar). No se guarda nada.
export async function POST(req: Request) {
  if (!(await profesorActual()) && !(await alumnoActual())) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const form = await req.formData().catch(() => undefined);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0 || archivo.size > MAX_BYTES_ARCHIVO) return Response.json({ error: "Archivo no válido" }, { status: 400 });
  const clase = claseDeArchivo(archivo.name, archivo.type);
  if (!office(clase)) return Response.json({ error: "Sin vista en PDF" }, { status: 415 });
  try {
    return pdf(await convertirAPdf(Buffer.from(await archivo.arrayBuffer()), clase!), archivo.name);
  } catch (e) {
    console.error("Vista en PDF no disponible", e);
    return Response.json({ error: "Vista en PDF no disponible" }, { status: 503 });
  }
}
