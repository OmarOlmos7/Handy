import { actividadDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { ErrorIA, proponerRubrica, type ImagenParaIA } from "@/lib/ia";
import { normalizarFoto } from "@/lib/imagenes";
import { esDelProfesor } from "@/lib/cuentas";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// Recibe la solución del profesor (fotos o PDF) y pide a la IA la rúbrica.
export async function POST(req: Request, ctx: RouteContext<"/api/actividades/[id]/solucion">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad || !esDelProfesor(db, id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });

  const archivos = (await req.formData()).getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length === 0) return Response.json({ error: "Sube al menos una foto o un PDF" }, { status: 400 });

  const rutas: string[] = [];
  const paraIA: ImagenParaIA[] = [];
  for (const [i, f] of archivos.entries()) {
    const datos = Buffer.from(await f.arrayBuffer());
    if (f.type === "application/pdf") {
      rutas.push(guardarArchivo(`actividades/${id}/solucion/${i + 1}.pdf`, datos));
      paraIA.push({ base64: datos.toString("base64"), mediaType: "application/pdf" });
    } else {
      const jpg = await normalizarFoto(datos);
      rutas.push(guardarArchivo(`actividades/${id}/solucion/${i + 1}.jpg`, jpg));
      paraIA.push({ base64: jpg.toString("base64"), mediaType: "image/jpeg" });
    }
  }

  try {
    const reactivos = await proponerRubrica(paraIA, { titulo: actividad.titulo, instrucciones: actividad.instrucciones });
    modificar((d) => {
      const a = actividadDe(d, id)!;
      a.solucion = rutas;
      a.reactivos = reactivos;
      a.rubricaConfirmada = false;
    });
    return Response.json({ reactivos: reactivos.length });
  } catch (e) {
    modificar((d) => {
      actividadDe(d, id)!.solucion = rutas;
    });
    const mensaje = e instanceof ErrorIA ? e.message : "No se pudo generar la rúbrica.";
    console.error(e);
    return Response.json({ error: mensaje }, { status: 502 });
  }
}
