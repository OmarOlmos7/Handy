import { actividadDe, leer, modificar } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { ErrorIA, resolverActividad } from "@/lib/ia";
import { imagenesParaIA } from "@/lib/imagenes";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// Paso 3, opción "Generar solución con IA": Claude resuelve la actividad (la generada en
// el paso 1 o la que el profesor cargó escaneada) siguiendo sus condiciones, y propone la rúbrica.
export async function POST(req: Request, ctx: RouteContext<"/api/actividades/[id]/resolver">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad || !esDelProfesor(db, id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  if (!actividad.reactivos.length && !actividad.archivos?.length) {
    return Response.json({ error: "Esta actividad no tiene reactivos ni hoja escaneada para resolver." }, { status: 409 });
  }
  const { condiciones = "", instrucciones } = (await req.json().catch(() => ({}))) as { condiciones?: string; instrucciones?: string };
  const criterios = typeof instrucciones === "string" ? instrucciones.trim() : actividad.instrucciones;

  try {
    const imagenes = actividad.origen === "escaneada" && actividad.archivos?.length ? imagenesParaIA(actividad.archivos) : undefined;
    const propuesta = await resolverActividad({ ...actividad, instrucciones: criterios }, { condiciones: String(condiciones).slice(0, 4000), imagenes });
    modificar((d) => {
      const a = actividadDe(d, id)!;
      a.instrucciones = criterios;
      a.condicionesSolucion = String(condiciones).trim();
      a.reactivos = propuesta.reactivos;
      a.criterios = propuesta.criterios;
      a.recomendaciones = propuesta.recomendaciones;
      a.solucionIA = true;
      a.solucion = undefined;
      a.rubricaConfirmada = false;
    });
    return Response.json({ reactivos: propuesta.reactivos.length });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudo generar la solución." }, { status: 502 });
  }
}
