import { leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { evaluarYGuardar } from "@/lib/evaluacion";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// Reintento manual del profesor. Normalmente la entrega se evalúa sola al recibir las fotos.
export async function POST(_req: Request, ctx: RouteContext<"/api/evaluar/[id]/[matricula]">) {
  const { id, matricula } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  if (!esDelProfesor(await leer(), id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const r = await evaluarYGuardar(id, matricula);
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.error }, { status: r.status });
}
