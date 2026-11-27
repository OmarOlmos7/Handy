"use server";

import { esIdioma } from "@/lib/i18n/idiomas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actividadDe, borrarCarpeta, modificar, slug } from "@/lib/almacen";
import { esDelProfesor, normalizarMatricula, nuevoCodigoCurso } from "@/lib/cuentas";
import { entregasPorEvaluar, evaluarVarias, marcarEnFila } from "@/lib/evaluacion";
import { COLORES } from "@/lib/colores";
import { esMotor, precisionPara } from "@/lib/configuracion";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, EstiloCorreccion, Reactivo, ResultadoReactivo } from "@/lib/tipos";
import { aCampoFechaHora, deCampoFechaHora } from "@/lib/resultados";
import { leerFechas } from "@/lib/periodo";
import { limpiarEtiqueta } from "@/lib/etiquetas";
import { leerTemarioActividad } from "@/lib/asignaturas";
import { cambioEstructura, limpiarCriterios, limpiarRecomendaciones, reacomodarValores, type CambiosRubrica } from "@/lib/rubrica";

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

/**
 * Guarda la rúbrica: reactivos y, si vienen, los criterios, las recomendaciones y las indicaciones
 * para la IA. Sirve para confirmarla la primera vez y para reeditarla después. Las entregas ya
 * evaluadas conservan su calificación (se recalifican con "Re-evaluar actividad"); si cambia la
 * lista de criterios, sus valores por criterio se reacomodan para seguir alineados.
 * Devuelve cuántas entregas ya estaban evaluadas.
 */
export async function guardarRubrica(actividadId: string, reactivos: Reactivo[], confirmar: boolean, cambios: CambiosRubrica = {}) {
  const evaluadas = await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    const entregas = db.entregas.filter((e) => e.actividadId === actividadId);
    const hechas = entregas.filter((e) => e.estado !== "sin_entregar" && e.resultados.length > 0);
    const conEntregas = entregas.some((e) => e.estado !== "sin_entregar");
    const previos = new Map(a.reactivos.map((r) => [r.numero, r]));
    // Con entregas, el tipo de cada reactivo queda fijo (los alumnos ya contestaron con él), como al reeditar la actividad.
    a.reactivos = reactivos.map((r) => (conEntregas && previos.has(r.numero) ? { ...r, tipo: previos.get(r.numero)!.tipo } : r));
    if (cambios.criterios) {
      const anteriores = a.criterios?.length ?? 0;
      const { criterios, origenes } = limpiarCriterios(cambios.criterios, a.reactivos, anteriores);
      if (cambioEstructura(origenes, anteriores)) {
        for (const e of entregas) for (const res of e.resultados) res.criterios = reacomodarValores(res.criterios, origenes);
      }
      a.criterios = criterios.length ? criterios : undefined;
    }
    if (cambios.recomendaciones) {
      const recs = limpiarRecomendaciones(cambios.recomendaciones);
      a.recomendaciones = recs.length ? recs : undefined;
    }
    if (cambios.instrucciones !== undefined) a.instrucciones = cambios.instrucciones.trim().slice(0, 2000) || undefined;
    if (a.rubricaConfirmada && hechas.length) a.rubricaEditadaEn = new Date().toISOString();
    a.rubricaConfirmada = confirmar;
    return hechas.length;
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
  return { evaluadas };
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
    // Proyectos del curso con sus evidencias y evaluaciones.
    const proyectos = (db.proyectos ?? []).filter((p) => p.grupoId === grupoId).map((p) => p.id);
    db.proyectos = (db.proyectos ?? []).filter((p) => p.grupoId !== grupoId);
    db.entregasProyecto = (db.entregasProyecto ?? []).filter((e) => !proyectos.includes(e.proyectoId));
    db.evaluacionesProyecto = (db.evaluacionesProyecto ?? []).filter((e) => !proyectos.includes(e.proyectoId));
    // Avisos del curso con sus anexos.
    const avisos = (db.avisos ?? []).filter((a) => a.grupoId === grupoId).map((a) => a.id);
    db.avisos = (db.avisos ?? []).filter((a) => a.grupoId !== grupoId);
    db.asesorias = (db.asesorias ?? []).filter((a) => a.grupoId !== grupoId);
    return [...acts.map((id) => `actividades/${id}`), ...proyectos.map((id) => `proyectos/${id}`), ...avisos.map((id) => `avisos/${id}`)];
  });
  ids.forEach((carpeta) => borrarCarpeta(carpeta));
  revalidatePath("/profesor", "layout");
}

