import fs from "node:fs";
import { leer, rutaAbsoluta } from "@/lib/almacen";
import { MIME, extension } from "@/lib/contenido";
import { puedeVerArchivo } from "@/lib/permiso-archivo";

// Sirve las fotos y archivos subidos (actividades/<id>/...). Los ve el profesor dueño del curso;
// el material anexo de una actividad de contenido, los alumnos del curso; y las fotos y archivos
// de su propia entrega aprobada, el alumno con sesión. El audio y el video se sirven por partes
// (Range) para que el reproductor pueda adelantar y para que funcione en iPhone.
export async function GET(req: Request, ctx: RouteContext<"/api/archivos/[...ruta]">) {
  const { ruta } = await ctx.params;
  const db = await leer();
  const permiso = await puedeVerArchivo(db, ruta);
  if (permiso === "no_encontrado") return new Response("No encontrado", { status: 404 });
  if (permiso !== "si") return new Response("No autorizado", { status: 403 });

  let absoluta: string;
  let tamano: number;
  try {
    absoluta = rutaAbsoluta(ruta.join("/"));
    tamano = fs.statSync(absoluta).size;
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
  const tipo = MIME[extension(ruta.at(-1) ?? "")] ?? "application/octet-stream";
  const cabeceras: Record<string, string> = { "Content-Type": tipo, "Cache-Control": "private, max-age=60", "Accept-Ranges": "bytes" };
  const rango = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (rango && (rango[1] || rango[2])) {
    let inicio = rango[1] ? Number(rango[1]) : Math.max(0, tamano - Number(rango[2]));
    let fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), tamano - 1) : tamano - 1;
    if (inicio >= tamano || inicio > fin) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tamano}` } });
    inicio = Math.max(0, inicio);
    fin = Math.max(inicio, fin);
    const datos = await leerParte(absoluta, inicio, fin);
    return new Response(new Uint8Array(datos), {
      status: 206,
      headers: { ...cabeceras, "Content-Range": `bytes ${inicio}-${fin}/${tamano}`, "Content-Length": String(datos.length) },
    });
  }
  return new Response(new Uint8Array(fs.readFileSync(absoluta)), { headers: { ...cabeceras, "Content-Length": String(tamano) } });
}

async function leerParte(ruta: string, inicio: number, fin: number): Promise<Buffer> {
  const manejador = await fs.promises.open(ruta, "r");
  try {
    const datos = Buffer.alloc(fin - inicio + 1);
    const { bytesRead } = await manejador.read(datos, 0, datos.length, inicio);
    return datos.subarray(0, bytesRead);
  } finally {
    await manejador.close();
  }
}
