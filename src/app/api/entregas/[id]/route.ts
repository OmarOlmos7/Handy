import { aperturaEnvio, estadoEnvio } from "@/lib/periodo";
import { fechaHoraLarga } from "@/lib/resultados";
import { after } from "next/server";
import { versionValida } from "@/lib/versiones";
import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { alumnoEnGrupo, esDelProfesor, normalizarCorreo, normalizarMatricula } from "@/lib/cuentas";
import { crearCuentaAlumno, verificarAlumno } from "@/lib/cuentas-alumno";
import { aceptacionDeFormulario } from "@/lib/legal/aceptacion";
import { evaluarYGuardar, marcarEnFila } from "@/lib/evaluacion";
import { errorAlumno } from "@/lib/i18n/alumno";
import { textos } from "@/lib/i18n/servidor";
import { ErrorPaginasPdf, MAX_PAGINAS_ENTREGA, normalizarFoto, pdfAImagenes } from "@/lib/imagenes";
import { permisoReenvio, primeraEntrega } from "@/lib/reenvio";
import { licenciasObligatorias, tieneAcceso } from "@/lib/licencias";
import { alumnoActual, iniciarSesionAlumno, profesorActual } from "@/lib/sesion";
import type { Alumno } from "@/lib/tipos";

export const maxDuration = 300;


