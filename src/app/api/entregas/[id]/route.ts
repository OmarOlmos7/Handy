import { after } from "next/server";
import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { alumnoEnGrupo, esDelProfesor, normalizarCorreo, normalizarMatricula } from "@/lib/cuentas";
import { crearCuentaAlumno, verificarAlumno } from "@/lib/cuentas-alumno";
import { evaluarYGuardar, marcarEnFila } from "@/lib/evaluacion";
import { normalizarFoto } from "@/lib/imagenes";
import { alumnoActual, iniciarSesionAlumno, profesorActual } from "@/lib/sesion";
import type { Alumno } from "@/lib/tipos";

export const maxDuration = 300;

const error = (mensaje: string, status = 400) => Response.json({ error: mensaje }, { status });

// Entrega del alumno: fotos de sus hojas en el orden elegido. El alumno entra con su
// correo y clave de acceso (o crea su cuenta aquí mismo la primera vez). El profesor
// dueño del curso también puede subir las hojas de un alumno. Si la rúbrica ya está
// confirmada, la entrega se evalúa sola en cuanto se recibe.
export async function POST(req: Request, ctx: RouteContext<"/api/entregas/[id]">) {
  const { id } = await ctx.params;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return error("Actividad no encontrada", 404);
  const form = await req.formData();

  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length === 0) return error("Agrega al menos una foto");
  if (fotos.length > 20) return error("Máximo 20 páginas");

  // ¿Quién entrega?
  let alumno: Alumno;
  let correoNuevo: string | undefined;
  const profesor = await profesorActual();
  if (form.get("modo") === "profesor" && profesor && esDelProfesor(db, id, profesor.id)) {
    const matricula = normalizarMatricula(String(form.get("matricula") ?? ""));
    const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) return error("Escribe la matrícula (letras y números, sin espacios)");
    const existente = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === matricula);
    if (!existente && nombre.length < 3) return error("Escribe el nombre completo del alumno");
    alumno = existente ?? { matricula, nombre, correo: "" };
  } else {
    let cuenta = (await alumnoActual()) ?? undefined;
    let abrirSesion = false;
    if (!cuenta) {
      const correo = String(form.get("correo") ?? "");
      const clave = String(form.get("clave") ?? "");
      if (form.get("modo") === "crear") {
        const r = crearCuentaAlumno({ nombre: String(form.get("nombre") ?? ""), matricula: String(form.get("matricula") ?? ""), correo, clave });
        if (!r.ok) return error(r.error, 400);
        cuenta = { ...r.cuenta, cursos: [] };
      } else {
        const c = verificarAlumno(db, correo, clave);
        if (!c) return error("Correo o clave de acceso incorrectos.", 401);
        cuenta = { ...c, cursos: [] };
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
        return error("Esa matrícula ya está registrada en este curso con otro correo. Habla con tu profesor.", 409);
      }
      alumno = { matricula: cuenta.matricula, nombre: cuenta.nombre, correo: cuenta.correo };
    }
    if (abrirSesion) await iniciarSesionAlumno(cuenta.id);
  }

  const previa = db.entregas.find((e) => e.actividadId === id && e.matricula === alumno.matricula);
  if (previa && (previa.estado === "evaluada" || previa.estado === "aprobada")) {
    return error("Tu entrega ya fue evaluada. Si necesitas cambiarla, habla con tu profesor.", 409);
  }

  const carpeta = `actividades/${id}/entregas/${alumno.matricula}`;
  const sello = Date.now().toString(36);
  const jpgs: Buffer[] = [];
  for (const [i, f] of fotos.entries()) {
    try {
      jpgs.push(await normalizarFoto(Buffer.from(await f.arrayBuffer())));
    } catch {
      return error(`La página ${i + 1} no es una imagen válida (usa JPG o PNG)`);
    }
  }
  borrarCarpeta(carpeta);
  const imagenes = jpgs.map((jpg, i) => guardarArchivo(`${carpeta}/${sello}-p${i + 1}.jpg`, jpg));

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
      resultados: [],
      positivos: [],
      mejoras: [],
      entregadaEn: new Date().toISOString(),
    });
  });

  // Evaluación automática: no hace falta que el profesor la inicie.
  const automatica = Boolean(actividad.rubricaConfirmada && actividad.reactivos.length);
  if (automatica) {
    marcarEnFila(id, [alumno.matricula]);
    after(() => evaluarYGuardar(id, alumno.matricula));
  }
  return Response.json({ ok: true, paginas: imagenes.length, matricula: alumno.matricula, automatica });
}
