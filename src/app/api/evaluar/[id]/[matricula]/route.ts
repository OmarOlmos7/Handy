import { actividadDe, grupoDe, leer, modificar } from "@/lib/almacen";
import { esDelProfesor, saldoDe } from "@/lib/cuentas";
import { profesorActual } from "@/lib/sesion";
import { ErrorIA, evaluarEntrega } from "@/lib/ia";
import { imagenesParaIA } from "@/lib/imagenes";

export const maxDuration = 300;

// Evalúa con IA la entrega de un alumno y descuenta 1 crédito por página.
export async function POST(_req: Request, ctx: RouteContext<"/api/evaluar/[id]/[matricula]">) {
  const { id, matricula } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad || !esDelProfesor(db, id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  if (!actividad.rubricaConfirmada || actividad.reactivos.length === 0) {
    return Response.json({ error: "Primero confirma la rúbrica" }, { status: 409 });
  }
  const entrega = db.entregas.find((e) => e.actividadId === id && e.matricula === matricula);
  if (!entrega?.imagenes?.length) return Response.json({ error: "Esta entrega no tiene fotos" }, { status: 400 });
  const paginas = entrega.imagenes.length;
  if (saldoDe(db, profesor.id) < paginas) return Response.json({ error: "No tienes créditos suficientes" }, { status: 402 });
  const alumno = grupoDe(db, actividad.grupoId)?.alumnos.find((a) => a.matricula === matricula);

  try {
    const evaluacion = await evaluarEntrega(actividad, imagenesParaIA(entrega.imagenes));
    modificar((d) => {
      const e = d.entregas.find((x) => x.actividadId === id && x.matricula === matricula)!;
      Object.assign(e, evaluacion, { estado: "evaluada", evaluadaEn: new Date().toISOString(), error: undefined });
      d.movimientos.unshift({
        profesorId: profesor.id,
        fecha: new Date().toISOString().slice(0, 10),
        concepto: `Evaluación · ${actividad.titulo} · ${alumno?.nombre ?? matricula}`,
        cantidad: -paginas,
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    const mensaje = e instanceof ErrorIA ? e.message : "No se pudo evaluar la entrega.";
    console.error(e);
    modificar((d) => {
      const x = d.entregas.find((y) => y.actividadId === id && y.matricula === matricula);
      if (x) x.error = mensaje;
    });
    return Response.json({ error: mensaje }, { status: 502 });
  }
}
