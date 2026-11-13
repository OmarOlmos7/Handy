"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actividadDe, borrarCarpeta, modificar, slug } from "@/lib/almacen";
import { esDelProfesor, normalizarMatricula, nuevoCodigoCurso } from "@/lib/cuentas";
import { entregasPorEvaluar, evaluarVarias, marcarEnFila } from "@/lib/evaluacion";
import { COLORES } from "@/lib/colores";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, Reactivo, ResultadoReactivo } from "@/lib/tipos";
import { deCampoFechaHora } from "@/lib/resultados";

/** Corre el cambio solo si la actividad es de un curso del profesor con sesión. */
async function enActividadPropia<T>(actividadId: string, cambio: (db: BaseDeDatos) => T) {
  const profesor = await requerirProfesor();
  return modificar((db) => {
    if (!esDelProfesor(db, actividadId, profesor.id)) throw new Error("Actividad no encontrada");
    return cambio(db);
  });
}

export async function crearGrupo(form: FormData) {
  const profesor = await requerirProfesor();
  const materia = String(form.get("materia") ?? "").trim();
  const nombre = String(form.get("nombre") ?? "").trim();
  const lista = String(form.get("alumnos") ?? "");
  // Una línea por alumno: "matrícula, nombre completo, correo (opcional)". Acepta comas o tabuladores (pegado desde Excel).
  // La lista es opcional: los alumnos también se agregan solos al entregar su primera actividad.
  const alumnos = lista
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).map((x) => x.trim()))
    .filter(([m, n]) => m && n)
    .map(([matricula, nombreAl, correo]) => ({ matricula: normalizarMatricula(matricula), nombre: nombreAl, correo: correo || "" }));
  if (!materia || !nombre) throw new Error("Faltan datos del grupo");
  modificar((db) => {
    db.grupos.push({
      id: slug(`${materia}-${nombre}`),
      profesorId: profesor.id,
      codigo: nuevoCodigoCurso(materia, db.grupos.map((g) => g.codigo ?? "")),
      materia,
      nombre,
      ciclo: "2026-2027",
      alumnos,
    });
  });
  revalidatePath("/profesor");
  redirect("/profesor");
}

export async function guardarRubrica(actividadId: string, reactivos: Reactivo[], confirmar: boolean) {
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    a.reactivos = reactivos;
    a.rubricaConfirmada = confirmar;
  });
  // Al confirmar, las entregas que ya llegaron se evalúan solas.
  if (confirmar) {
    const pendientes = entregasPorEvaluar(actividadId);
    if (pendientes.length) {
      marcarEnFila(actividadId, pendientes);
      after(() => evaluarVarias(actividadId, pendientes));
    }
  }
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

