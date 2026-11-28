import { actividadDe, grupoDe, leer, modificar } from "@/lib/almacen";
import { alumnoActual, matriculaEnCurso } from "@/lib/sesion";
import { registrarPulso } from "@/lib/tiempo";

// Pulso de tiempo: el alumno (con su sesión) tiene abierta una actividad de su curso.
// Solo se guarda el tiempo; no recibe ni manda datos personales.
export async function POST(req: Request) {
  const cuenta = await alumnoActual();
  if (!cuenta) return Response.json({ ok: false }, { status: 401 });
  let cuerpo: { actividadId?: unknown; segundos?: unknown } = {};
  try {
    cuerpo = await req.json();
  } catch {
    // sendBeacon puede mandar texto: se intenta abajo.
  }
  if (typeof cuerpo.actividadId !== "string") return Response.json({ ok: false }, { status: 400 });
  const db = await leer();
  const actividad = actividadDe(db, cuerpo.actividadId);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  const matricula = grupo ? matriculaEnCurso(cuenta, grupo.id) : undefined;
  if (!actividad || !matricula) return Response.json({ ok: false }, { status: 404 });
  let contados = 0;
  modificar((d) => {
    contados = registrarPulso(d, actividad.id, matricula, cuerpo.segundos);
  });
  return Response.json({ ok: true, segundos: contados });
}
