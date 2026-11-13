import { actividadDe, leer, modificar } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { ErrorIA, editarActividad } from "@/lib/ia";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

// Editar la hoja imprimible con un prompt: { peticion } aplica los cambios con IA y guarda la
// versión anterior; { deshacer: true } la recupera.
export async function POST(req: Request, ctx: RouteContext<"/api/actividades/[id]/editar">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad || !esDelProfesor(db, id, profesor.id)) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  if (actividad.origen !== "ia") return Response.json({ error: "Solo se pueden editar con IA las actividades creadas con IA." }, { status: 409 });
  if (db.entregas.some((e) => e.actividadId === id && e.estado !== "sin_entregar")) {
    return Response.json({ error: "Ya hay entregas de alumnos con esta hoja; editarla haría que no coincidan." }, { status: 409 });
  }
  const { peticion = "", deshacer = false } = (await req.json().catch(() => ({}))) as { peticion?: string; deshacer?: boolean };

  if (deshacer) {
    if (!actividad.hojaAnterior) return Response.json({ error: "No hay cambios para deshacer." }, { status: 409 });
    modificar((d) => {
      const a = actividadDe(d, id)!;
      const previa = a.hojaAnterior!;
      a.instruccionesAlumno = previa.instruccionesAlumno;
      a.criterios = previa.criterios;
      a.reactivos = previa.reactivos;
      a.rubricaConfirmada = previa.rubricaConfirmada;
      a.hojaAnterior = undefined;
    });
    return Response.json({ ok: true });
  }

  const texto = String(peticion).trim().slice(0, 4000);
  if (!texto) return Response.json({ error: "Escribe qué quieres cambiar en la hoja." }, { status: 400 });
  try {
    const nueva = await editarActividad(actividad, texto, { profesorId: profesor.id, actividadId: actividad.id });
    let cambioSolucion = false;
    const reactivos = nueva.reactivos.map((r) => {
      const antes = actividad.reactivos.find((x) => x.numero === r.numero);
      const conRespuesta = !!antes && (!!antes.respuesta.trim() || !!antes.pasos?.length);
      // La solución solo sigue valiendo si el reactivo no cambió.
      if (antes && conRespuesta && antes.tipo === r.tipo && antes.enunciado === r.enunciado && String(antes.opciones) === String(r.opciones) && String(antes.columnaA) === String(r.columnaA) && String(antes.columnaB) === String(r.columnaB)) {
        return { ...r, respuesta: antes.respuesta, pasos: antes.pasos, solucionPasos: antes.solucionPasos, puntos: r.puntos };
      }
      if (conRespuesta) cambioSolucion = true;
      return r;
    });
    const habiaSolucion = actividad.reactivos.some((r) => r.respuesta.trim() || r.pasos?.length);
    if (habiaSolucion && reactivos.length !== actividad.reactivos.length) cambioSolucion = true;
    modificar((d) => {
      const a = actividadDe(d, id)!;
      a.hojaAnterior = {
        instruccionesAlumno: a.instruccionesAlumno,
        criterios: a.criterios,
        reactivos: a.reactivos,
        rubricaConfirmada: a.rubricaConfirmada,
      };
      a.instruccionesAlumno = nueva.instrucciones;
      a.criterios = nueva.criterios;
      a.reactivos = reactivos;
      if (habiaSolucion) a.rubricaConfirmada = false;
    });
    return Response.json({ reactivos: reactivos.length, revisarSolucion: habiaSolucion, cambioSolucion });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudo editar la hoja." }, { status: 502 });
  }
}
