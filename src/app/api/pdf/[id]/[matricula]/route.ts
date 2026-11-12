import { actividadDe, entregasDe, grupoDe, leer } from "@/lib/almacen";
import { pdfRetroalimentacion } from "@/lib/pdf";
import { esDelProfesor } from "@/lib/cuentas";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";

// PDF de retroalimentación con la hoja corregida.
export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/[id]/[matricula]">) {
  const { id, matricula } = await ctx.params;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  const entrega = entregasDe(db, id).find((e) => e.matricula === matricula);
  const alumno = grupo?.alumnos.find((a) => a.matricula === matricula);
  if (!actividad || !grupo || !entrega || !alumno || entrega.resultados.length === 0) {
    return new Response("Esta entrega aún no tiene evaluación", { status: 404 });
  }
  const profesor = await profesorActual();
  const alumnoSesion = await alumnoActual();
  const permitido =
    (profesor && esDelProfesor(db, id, profesor.id)) ||
    (matriculaEnCurso(alumnoSesion, grupo.id) === matricula && entrega.estado === "aprobada");
  if (!permitido) return new Response("No autorizado", { status: 403 });
  const pdf = await pdfRetroalimentacion({ actividad, alumno, entrega, grupo });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="retroalimentacion-${matricula}.pdf"`,
    },
  });
}
