import { after } from "next/server";
import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { alumnoEnGrupo, normalizarCorreo, normalizarMatricula } from "@/lib/cuentas";
import { evaluarYGuardar, marcarEnFila } from "@/lib/evaluacion";
import { errorAlumno } from "@/lib/i18n/alumno";
import { textos } from "@/lib/i18n/servidor";
import { ErrorPaginasPdf, MAX_PAGINAS_ENTREGA, normalizarFoto, pdfAImagenes } from "@/lib/imagenes";
import { aperturaEnvio, estadoEnvio } from "@/lib/periodo";
import { MAX_ARCHIVOS_REACTIVO, creditosPlataforma, esPlataforma, limpiarRespuestas, versionDeAlumno } from "@/lib/plataforma";
import { permisoReenvio, primeraEntrega } from "@/lib/reenvio";
import { fechaHoraLarga } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";
import type { Alumno, RespuestaPlataforma } from "@/lib/tipos";
import { actividadDeVersion } from "@/lib/versiones";

export const maxDuration = 300;

// Respuestas de una actividad en plataforma: el alumno (con su sesión) contesta en la app y, en
// los desarrollos, sube fotos o un PDF. Los cerrados se califican al instante y sin créditos; si
// hay respuestas escritas o archivos, la IA los evalúa en segundo plano.
export async function POST(req: Request, ctx: RouteContext<"/api/respuestas/[id]">) {
  const { id } = await ctx.params;
  const { t, locale } = await textos();
  const error = (clave: string, status = 400, valores: Record<string, string | number> = {}) =>
    Response.json({ error: errorAlumno(t, clave, valores) }, { status });
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return error("actividadNoEncontrada", 404);
  if (!esPlataforma(actividad)) return error("noEsPlataforma");
  if (actividad.entregasSuspendidas) return error("entregasSuspendidas", 423);
  const recepcion = estadoEnvio(actividad);
  if (recepcion === "proximo") return error("envioProximo", 423, { f: fechaHoraLarga(aperturaEnvio(actividad)!, locale) });
  if (recepcion === "cerrado") return error("envioCerrado", 423, { f: fechaHoraLarga(actividad.envioHasta!, locale) });

  const cuenta = await alumnoActual();
  if (!cuenta) return error("sinSesion", 401);
  // Igual que al entregar fotos: si aún no está en el grupo, entra con su matrícula.
  let alumno: Alumno;
  let correoNuevo: string | undefined;
  const enCurso = alumnoEnGrupo(grupo, cuenta);
  if (enCurso) {
    alumno = enCurso;
    if (!enCurso.correo) correoNuevo = cuenta.correo;
  } else {
    const ocupada = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === cuenta.matricula);
    if (ocupada && ocupada.correo && normalizarCorreo(ocupada.correo) !== cuenta.correo) return error("matriculaOcupada", 409);
    alumno = { matricula: cuenta.matricula, nombre: cuenta.nombre, correo: cuenta.correo };
  }

  const previa = db.entregas.find((e) => e.actividadId === id && e.matricula === alumno.matricula);
  // En plataforma la calificación es inmediata: una vez calificada ya no se cambia (vería las
  // respuestas correctas y podría reenviar). El profesor puede borrarla para permitir otra.
  if (previa && (previa.estado === "evaluada" || previa.estado === "aprobada")) return error("evaluadaAlumno", 409);
  const permiso = permisoReenvio(previa, false);
  if (!permiso.ok) return error(permiso.error, 409);

  const form = await req.formData();
  // Cada alumno responde siempre su misma versión.
  const version = previa?.version ?? versionDeAlumno(actividad, grupo, alumno.matricula);
  const suya = actividadDeVersion(actividad, version);
  let crudas: unknown = [];
  try {
    crudas = JSON.parse(String(form.get("respuestas") ?? "[]"));
  } catch {
    crudas = [];
  }
  const respuestas = limpiarRespuestas(suya, crudas);

  // Archivos de los desarrollos: fotos (se normalizan a JPG) o un PDF (una imagen por página).
  const carpeta = `actividades/${id}/entregas/${alumno.matricula}`;
  const sello = Date.now().toString(36);
  const porReactivo = new Map<number, Buffer[]>();
  for (const r of suya.reactivos.filter((x) => x.tipo === "desarrollo")) {
    const archivos = form.getAll(`archivo-${r.numero}`).filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length > MAX_ARCHIVOS_REACTIVO) return error("maxArchivos", 400, { max: MAX_ARCHIVOS_REACTIVO });
    const jpgs: Buffer[] = [];
    for (const f of archivos) {
      const datos = Buffer.from(await f.arrayBuffer());
      try {
        if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) jpgs.push(...(await pdfAImagenes(datos)));
        else jpgs.push(await normalizarFoto(datos));
      } catch (e) {
        if (e instanceof ErrorPaginasPdf) return error("pdfPaginas", 400, { paginas: e.paginas, max: MAX_PAGINAS_ENTREGA });
        return error("archivoInvalido", 400, { n: r.numero });
      }
    }
    if (jpgs.length > MAX_ARCHIVOS_REACTIVO * 2) return error("maxArchivos", 400, { max: MAX_ARCHIVOS_REACTIVO });
    if (jpgs.length) porReactivo.set(r.numero, jpgs);
  }
  borrarCarpeta(carpeta);
  const finales: RespuestaPlataforma[] = suya.reactivos
    .map((r) => {
      const base = respuestas.find((x) => x.numero === r.numero) ?? { numero: r.numero };
      const jpgs = porReactivo.get(r.numero);
      return jpgs ? { ...base, archivos: jpgs.map((jpg, i) => guardarArchivo(`${carpeta}/${sello}-r${r.numero}-${i + 1}.jpg`, jpg)) } : base;
    })
    .filter((x) => x.texto !== undefined || x.seleccion?.length || x.archivos?.length);

  const ahora = new Date().toISOString();
  const paginas = finales.reduce((s, x) => s + (x.archivos?.length ?? 0), 0);
  modificar((d) => {
    const g = grupoDe(d, actividad.grupoId);
    const enGrupo = g?.alumnos.find((a) => a.matricula === alumno.matricula);
    if (g && !enGrupo) g.alumnos.push(alumno);
    if (enGrupo && correoNuevo) enGrupo.correo = correoNuevo;
    d.entregas = d.entregas.filter((e) => !(e.actividadId === id && e.matricula === alumno.matricula));
    d.entregas.push({
      actividadId: id,
      matricula: alumno.matricula,
      estado: "entregada",
      paginasRecibidas: paginas,
      respuestas: finales,
      version,
      resultados: [],
      positivos: [],
      mejoras: [],
      entregadaEn: ahora,
      primeraEntregaEn: (previa && primeraEntrega(previa)) || ahora,
    });
  });

  // Con la rúbrica confirmada se evalúa sola: al instante si todo es cerrado (sin créditos);
  // con respuestas escritas o archivos, en segundo plano con la IA.
  const automatica = Boolean(actividad.rubricaConfirmada && actividad.reactivos.length);
  let evaluada = false;
  if (automatica) {
    if (creditosPlataforma(suya, finales) === 0) {
      evaluada = (await evaluarYGuardar(id, alumno.matricula)).ok;
    } else {
      marcarEnFila(id, [alumno.matricula]);
      after(() => evaluarYGuardar(id, alumno.matricula));
    }
  }
  return Response.json({ ok: true, automatica, evaluada, reemplazo: permiso.reemplaza, primeraEntregaEn: (previa && primeraEntrega(previa)) || ahora });
}
