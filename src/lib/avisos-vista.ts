// Datos de cada aviso listos para dibujarlos (nombres, fechas legibles y lectura), según quién mira.
// Sin nada del servidor: lo usan las páginas del profesor y del alumno.
import { LECTOR_PROFESOR, lecturaAviso, sinLeerPara } from "./avisos";
import { fechaHoraLarga } from "./resultados";
import type { AnexoContenido, Aviso, CorreosAviso, Grupo } from "./tipos";

export type DestinoVista = { tipo: "grupo" } | { tipo: "equipo"; nombre: string } | { tipo: "alumnos"; nombres: string[] } | { tipo: "profesor" };

export interface AvisoVista {
  id: string;
  grupoId: string;
  /** "Materia · Grupo" (solo en las vistas de todos los cursos). */
  curso?: string;
  /** Página de avisos del curso (solo en las vistas de todos los cursos). */
  cursoHref?: string;
  /** Nombre de quien lo escribió; vacío si fue quien mira. */
  autor: string;
  mio: boolean;
  deAlumno: boolean;
  destino: DestinoVista;
  asunto: string;
  texto: string;
  anexos: AnexoContenido[];
  fecha: string;
  sinLeer: boolean;
  /** Lectura de un aviso propio del profesor. */
  lectura?: { leidos: number; total: number; porcentaje: number; quienLeyo: { nombre: string; fecha: string }[]; pendientes: string[] };
  /** Mensaje propio del alumno: cuándo lo leyó el profesor (null si aún no). */
  leidoProfesor?: string | null;
  /** Asunto (o inicio) del aviso al que responde. */
  respondeA?: string;
  /** Con qué destino y asunto se responde; sin valor, no se puede responder. */
  responder?: { destino: string; asunto: string; respondeA: string };
  puedeBorrar: boolean;
  correos?: CorreosAviso;
}

interface Contexto {
  grupo: Grupo;
  /** Todos los avisos del curso (para encontrar el original de una respuesta). */
  todos: Aviso[];
  nombreProfesor: string;
  locale: string;
  conCurso?: boolean;
}

function asuntoCorto(a: Aviso) {
  return a.asunto || a.texto.replace(/\s+/g, " ").slice(0, 60);
}

function destinoVista(a: Aviso, nombres: Map<string, string>): DestinoVista {
  const d = a.destino;
  if (d.tipo === "equipo") return { tipo: "equipo", nombre: d.nombre };
  if (d.tipo === "alumnos") return { tipo: "alumnos", nombres: a.destinatarios.map((m) => nombres.get(m) ?? m) };
  return d.tipo === "grupo" ? { tipo: "grupo" } : { tipo: "profesor" };
}

/** Aviso visto por el profesor del curso. */
export function vistaProfesor(a: Aviso, c: Contexto): AvisoVista {
  const nombres = new Map(c.grupo.alumnos.map((x) => [x.matricula, x.nombre]));
  const mio = a.autor.tipo === "profesor";
  const original = a.respondeA ? c.todos.find((x) => x.id === a.respondeA) : undefined;
  const lectura = mio ? lecturaAviso(a, c.grupo) : undefined;
  return {
    ...comun(a, c, original),
    autor: a.autor.tipo === "alumno" ? (nombres.get(a.autor.matricula) ?? a.autor.matricula) : "",
    mio,
    destino: destinoVista(a, nombres),
    sinLeer: sinLeerPara(a, LECTOR_PROFESOR),
    lectura: lectura && {
      leidos: lectura.leidos,
      total: lectura.total,
      porcentaje: lectura.porcentaje,
      quienLeyo: lectura.quienLeyo.map((x) => ({ nombre: x.alumno.nombre, fecha: fechaHoraLarga(x.fecha, c.locale) })),
      pendientes: lectura.pendientes.map((x) => x.nombre),
    },
    responder:
      a.autor.tipo === "alumno" && nombres.has(a.autor.matricula)
        ? { destino: `alumnos:${a.autor.matricula}`, asunto: asuntoCorto(a), respondeA: a.id }
        : undefined,
    puedeBorrar: true,
    correos: mio ? a.correos : undefined,
  };
}

/** Aviso visto por un alumno del curso (con su matrícula en ese curso). */
export function vistaAlumno(a: Aviso, c: Contexto, matricula: string): AvisoVista {
  const mio = a.autor.tipo === "alumno" && a.autor.matricula === matricula;
  const original = a.respondeA ? c.todos.find((x) => x.id === a.respondeA) : undefined;
  // El alumno no ve a quiénes más les llegó: solo si fue para todo el grupo, su equipo o para él.
  const destino: DestinoVista =
    a.destino.tipo === "alumnos" ? { tipo: "alumnos", nombres: [] } : a.destino.tipo === "equipo" ? { tipo: "equipo", nombre: a.destino.nombre } : { tipo: a.destino.tipo };
  return {
    ...comun(a, c, original),
    autor: mio ? "" : c.nombreProfesor,
    mio,
    destino,
    sinLeer: sinLeerPara(a, matricula),
    leidoProfesor: mio ? (a.leidos[LECTOR_PROFESOR] ? fechaHoraLarga(a.leidos[LECTOR_PROFESOR], c.locale) : null) : undefined,
    responder: mio ? undefined : { destino: "profesor", asunto: asuntoCorto(a), respondeA: a.id },
    puedeBorrar: mio,
  };
}

function comun(a: Aviso, c: Contexto, original: Aviso | undefined) {
  return {
    id: a.id,
    grupoId: a.grupoId,
    ...(c.conCurso ? { curso: `${c.grupo.materia} · ${c.grupo.nombre}` } : {}),
    deAlumno: a.autor.tipo === "alumno",
    asunto: a.asunto,
    texto: a.texto,
    anexos: a.anexos,
    fecha: fechaHoraLarga(a.enviadoEn, c.locale),
    ...(original ? { respondeA: asuntoCorto(original) } : {}),
  };
}