export async function guardarRevision(
  actividadId: string,
  matricula: string,
  cambios: { resultados: ResultadoReactivo[]; positivos: string[]; mejoras: string[] },
  aprobar: boolean,
) {
  await enActividadPropia(actividadId, (db) => {
    const e = db.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    if (!e) throw new Error("Entrega no encontrada");
    // Si cambian los puntos, la calificación vuelve a salir de ellos y se descarta el ajuste del cuaderno.
    const puntosCambiaron = cambios.resultados.some(
      (r) => r.puntosObtenidos !== e.resultados.find((x) => x.numero === r.numero)?.puntosObtenidos,
    );
    if (puntosCambiaron) delete e.calificacionManual;
    Object.assign(e, cambios);
    if (aprobar) e.estado = "aprobada";
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}


/** Quita del panel del profesor las actividades de ejemplo y los cursos de ejemplo que queden vacíos. */
export async function quitarDatosEjemplo() {
  const profesor = await requerirProfesor();
  const ids = modificar((db) => {
    const propios = new Set(db.grupos.filter((g) => g.profesorId === profesor.id).map((g) => g.id));
    const demo = db.actividades.filter((a) => a.demo && propios.has(a.grupoId)).map((a) => a.id);
    db.actividades = db.actividades.filter((a) => !demo.includes(a.id));
    db.entregas = db.entregas.filter((e) => !demo.includes(e.actividadId));
    const conActividades = new Set(db.actividades.map((a) => a.grupoId));
    db.grupos = db.grupos.filter((g) => !(propios.has(g.id) && ["fis-3b", "mat-2a"].includes(g.id) && !conActividades.has(g.id)));
    return demo;
  });
  ids.forEach((id) => borrarCarpeta(`actividades/${id}`));
  revalidatePath("/", "layout");
  redirect("/profesor");
}

// ---------- Cursos y actividades: editar y borrar desde el panel ----------

/** Corre el cambio solo si el curso es del profesor con sesión. */
async function enGrupoPropio<T>(grupoId: string, cambio: (db: BaseDeDatos) => T) {
  const profesor = await requerirProfesor();
  return modificar((db) => {
    if (!db.grupos.some((g) => g.id === grupoId && g.profesorId === profesor.id)) throw new Error("Curso no encontrado");
    return cambio(db);
  });
}

export async function renombrarGrupo(grupoId: string, materia: string, nombre: string) {
  const m = materia.trim().slice(0, 80);
  const n = nombre.trim().slice(0, 80);
  if (!m || !n) throw new Error("Escribe la materia y el grupo");
  await enGrupoPropio(grupoId, (db) => {
    const g = db.grupos.find((x) => x.id === grupoId)!;
    g.materia = m;
    g.nombre = n;
  });
  revalidatePath("/profesor", "layout");
}

/** Borra el curso con todas sus actividades, entregas y archivos. No se puede deshacer. */
export async function borrarGrupo(grupoId: string) {
  const ids = await enGrupoPropio(grupoId, (db) => {
    const acts = db.actividades.filter((a) => a.grupoId === grupoId).map((a) => a.id);
    db.actividades = db.actividades.filter((a) => a.grupoId !== grupoId);
    db.entregas = db.entregas.filter((e) => !acts.includes(e.actividadId));
    db.grupos = db.grupos.filter((g) => g.id !== grupoId);
    return acts;
  });
  ids.forEach((id) => borrarCarpeta(`actividades/${id}`));
  revalidatePath("/profesor", "layout");
}

export async function editarDatosActividad(actividadId: string, titulo: string, fecha: string, resultadosDesde = "") {
  const t = titulo.trim().slice(0, 120);
  if (!t) throw new Error("Escribe el título");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha no válida");
  const desde = deCampoFechaHora(resultadosDesde);
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    a.titulo = t;
    a.fechaAplicacion = fecha;
    a.resultadosDesde = desde;
  });
  revalidatePath("/profesor", "layout");
}

/** Borra la actividad con sus entregas y archivos. No se puede deshacer. */
export async function borrarActividad(actividadId: string) {
  await enActividadPropia(actividadId, (db) => {
    db.actividades = db.actividades.filter((a) => a.id !== actividadId);
    db.entregas = db.entregas.filter((e) => e.actividadId !== actividadId);
  });
  borrarCarpeta(`actividades/${actividadId}`);
  revalidatePath("/profesor", "layout");
}

// ---------- Colores y etiquetas para organizar ----------

function colorValido(color: string) {
  return COLORES.some((c) => c.clave === color) ? color : undefined;
}

export async function colorGrupo(grupoId: string, color: string) {
  await enGrupoPropio(grupoId, (db) => {
    db.grupos.find((g) => g.id === grupoId)!.color = colorValido(color);
  });
  revalidatePath("/profesor", "layout");
}

export async function colorActividad(actividadId: string, color: string) {
  await enActividadPropia(actividadId, (db) => {
    actividadDe(db, actividadId)!.color = colorValido(color);
  });
  revalidatePath("/profesor", "layout");
}

export async function etiquetarActividad(actividadId: string, etiqueta: string) {
  const e = etiqueta.trim().replace(/\s+/g, " ").slice(0, 30);
  await enActividadPropia(actividadId, (db) => {
    actividadDe(db, actividadId)!.etiqueta = e || undefined;
  });
  revalidatePath("/profesor", "layout");
}

/**
 * Cambia a mano la calificación de un alumno desde el cuaderno (en la escala de la actividad).
 * `null` quita el ajuste y vuelve a la calificada con la rúbrica.
 */
export async function cambiarCalificacion(actividadId: string, matricula: string, valor: number | null) {
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    const escala = a.escala === 100 ? 100 : 10;
    let e = db.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    if (valor === null) {
      if (e) delete e.calificacionManual;
      return;
    }
    if (!Number.isFinite(valor) || valor < 0 || valor > escala) throw new Error(`La calificación va de 0 a ${escala}`);
    if (!e) {
      const grupo = db.grupos.find((g) => g.id === a.grupoId);
      if (!grupo?.alumnos.some((al) => al.matricula === matricula)) throw new Error("Alumno no encontrado");
      e = { actividadId, matricula, estado: "sin_entregar", paginasRecibidas: 0, resultados: [], positivos: [], mejoras: [] };
      db.entregas.push(e);
    }
    e.calificacionManual = Math.round(valor * 10) / 10;
  });
  revalidatePath("/profesor", "layout");
}