// Entrega del alumno: fotos de sus hojas en el orden elegido. El alumno entra con su
// correo y clave de acceso (o crea su cuenta aquí mismo la primera vez). El profesor
// dueño del curso también puede subir las hojas de un alumno. Si la rúbrica ya está
// confirmada, la entrega se evalúa sola en cuanto se recibe.
export async function POST(req: Request, ctx: RouteContext<"/api/entregas/[id]">) {
  const { id } = await ctx.params;
  // Los errores llegan al alumno en su idioma.
  const { t, locale } = await textos();
  const error = (clave: string, status = 400, valores: Record<string, string | number> = {}) =>
    Response.json({ error: errorAlumno(t, clave, valores) }, { status });
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return error("actividadNoEncontrada", 404);
  const form = await req.formData();

  // Dos formas de entregar: fotos de cada hoja, o un PDF (hoja escrita a mano en una tableta).
  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  const pdf = form.get("pdf");
  const archivoPdf = pdf instanceof File && pdf.size > 0 ? pdf : undefined;
  if (!archivoPdf && fotos.length === 0) return error("sinArchivos");
  if (fotos.length > MAX_PAGINAS_ENTREGA) return error("maxPaginas", 400, { n: MAX_PAGINAS_ENTREGA });
  if (archivoPdf && archivoPdf.size > 40 * 1024 * 1024) return error("pdfPesado");

  // ¿Quién entrega?
  let alumno: Alumno;
  let correoNuevo: string | undefined;
  const profesor = await profesorActual();
  const comoProfesor = Boolean(form.get("modo") === "profesor" && profesor && esDelProfesor(db, id, profesor.id));
  if (comoProfesor) {
    const matricula = normalizarMatricula(String(form.get("matricula") ?? ""));
    const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) return error("matriculaProfesor");
    const existente = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === matricula);
    if (!existente && nombre.length < 3) return error("nombreAlumno");
    alumno = existente ?? { matricula, nombre, correo: "" };
  } else {
    // Con las entregas suspendidas solo el profesor puede subir hojas.
    if (actividad.entregasSuspendidas) return error("entregasSuspendidas", 423);
    // Fuera del periodo de recepción (antes del inicio o después del cierre) tampoco.
    const recepcion = estadoEnvio(actividad);
    if (recepcion === "proximo") return error("envioProximo", 423, { f: fechaHoraLarga(aperturaEnvio(actividad)!, locale) });
    if (recepcion === "cerrado") return error("envioCerrado", 423, { f: fechaHoraLarga(actividad.envioHasta!, locale) });
    let cuenta = (await alumnoActual()) ?? undefined;
    let abrirSesion = false;
    if (!cuenta) {
      const correo = String(form.get("correo") ?? "");
      const clave = String(form.get("clave") ?? "");
      if (form.get("modo") === "crear") {
        const r = crearCuentaAlumno({
          nombre: String(form.get("nombre") ?? ""),
          matricula: String(form.get("matricula") ?? ""),
          correo,
          clave,
          aceptacion: aceptacionDeFormulario(form),
        });
        if (!r.ok) return error(r.error, 400);
        cuenta = { ...r.cuenta, cursos: [], porActivar: [] };
      } else {
        const c = verificarAlumno(db, correo, clave);
        if (!c) return error("credenciales", 401);
        cuenta = { ...c, cursos: [], porActivar: [] };
      }
      abrirSesion = true;
    }
    const enCurso = alumnoEnGrupo(grupo, cuenta);
    if (enCurso) {
      alumno = enCurso;
      if (!enCurso.correo) correoNuevo = cuenta.correo;
    } else {
      const ocupada = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === cuenta.matricula);
      if (ocupada && ocupada.correo && normalizarCorreo(ocupada.correo) !== cuenta.correo) {
        return error("matriculaOcupada", 409);
      }
      alumno = { matricula: cuenta.matricula, nombre: cuenta.nombre, correo: cuenta.correo };
    }
    if (abrirSesion) await iniciarSesionAlumno(cuenta.id);
    // Con el cobro obligatorio, solo entrega quien tiene licencia vigente en el curso.
    if (licenciasObligatorias() && !tieneAcceso(db, cuenta.id, grupo.id, true)) {
      return error("sinLicencia", 402, { codigo: grupo.codigo ?? "" });
    }
  }

  const previa = db.entregas.find((e) => e.actividadId === id && e.matricula === alumno.matricula);
  const permiso = permisoReenvio(previa, comoProfesor);
  if (!permiso.ok) return error(permiso.error, 409);

  const carpeta = `actividades/${id}/entregas/${alumno.matricula}`;
  const sello = Date.now().toString(36);
  const jpgs: Buffer[] = [];
  if (archivoPdf) {
    try {
      jpgs.push(...(await pdfAImagenes(Buffer.from(await archivoPdf.arrayBuffer()))));
    } catch (e) {
      if (e instanceof ErrorPaginasPdf) return error("pdfPaginas", 400, { paginas: e.paginas, max: MAX_PAGINAS_ENTREGA });
      console.error(e);
      return error("pdfIlegible");
    }
  } else {
    for (const [i, f] of fotos.entries()) {
      try {
        jpgs.push(await normalizarFoto(Buffer.from(await f.arrayBuffer())));
      } catch {
        return error("imagenInvalida", 400, { n: i + 1 });
      }
    }
  }
  borrarCarpeta(carpeta);
  const imagenes = jpgs.map((jpg, i) => guardarArchivo(`${carpeta}/${sello}-p${i + 1}.jpg`, jpg));

  const ahora = new Date().toISOString();
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
      paginasRecibidas: imagenes.length,
      imagenes,
      version: versionValida(actividad, form.get("version")),
      resultados: [],
      positivos: [],
      mejoras: [],
      entregadaEn: ahora,
      primeraEntregaEn: (previa && primeraEntrega(previa)) || ahora,
    });
  });

  // Evaluación automática: no hace falta que el profesor la inicie.
  const automatica = Boolean(actividad.rubricaConfirmada && actividad.reactivos.length);
  if (automatica) {
    marcarEnFila(id, [alumno.matricula]);
    after(() => evaluarYGuardar(id, alumno.matricula));
  }
  return Response.json({ ok: true, paginas: imagenes.length, matricula: alumno.matricula, automatica, reemplazo: permiso.reemplaza, primeraEntregaEn: (previa && primeraEntrega(previa)) || ahora });
}
