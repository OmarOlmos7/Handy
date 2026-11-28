// Copias de actividades y de cursos. Una copia lleva todo lo que armó el profesor (hoja, rúbrica,
// solución, anexos, fechas, etiqueta, color) pero nada de los alumnos: sin entregas, sin
// evaluaciones, sin tiempos ni licencias. Aquí solo se arma la copia en memoria; los archivos los
// copia la acción del servidor (ver copiarArchivosActividad en acciones-copiar).
import crypto from "node:crypto";
import type { Actividad, BaseDeDatos, Grupo, Proyecto } from "./tipos";

/** Texto en minúsculas sin acentos ni signos, para armar identificadores legibles. */
function base(texto: string, respaldo: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || respaldo
  );
}

/** Identificador nuevo que no choca con ninguno de los existentes (aunque se creen varios en el mismo instante). */
export function idUnico(texto: string, existentes: Set<string>, respaldo = "copia") {
  for (;;) {
    const id = `${base(texto, respaldo)}-${crypto.randomBytes(3).toString("hex")}`;
    if (!existentes.has(id)) {
      existentes.add(id);
      return id;
    }
  }
}

/** Cambia, en cualquier texto del objeto, las rutas `actividades/<origen>/...` por `actividades/<destino>/...`. */
export function cambiarRutas<T>(valor: T, origen: string, destino: string): T {
  const prefijo = `actividades/${origen}/`;
  const nuevo = `actividades/${destino}/`;
  const recorrer = (v: unknown): unknown => {
    if (typeof v === "string") return v.startsWith(prefijo) ? nuevo + v.slice(prefijo.length) : v;
    if (Array.isArray(v)) return v.map(recorrer);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, recorrer(x)]));
    return v;
  };
  return recorrer(valor) as T;
}

/** Título de la copia dentro del mismo curso: «Título (copia)», «Título (copia 2)»… sin repetir. */
export function tituloCopia(titulo: string, usados: Iterable<string>, sufijo = "copia") {
  const ocupados = new Set(usados);
  const limpio = titulo.replace(new RegExp(`\\s*\\(${sufijo}(?: \\d+)?\\)$`), "");
  for (let n = 1; ; n++) {
    const t = `${limpio} (${sufijo}${n > 1 ? ` ${n}` : ""})`.slice(0, 120);
    if (!ocupados.has(t)) return t;
  }
}

/**
 * Copia de una actividad en el curso destino: mismo contenido, rúbrica y solución, con id nuevo y
 * sin nada de los alumnos. Queda esperando entregas. Las rutas de sus archivos apuntan a la carpeta
 * de la copia.
 */
export function copiaDeActividad(act: Actividad, nuevoId: string, grupoId: string, titulo = act.titulo): Actividad {
  const copia = cambiarRutas(structuredClone(act), act.id, nuevoId);
  copia.id = nuevoId;
  copia.grupoId = grupoId;
  copia.titulo = titulo;
  copia.estado = "esperando_entregas";
  // Lo que solo tiene sentido con entregas ya evaluadas, o para deshacer una edición de la original.
  delete copia.rubricaEditadaEn;
  delete copia.hojaAnterior;
  delete copia.entregasSuspendidas;
  return copia;
}

/** Copia del modelo de un proyecto: sus etapas y rúbricas, sin equipos, evaluadores invitados ni etapas cerradas. */
export function copiaDeProyecto(p: Proyecto, nuevoId: string, grupoId: string, ahora = new Date()): Proyecto {
  const copia = structuredClone(p);
  copia.id = nuevoId;
  copia.grupoId = grupoId;
  copia.creadoEn = ahora.toISOString();
  copia.equipos = [];
  copia.evaluadores = [];
  for (const e of copia.etapas) delete e.cerradaEn;
  return copia;
}

/**
 * Curso vacío idéntico al original: materia, ciclo, color, fechas y plan de evaluación, con todas
 * sus actividades y proyectos, pero sin alumnos. Lleva un código de curso nuevo para que los
 * alumnos del original no entren a la copia.
 */
export function copiaDeGrupo(g: Grupo, nuevoId: string, codigo: string, nombre: string): Grupo {
  const copia = structuredClone(g);
  copia.id = nuevoId;
  copia.codigo = codigo;
  copia.nombre = nombre.slice(0, 80);
  copia.alumnos = [];
  delete copia.archivado;
  return copia;
}

/** Cursos del profesor con sus actividades, para el directorio de "Copiar elemento". */
export function directorioActividades(db: BaseDeDatos, profesorId: string) {
  return db.grupos
    .filter((g) => g.profesorId === profesorId)
    .map((g) => ({
      id: g.id,
      materia: g.materia,
      nombre: g.nombre,
      ciclo: g.ciclo,
      archivado: Boolean(g.archivado),
      actividades: db.actividades
        .filter((a) => a.grupoId === g.id)
        .map((a) => ({ id: a.id, titulo: a.titulo, etiqueta: a.etiqueta, fecha: a.fechaAplicacion, reactivos: a.reactivos.length })),
    }))
    .sort((a, b) => Number(a.archivado) - Number(b.archivado));
}

export type CursoDirectorio = ReturnType<typeof directorioActividades>[number];
