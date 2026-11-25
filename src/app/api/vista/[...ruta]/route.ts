import { leer, leerArchivo } from "@/lib/almacen";
import { MAX_BYTES_ARCHIVO, claseDeArchivo } from "@/lib/contenido";
import { alumnoActual, profesorActual } from "@/lib/sesion";
import { puedeVerArchivo } from "@/lib/permiso-archivo";
import { vistaDeArchivo } from "@/lib/vista-archivo";

// Previsualización de un documento de Office guardado (Word, Excel o PowerPoint): devuelve su
// texto por párrafos, hojas o diapositivas para mostrarlo en pantalla. Mismos permisos que la descarga.
export async function GET(_req: Request, ctx: RouteContext<"/api/vista/[...ruta]">) {
  const { ruta } = await ctx.params;
  const db = await leer();
  const permiso = await puedeVerArchivo(db, ruta);
  if (permiso === "no_encontrado") return Response.json({ error: "No encontrado" }, { status: 404 });
  if (permiso !== "si") return Response.json({ error: "No autorizado" }, { status: 403 });
  const clase = claseDeArchivo(ruta.at(-1) ?? "");
  if (clase !== "word" && clase !== "excel" && clase !== "ppt") return Response.json({ error: "Sin vista previa" }, { status: 415 });
  let datos: Buffer;
  try {
    datos = leerArchivo(ruta.join("/"));
  } catch {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  const vista = await vistaDeArchivo(datos, clase);
  if (!vista) return Response.json({ error: "No se pudo leer el documento" }, { status: 422 });
  return Response.json(vista, { headers: { "Cache-Control": "private, max-age=300" } });
}

// Vista previa de un documento recién elegido (aún sin guardar): el profesor en el alta o el
// alumno antes de entregar su evidencia. No se guarda nada.
export async function POST(req: Request) {
  if (!(await profesorActual()) && !(await alumnoActual())) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const form = await req.formData().catch(() => undefined);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0 || archivo.size > MAX_BYTES_ARCHIVO) return Response.json({ error: "Archivo no válido" }, { status: 400 });
  const clase = claseDeArchivo(archivo.name, archivo.type);
  if (clase !== "word" && clase !== "excel" && clase !== "ppt") return Response.json({ error: "Sin vista previa" }, { status: 415 });
  const vista = await vistaDeArchivo(Buffer.from(await archivo.arrayBuffer()), clase);
  if (!vista) return Response.json({ error: "No se pudo leer el documento" }, { status: 422 });
  return Response.json(vista);
}
