import { randomUUID } from "node:crypto";
import { leer, modificar } from "@/lib/almacen";
import { costoGenerar, temasDelCurso } from "@/lib/autoestudio";
import { perfilActivo } from "@/lib/banderas";
import { ErrorIA, iaDisponible } from "@/lib/ia";
import { PeticionInapropiada, generarAutoactividad } from "@/lib/ia-autoestudio";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { licenciasObligatorias } from "@/lib/licencias";
import { cobrarAlumno, saldoAlumno } from "@/lib/perfil/bolsa";
import { tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { etapasPorReforzar } from "@/lib/perfil/etapas";
import { intentosDe, peticionCaso, seguimientoActividad } from "@/lib/perfil/intentos";
import { alumnoActual } from "@/lib/sesion";
import type { Autoactividad, TipoAutoactividad } from "@/lib/tipos";

export const maxDuration = 300;

// El alumno que no llegó al 70 % pide un caso equivalente de la actividad (máximo 5). Lo genera la
// IA con la rúbrica de la actividad (sin datos del alumno) y se paga de la bolsa de créditos del
// alumno. Se resuelve como una actividad de autoestudio y su calificación cuenta como el último intento.
export async function POST(req: Request) {
  const { t } = await textos();
  const ts = t.perfil.seguimiento.errores;
  if (!perfilActivo()) return Response.json({ error: ts.noDisponible }, { status: 404 });
  const cuenta = await alumnoActual();
  if (!cuenta) return Response.json({ error: ts.sinSesion }, { status: 401 });
  let datos: Record<string, unknown> = {};
  try {
    datos = await req.json();
  } catch {
    return Response.json({ error: ts.general }, { status: 400 });
  }
  const db = await leer();
  const actividad = db.actividades.find((a) => a.id === String(datos.actividadId ?? ""));
  const curso = actividad && cuenta.cursos.find((c) => c.grupo.id === actividad.grupoId);
  if (!actividad || !curso) return Response.json({ error: ts.noEncontrada }, { status: 404 });
  if (!tieneConsentimiento(db.consentimientosPerfil, cuenta.id)) return Response.json({ error: ts.sinConsentimiento }, { status: 403 });
  const entrega = db.entregas.find((e) => e.actividadId === actividad.id && e.matricula === curso.alumno.matricula);
  const seg = seguimientoActividad(actividad, entrega, db.autoactividades, cuenta.id);
  if (seg.estado === "pendiente" && seg.pendiente) return Response.json({ id: seg.pendiente.id });
  if (seg.estado !== "disponible") return Response.json({ error: ts[seg.estado] }, { status: 409 });

  const tipo: TipoAutoactividad = actividad.reactivos.some((r) => r.tipo === "desarrollo") && actividad.formato !== "plataforma" ? "manuscrita" : "practica";
  const costo = costoGenerar(tipo);
  if (saldoAlumno(db, cuenta.id, licenciasObligatorias()).total < costo) return Response.json({ error: t.perfil.bolsa.sinCreditos }, { status: 402 });
  if (!iaDisponible()) return Response.json({ error: ts.ia }, { status: 503 });

  const numero = seg.casos.length + 1;
  const ultimo = intentosDe(db.intentosPerfil, cuenta.id, actividad.id).at(-1);
  const reforzar = ultimo ? etapasPorReforzar(ultimo.porEtapa).map((e) => t.perfil.crear.etapas[e].nombre) : [];
  const tema = temasDelCurso([actividad], actividad.grupoId, 3).join(", ") || actividad.titulo;
  const idioma = await idiomaPublico();
  const grupo = curso.grupo;
  try {
    // A la IA solo van la rúbrica y los temas de la actividad: nunca el nombre ni la matrícula.
    const generada = await generarAutoactividad(
      {
        tipo,
        tema: tema.slice(0, 120),
        materia: grupo.materia,
        peticion: peticionCaso(actividad, numero, reforzar),
        cantidad: Math.max(3, Math.min(tipo === "manuscrita" ? 5 : 10, actividad.reactivos.length)),
        tiposEjercicio: [],
      },
      { profesorId: grupo.profesorId, idioma },
    );
    const nuevo: Autoactividad = {
      id: randomUUID().slice(0, 12),
      alumnoId: cuenta.id,
      grupoId: grupo.id,
      matricula: curso.alumno.matricula,
      tipo,
      titulo: `${t.perfil.seguimiento.caso} ${numero} · ${actividad.titulo}`.slice(0, 120),
      tema: tema.slice(0, 120),
      idioma,
      creadaEn: new Date().toISOString(),
      ejercicios: generada.ejercicios,
      estado: "pendiente",
      creditos: costo,
      pagadoPor: "alumno",
      casoDe: { actividadId: actividad.id, numero },
    };
    let cobrado = false;
    modificar((d) => {
      cobrado = cobrarAlumno(d, { alumnoId: cuenta.id, cantidad: costo, concepto: `caso:${numero}:${actividad.titulo}`, grupoId: grupo.id }, licenciasObligatorias());
      if (cobrado) (d.autoactividades ??= []).push(nuevo);
    });
    if (!cobrado) return Response.json({ error: t.perfil.bolsa.sinCreditos }, { status: 402 });
    return Response.json({ id: nuevo.id });
  } catch (e) {
    if (e instanceof PeticionInapropiada) return Response.json({ error: ts.general }, { status: 400 });
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : ts.general }, { status: 502 });
  }
}