export async function editarDatosActividad(actividadId: string, titulo: string, fecha: string, resultadosDesde = "") {
  const t = titulo.trim().slice(0, 120);
  if (!t) throw new Error("Escribe el título");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha no válida");
  const desde = deCampoFechaHora(resultadosDesde);
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    // Revisa la liberación de resultados contra las fechas de entrega que ya tiene la actividad.
    leerFechas({ envioDesde: aCampoFechaHora(a.envioDesde), envioHasta: aCampoFechaHora(a.envioHasta), resultadosDesde });
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

/**
 * Borra la entrega de un alumno (sus fotos y su evaluación) para que pueda volver a entregar.
 * Los créditos ya usados en evaluarla no se devuelven.
 */
export async function borrarEntrega(actividadId: string, matricula: string) {
  const m = normalizarMatricula(matricula);
  const borrada = await enActividadPropia(actividadId, (db) => {
    const entrega = db.entregas.find((e) => e.actividadId === actividadId && normalizarMatricula(e.matricula) === m);
    if (entrega) db.entregas = db.entregas.filter((e) => e !== entrega);
    return entrega;
  });
  if (borrada && !/[\\/]|^\.\.?$/.test(borrada.matricula)) borrarCarpeta(`actividades/${actividadId}/entregas/${borrada.matricula}`);
  revalidatePath(`/profesor/actividades/${actividadId}`);
  revalidatePath(`/profesor/actividades/${actividadId}/entregas`);
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

/** Archiva o desarchiva un curso del profesor. No borra nada: solo lo saca del panel. */
export async function archivarGrupo(grupoId: string, archivar: boolean) {
  await enGrupoPropio(grupoId, (db) => {
    const g = db.grupos.find((x) => x.id === grupoId)!;
    if (archivar) g.archivado = new Date().toISOString();
    else delete g.archivado;
  });
  revalidatePath("/profesor", "layout");
}

/** Desarchivar desde el formulario de Configuración. */
export async function desarchivarGrupo(datos: FormData) {
  await archivarGrupo(String(datos.get("grupoId") ?? ""), false);
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

export interface CambiosActividad {
  titulo: string;
  fecha: string;
  visibleDesde?: string;
  envioDesde?: string;
  envioHasta?: string;
  resultadosDesde: string;
  escala: 10 | 100;
  /** Rúbrica sin puntaje ("Sin puntos" en la escala). */
  sinPuntaje?: boolean;
  sinSolucion: boolean;
  estiloCorreccion: EstiloCorreccion;
  /** Idioma de la actividad; vacío deja el que tenía. */
  idioma?: string;
  instruccionesAlumno?: string[];
  /** Tipo de actividad (Tarea, Quiz…); vacío la quita. Sin valor deja el que tenía. */
  etiqueta?: string;
  /** Unidad y temas del syllabus (JSON del selector de temario); vacío los quita. Sin valor deja los que tenía. */
  temario?: string;
  /** Precisión de la IA para evaluar las entregas que lleguen; sin valor deja la que tenía. */
  motor?: string;
  esfuerzo?: string;
  reactivos: { numero: number; enunciado: string; tema: string; puntos: number; opciones?: string[] }[];
}

/** true si ya llegó al menos una entrega de alumno de la actividad. */
function tieneEntregas(db: BaseDeDatos, actividadId: string) {
  return db.entregas.some((e) => e.actividadId === actividadId && e.estado !== "sin_entregar");
}

/** Lo que se imprime de cada reactivo (texto, opciones y puntos), para saber si la hoja cambió. */
function textoImpreso(reactivos: Reactivo[]): string {
  return JSON.stringify(reactivos.map((r) => [r.numero, r.enunciado, r.opciones ?? [], r.puntos]));
}

/**
 * Modifica una actividad ya creada: datos generales, si requiere solución, las instrucciones
 * impresas y el texto, tema y puntos de cada reactivo (no agrega ni quita reactivos).
 */
export async function modificarActividad(actividadId: string, c: CambiosActividad) {
  const titulo = c.titulo.trim().slice(0, 120);
  if (!titulo) throw new Error("Escribe el título");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) throw new Error("Fecha no válida");
  const fechas = leerFechas(c);
  const profesor = await requerirProfesor();
  let carpetaVieja: string | undefined;
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    const textoAntes = textoImpreso(a.reactivos);
    // Con entregas, los alumnos ya contestaron sobre ese texto: el enunciado y las opciones quedan fijos.
    const conEntregas = tieneEntregas(db, actividadId);
    a.titulo = titulo;
    a.fechaAplicacion = c.fecha;
    a.visibleDesde = fechas.visibleDesde;
    a.envioDesde = fechas.envioDesde;
    a.envioHasta = fechas.envioHasta;
    a.resultadosDesde = fechas.resultadosDesde;
    a.escala = c.escala === 10 ? 10 : 100;
    if (c.sinPuntaje !== undefined) a.sinPuntaje = c.sinPuntaje || undefined;
    a.sinSolucion = c.sinSolucion || undefined;
    a.estiloCorreccion = c.estiloCorreccion === "subrayado" ? "subrayado" : "margen";
    if (esIdioma(c.idioma)) a.idioma = c.idioma;
    if (c.etiqueta !== undefined) a.etiqueta = limpiarEtiqueta(c.etiqueta);
    if (c.temario !== undefined) {
      a.temario = leerTemarioActividad(c.temario, (db.asignaturas ?? []).filter((x) => x.profesorId === profesor.id));
    }
    if (esMotor(c.motor)) a.precision = precisionPara(c.motor, profesor.config, c.esfuerzo);
    if (c.instruccionesAlumno && a.origen === "ia" && !conEntregas) {
      a.instruccionesAlumno = c.instruccionesAlumno.map((x) => x.trim()).filter(Boolean).slice(0, 6);
    }
    for (const r of a.reactivos) {
      const n = c.reactivos.find((x) => x.numero === r.numero);
      if (!n) continue;
      r.tema = n.tema.trim().slice(0, 80);
      if (Number.isFinite(n.puntos) && n.puntos > 0) r.puntos = Math.min(1000, n.puntos);
      if (conEntregas) continue;
      if (n.enunciado.trim()) r.enunciado = n.enunciado.trim().slice(0, 2000);
      if (n.opciones && CON_OPCIONES.includes(r.tipo)) r.opciones = n.opciones.map((x) => x.trim()).filter(Boolean).slice(0, 8);
    }
    // Actividad escaneada cuyo texto cambió: el PDF anterior ya no coincide. Se borra y la hoja se
    // vuelve a generar con los textos nuevos (hoja de la app con QR, editable también con IA).
    if (!conEntregas && a.origen === "escaneada" && a.reactivos.length > 0 && textoImpreso(a.reactivos) !== textoAntes) {
      const carpeta = `actividades/${actividadId}/hoja`;
      if ((a.archivos ?? []).every((r) => r.startsWith(`${carpeta}/`))) carpetaVieja = carpeta;
      a.origen = "ia";
      a.archivos = undefined;
      a.instruccionesAlumno = a.instruccionesAlumno ?? [];
      a.hojaAnterior = undefined;
    }
  });
  if (carpetaVieja) borrarCarpeta(carpetaVieja);
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
  revalidatePath("/profesor", "layout");
}

