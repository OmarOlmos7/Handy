import { leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { evaluarYGuardar } from "@/lib/evaluacion";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// Reintento manual del profesor (normalmente la entrega se evalúa sola al recibir las fotos)
// o re-evaluación de una entrega ya calificada con `?reevaluar=1`.
export async function POST(req: Request, ctx: RouteContext<"/api/evaluar/[id]/[matricula]">) {
  const { id, matricula } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  if (!esDelProfesor(await leer(), id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const reevaluar = new URL(req.url).searchParams.get("reevaluar") === "1";
  const r = await evaluarYGuardar(id, matricula, reevaluar);
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.error }, { status: r.status });
}
