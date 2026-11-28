import { leer, modificar } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { PRECISION_PREDETERMINADA, creditosPorPagina } from "@/lib/configuracion";
import { saldoDe } from "@/lib/cuentas";
import { ErrorIA, iaDisponible } from "@/lib/ia";
import { redactarRutaMejora } from "@/lib/ia-perfil";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { licenciasObligatorias } from "@/lib/licencias";
import { cobrarAlumno, saldoAlumno } from "@/lib/perfil/bolsa";
import { tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { modeloDelCurso } from "@/lib/perfil/crear";
import { cuentaDeMatricula } from "@/lib/perfil/intentos";
import { aplicacionesDelSemestre, semestreDe } from "@/lib/perfil/stroop";
import { datosRutaMejora, reporteAlumno } from "@/lib/perfil/tablero";
import { alumnoActual, profesorActual } from "@/lib/sesion";
import type { RutaMejora } from "@/lib/tipos";

export const maxDuration = 120;

// Ruta de mejora del alumno en un curso, redactada por la IA con los números del perfil CREAR (sin
// datos personales). La pide el alumno (se paga de su bolsa) o su profesor (de sus créditos).
export async function POST(req: Request) {
  const { t } = await textos();
  const te = t.perfil.tablero.errores;
  if (!perfilActivo()) return Response.json({ error: te.noDisponible }, { status: 404 });
  let datos: Record<string, unknown> = {};
  try {
    datos = await req.json();
  } catch {
    return Response.json({ error: te.general }, { status: 400 });
  }
  const grupoId = String(datos.grupoId ?? "");
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) return Response.json({ error: te.general }, { status: 404 });

  let alumnoId: string;
  let pedidaPor: RutaMejora["pedidaPor"];
  if (datos.como === "profesor") {
    const profesor = await profesorActual();
    if (!profesor || grupo.profesorId !== profesor.id) return Response.json({ error: te.general }, { status: 403 });
    const cuenta = cuentaDeMatricula(db, grupo.id, String(datos.matricula ?? ""));
    if (!cuenta) return Response.json({ error: te.general }, { status: 404 });
    alumnoId = cuenta.id;
    pedidaPor = "profesor";
  } else {
    const alumno = await alumnoActual();
    if (!alumno || !alumno.cursos.some((c) => c.grupo.id === grupo.id)) return Response.json({ error: te.general }, { status: 403 });
    alumnoId = alumno.id;
    pedidaPor = "alumno";
  }
  if (!tieneConsentimiento(db.consentimientosPerfil, alumnoId)) return Response.json({ error: te.sinConsentimiento }, { status: 403 });
  const reporte = reporteAlumno(db.intentosPerfil ?? [], alumnoId, grupo.id);
  if (reporte.intentos === 0) return Response.json({ error: te.sinDatos }, { status: 409 });
  const costo = creditosPorPagina(PRECISION_PREDETERMINADA);
  const alcanza = pedidaPor === "alumno" ? saldoAlumno(db, alumnoId, licenciasObligatorias()).total >= costo : grupo.profesorId ? saldoDe(db, grupo.profesorId) >= costo : false;
  if (!alcanza) return Response.json({ error: pedidaPor === "alumno" ? t.perfil.bolsa.sinCreditos : te.sinCreditosProfesor }, { status: 402 });
  if (!iaDisponible()) return Response.json({ error: te.ia }, { status: 503 });

  const stroop = aplicacionesDelSemestre(db.stroop, alumnoId, semestreDe(new Date()));
  const efecto = (m: "inicio" | "fin") => (stroop[m] && !stroop[m].omitida ? (stroop[m].resumen?.efectoMs ?? null) : null);
  const efectos = stroop.inicio || stroop.fin ? { efectoInicio: efecto("inicio"), efectoFin: efecto("fin") } : undefined;
  try {
    // A la IA solo van números del perfil y el modelo del curso: nunca el nombre ni la matrícula.
    const r = await redactarRutaMejora(datosRutaMejora(reporte, grupo.materia, modeloDelCurso(db.modelosCrear, grupo), efectos), {
      profesorId: grupo.profesorId,
      idioma: await idiomaPublico(),
    });
    const ruta: RutaMejora = { alumnoId, grupoId: grupo.id, generadaEn: new Date().toISOString(), pedidaPor, creditos: costo, ...r };
    modificar((d) => {
      if (pedidaPor === "alumno") cobrarAlumno(d, { alumnoId, cantidad: costo, concepto: `ruta:${grupo.materia}`, grupoId: grupo.id }, licenciasObligatorias());
      else
        d.movimientos.unshift({
          profesorId: grupo.profesorId,
          fecha: ruta.generadaEn.slice(0, 10),
          concepto: `Perfil CREAR · ruta de mejora · ${grupo.materia} ${grupo.nombre}`,
          cantidad: -costo,
        });
      d.rutasMejora = [...(d.rutasMejora ?? []).filter((x) => !(x.alumnoId === alumnoId && x.grupoId === grupo.id)), ruta];
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : te.general }, { status: 502 });
  }
}
