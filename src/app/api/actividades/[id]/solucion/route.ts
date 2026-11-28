import { actividadDe, borrarCarpeta, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { ErrorIA, proponerRubrica, resolverVersiones, unirConHoja } from "@/lib/ia";
import { guardarSubidos } from "@/lib/imagenes";
import { esDelProfesor } from "@/lib/cuentas";
import { profesorActual } from "@/lib/sesion";
import { unirEnUnReactivo } from "@/lib/contenido";
import type { Actividad, Reactivo } from "@/lib/tipos";

/** Reactivos con la rúbrica nueva: en una actividad de contenido, todo es una sola tarea. */
function conRubrica(a: Actividad, nuevos: Reactivo[]): Reactivo[] {
  if (a.contenido && a.reactivos.length) return [unirEnUnReactivo(a.reactivos[0], nuevos)];
  return unirConHoja(a.reactivos, nuevos);
}

export const maxDuration = 300;

// Recibe la solución del profesor (fotos o PDF) y pide a la IA la rúbrica.
export async function POST(req: Request, ctx: RouteContext<"/api/actividades/[id]/solucion">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad || !esDelProfesor(db, id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });

  const form = await req.formData();
  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length === 0) return Response.json({ error: "Sube al menos una foto o un PDF" }, { status: 400 });

  // Criterios, porcentajes y recomendaciones que el profesor escribe junto a su solución.
  const instrucciones = form.has("instrucciones") ? String(form.get("instrucciones") ?? "").trim() : actividad.instrucciones;
  if (instrucciones !== actividad.instrucciones) modificar((d) => (actividadDe(d, id)!.instrucciones = instrucciones));

  borrarCarpeta(`actividades/${id}/solucion`);
  let subidos;
  try {
    subidos = await guardarSubidos(archivos, `actividades/${id}/solucion`, guardarArchivo);
  } catch {
    return Response.json({ error: "Algún archivo no es una imagen o PDF válido" }, { status: 400 });
  }
  const { rutas, paraIA } = subidos;

  try {
    const uso = { profesorId: profesor.id, actividadId: actividad.id };
    const { reactivos, criterios, recomendaciones } = await proponerRubrica(paraIA, { titulo: actividad.titulo, instrucciones }, uso);
    const unidos = conRubrica(actividad, reactivos);
    // Las demás versiones se resuelven con el método de la solución del profesor y se verifican.
    const versiones = await resolverVersiones({ ...actividad, reactivos: unidos }, uso);
    modificar((d) => {
      const a = actividadDe(d, id)!;
      a.solucion = rutas;
      a.reactivos = conRubrica(a, reactivos);
      a.versiones = versiones;
      a.solucionIA = false;
      a.criterios = criterios;
      a.recomendaciones = recomendaciones;
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
