// Asesorías listas para dibujarlas (nombres, fechas legibles y estado), según quién mira. Sin nada
// del servidor: lo usan las páginas del profesor y del alumno.
import { bloqueEn, duracionTexto, hora, yaEmpezo, yaPaso } from "./asesorias";
import { formato } from "./i18n/idiomas";
import type { AgendaProfesor, Asesoria, EstadoAsesoria, Grupo } from "./tipos";

export type EstadoVista = EstadoAsesoria | "porRegistrar";

export interface AsesoriaVista {
  id: string;
  grupoId: string;
  curso: string;
  /** Nombre del alumno (solo en la vista del profesor). */
  alumno?: string;
  fecha: string;
  /** "jueves 3 de diciembre". */
  dia: string;
  inicio: number;
  duracion: number;
  /** "10:00 a 10:30". */
  horario: string;
  duracionTexto: string;
  tema: string;
  motivo?: string;
  comentarios: string;
  estado: EstadoAsesoria;
  /** Estado que se muestra: una agendada cuya hora ya pasó queda "por registrar". */
  estadoVista: EstadoVista;
  revisado?: string;
  acuerdos?: string;
  duracionReal?: number;
  canceladaPor?: "alumno" | "profesor";
  recordatorio: boolean;
  /** El alumno aún puede cancelarla (no ha empezado). */
  puedeCancelar: boolean;
  /** Ya no cae en una franja de asesoría de la agenda (el profesor la cambió). */
  conflicto: boolean;
  /** Ya pasó la hora (para separar próximas y anteriores). */
  pasada: boolean;
}

export function diaLargoLocal(fecha: string, locale: string) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** "12 ago 2026". */
export function fechaCorta(fecha: string, locale: string) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function vistaAsesoria(
  a: Asesoria,
  c: { grupo?: Grupo; locale: string; agenda?: Pick<AgendaProfesor, "bloques">; paraProfesor: boolean },
  ahora: Date = new Date(),
): AsesoriaVista {
  const pasada = yaPaso(a, ahora);
  const conflicto =
    c.paraProfesor && a.estado === "agendada" && !pasada && Boolean(c.agenda)
      ? Array.from({ length: a.duracion / 30 }, (_, i) => bloqueEn(c.agenda, a.fecha, a.inicio + i * 30)?.tipo).some((t) => t !== "asesoria")
      : false;
  return {
    id: a.id,
    grupoId: a.grupoId,
    curso: c.grupo ? `${c.grupo.materia} · ${c.grupo.nombre}` : "",
    ...(c.paraProfesor ? { alumno: c.grupo?.alumnos.find((x) => x.matricula === a.matricula)?.nombre ?? a.matricula } : {}),
    fecha: a.fecha,
    dia: diaLargoLocal(a.fecha, c.locale),
    inicio: a.inicio,
    duracion: a.duracion,
    horario: `${hora(a.inicio)} – ${hora(a.inicio + a.duracion)}`,
    duracionTexto: duracionTexto(a.duracion),
    tema: a.tema,
    ...(a.motivo ? { motivo: a.motivo } : {}),
    comentarios: a.comentarios,
    estado: a.estado,
    estadoVista: a.estado === "agendada" && pasada ? "porRegistrar" : a.estado,
    ...(a.revisado ? { revisado: a.revisado } : {}),
    ...(a.acuerdos ? { acuerdos: a.acuerdos } : {}),
    ...(a.duracionReal ? { duracionReal: a.duracionReal } : {}),
    ...(a.canceladaPor ? { canceladaPor: a.canceladaPor } : {}),
    recordatorio: Boolean(a.recordatorio),
    puedeCancelar: a.estado === "agendada" && !yaEmpezo(a, ahora),
    conflicto,
    pasada,
  };
}

/** Periodo del curso en texto ("12 ago 2026 al 5 dic 2026"); undefined si no tiene fechas. */
export function textoPeriodo(t: { periodo: string; periodoDesde: string; periodoHasta: string }, inicio: string | undefined, fin: string | undefined, locale: string) {
  if (inicio && fin) return formato(t.periodo, { i: fechaCorta(inicio, locale), f: fechaCorta(fin, locale) });
  if (inicio) return formato(t.periodoDesde, { i: fechaCorta(inicio, locale) });
  if (fin) return formato(t.periodoHasta, { f: fechaCorta(fin, locale) });
  return undefined;
}
