import { PDFDocument } from "pdf-lib";
import { actividadDe, entregasDe, grupoDe, leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { textos } from "@/lib/i18n/servidor";
import { nombreArchivo, pdfRetroalimentacion } from "@/lib/pdf";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// PDF del grupo: los reportes de retroalimentación de todos los alumnos evaluados, uno tras otro.
export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/[id]/grupo">) {
  const { id } = await ctx.params;
  const { t, locale } = await textos();
  const profesor = await profesorActual();
  const db = await leer();
  if (!profesor || !esDelProfesor(db, id, profesor.id)) return new Response(t.alumno.errores.noAutorizado, { status: 403 });
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return new Response(t.alumno.errores.noEncontrada, { status: 404 });
  const doc = await PDFDocument.create();
  doc.setTitle(`${t.alumno.pdf.tituloDoc} · ${actividad.titulo} · ${grupo.materia} ${grupo.nombre}`);
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  let incluidos = 0;
  for (const alumno of alumnos) {
    const entrega = entregasDe(db, id).find((e) => e.matricula === alumno.matricula);
    if (!entrega || entrega.resultados.length === 0) continue;
    if (!entrega.imagenes?.length && !entrega.pdf) continue;
    const uno = await PDFDocument.load(await pdfRetroalimentacion({ actividad, alumno, entrega, grupo }, t.alumno.pdf, locale));
    for (const p of await doc.copyPages(uno, uno.getPageIndices())) doc.addPage(p);
    incluidos++;
  }
  if (incluidos === 0) return new Response(t.alumno.errores.sinEvaluadas, { status: 404 });
  return new Response(new Uint8Array(await doc.save({ useObjectStreams: true })), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="retroalimentacion-${nombreArchivo(actividad.titulo)}-grupo.pdf"`,
    },
  });
}
