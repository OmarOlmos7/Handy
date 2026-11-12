import { leer, leerArchivo } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";

const tipos: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

// Sirve las fotos y archivos subidos (actividades/<id>/...). Los ve el profesor dueño
// del curso y, para las fotos de su propia entrega aprobada, el alumno con sesión.
export async function GET(_req: Request, ctx: RouteContext<"/api/archivos/[...ruta]">) {
  const { ruta } = await ctx.params;
  const [raiz, actividadId, tipo, matricula] = ruta;
  if (raiz !== "actividades" || !actividadId) return new Response("No encontrado", { status: 404 });

  const db = await leer();
  const profesor = await profesorActual();
  let permitido = Boolean(profesor && esDelProfesor(db, actividadId, profesor.id));
  if (!permitido && tipo === "entregas" && matricula) {
    const alumno = await alumnoActual();
    const actividad = db.actividades.find((a) => a.id === actividadId);
    const entrega = db.entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
    permitido = Boolean(actividad && matriculaEnCurso(alumno, actividad.grupoId) === matricula && entrega?.estado === "aprobada");
  }
  if (!permitido) return new Response("No autorizado", { status: 403 });

  try {
    const datos = leerArchivo(ruta.join("/"));
    const ext = ruta.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(datos), {
      headers: { "Content-Type": tipos[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
