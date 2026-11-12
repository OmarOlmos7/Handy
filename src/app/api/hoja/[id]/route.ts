import { actividadDe, grupoDe, leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { pdfHojaEscaneada } from "@/lib/pdf-hoja";
import { urlBase } from "@/lib/qr";
import { profesorActual } from "@/lib/sesion";

// PDF para imprimir la actividad escaneada, con encabezado (nombre, matrícula, calificación) y QR.
export async function GET(_req: Request, ctx: RouteContext<"/api/hoja/[id]">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!profesor || !actividad || !grupo || !esDelProfesor(db, id, profesor.id)) return new Response("No autorizado", { status: 403 });
  if (!actividad.archivos?.length) return new Response("Esta actividad no tiene hoja escaneada", { status: 404 });
  const pdf = await pdfHojaEscaneada(actividad, { curso: `${grupo.materia} · ${grupo.nombre}`, enlace: `${await urlBase()}/entregar/${id}` });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="hoja-${id}.pdf"` },
  });
}