/** Reactivos con opciones editables a mano (las de plataforma también). */
const CON_OPCIONES: string[] = ["opcion_multiple", "seleccion_multiple", "orden"];

/** Antes de re-evaluar: guarda el nivel de precisión y las indicaciones para la IA de la actividad. */
export async function prepararReevaluacion(actividadId: string, motor: string, indicaciones: string, esfuerzo = "") {
  const profesor = await requerirProfesor();
  await enActividadPropia(actividadId, (db) => {
    const a = actividadDe(db, actividadId)!;
    if (esMotor(motor)) a.precision = precisionPara(motor, profesor.config, esfuerzo);
    a.instrucciones = indicaciones.trim().slice(0, 2000) || undefined;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
}

/** Suspende o reanuda la recepción de entregas por QR de una actividad. */
export async function cambiarRecepcion(actividadId: string, suspender: boolean) {
  await enActividadPropia(actividadId, (db) => {
    actividadDe(db, actividadId)!.entregasSuspendidas = suspender || undefined;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
  revalidatePath(`/entregar/${actividadId}`);
}

/** Rúbrica con puntaje (calificación) o sin puntaje (solo aciertos y elementos a corregir). */
export async function cambiarPuntaje(actividadId: string, sinPuntaje: boolean) {
  await enActividadPropia(actividadId, (db) => {
    actividadDe(db, actividadId)!.sinPuntaje = sinPuntaje || undefined;
  });
  revalidatePath(`/profesor/actividades/${actividadId}`, "layout");
  revalidatePath("/profesor", "layout");
}
