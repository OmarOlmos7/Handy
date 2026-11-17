import { PDFDocument } from "pdf-lib";
import { actividadDe, entregasDe, grupoDe, leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { nombreArchivo, pdfRetroalimentacion } from "@/lib/pdf";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// PDF del grupo: los reportes de retroalimentación de todos los alumnos evaluados, uno tras otro.
export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/[id]/grupo">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  const db = await leer();
  if (!profesor || !esDelProfesor(db, id, profesor.id)) return new Response("No autorizado", { status: 403 });
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return new Response("No encontrada", { status: 404 });
  const doc = await PDFDocument.create();
  doc.setTitle(`Retroalimentación · ${actividad.titulo} · ${grupo.materia} ${grupo.nombre}`);
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  let incluidos = 0;
  for (const alumno of alumnos) {
    const entrega = entregasDe(db, id).find((e) => e.matricula === alumno.matricula);
    if (!entrega || entrega.resultados.length === 0) continue;
    if (!entrega.imagenes?.length && !entrega.pdf) continue;
    const uno = await PDFDocument.load(await pdfRetroalimentacion({ actividad, alumno, entrega, grupo }));
    for (const p of await doc.copyPages(uno, uno.getPageIndices())) doc.addPage(p);
    incluidos++;
  }
  if (incluidos === 0) return new Response("Aún no hay entregas evaluadas", { status: 404 });
  return new Response(new Uint8Array(await doc.save({ useObjectStreams: true })), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="retroalimentacion-${nombreArchivo(actividad.titulo)}-grupo.pdf"`,
    },
  });
}
