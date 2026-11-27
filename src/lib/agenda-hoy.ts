// Fechas de entrega en el calendario y el resumen "Hoy" (lo que toca hoy, con hora) para el profesor
// y el alumno. Sin nada del servidor.
import { FIN_DIA, FRANJAS, INICIO_DIA, MINUTOS_FRANJA, activa, ahoraEnMexico, asuetoDeAgenda, bloqueEn, vigente, type AgendaConAsuetos } from "./asesorias";
import type { Actividad, Asesoria, BloqueAgenda, Grupo, TipoBloque } from "./tipos";

/** Franja de 30 min que queda justo antes del cierre de entrega (dentro de 7:00 a 18:00). */
export function franjaEntrega(minutos: number): number {
  const inicio = Math.floor((minutos - MINUTOS_FRANJA) / MINUTOS_FRANJA) * MINUTOS_FRANJA;
  return Math.min(Math.max(inicio, INICIO_DIA), FIN_DIA - MINUTOS_FRANJA);
}

export interface EntregaCalendario {
  actividadId: string;
  grupoId: string;
  titulo: string;
  curso: string;
  fecha: string;
  /** Franja donde se dibuja y minuto exacto del cierre. */
  inicio: number;
  cierre: number;
}

/** Fechas de cierre de entrega de las actividades que caen en esas fechas. */
export function entregasEnFechas(actividades: Pick<Actividad, "id" | "grupoId" | "titulo" | "envioHasta">[], grupos: Pick<Grupo, "id" | "materia" | "nombre">[], fechas: string[]): EntregaCalendario[] {
  const enFechas = new Set(fechas);
  const cursos = new Map(grupos.map((g) => [g.id, `${g.materia} · ${g.nombre}`]));
  return actividades
    .filter((a) => a.envioHasta && cursos.has(a.grupoId))
    .map((a) => {
      const { fecha, minutos } = ahoraEnMexico(new Date(a.envioHasta!));
      return { actividadId: a.id, grupoId: a.grupoId, titulo: a.titulo, curso: cursos.get(a.grupoId)!, fecha, inicio: franjaEntrega(minutos), cierre: minutos };
    })
    .filter((e) => enFechas.has(e.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cierre - b.cierre);
}

export type TipoHoy = TipoBloque | "cita" | "entrega";

export interface ItemHoy {
  inicio: number;
  fin?: number;
  tipo: TipoHoy;
  /** Nombre corto: la nota del bloque, el tema de la asesoría o el título de la actividad. */
  texto: string;
  /** Curso o alumno, si aplica. */
  detalle?: string;
  href?: string;
}

/** Tramos seguidos del mismo bloque en un día (para no repetir cada media hora). */
function tramosDelDia(agenda: AgendaConAsuetos | undefined, fecha: string, incluir: (b: BloqueAgenda) => boolean) {
  const tramos: { bloque: BloqueAgenda; inicio: number; fin: number }[] = [];
  for (const m of FRANJAS) {
    const b = bloqueEn(agenda, fecha, m);
    if (!b || !incluir(b)) continue;
    const ultimo = tramos.at(-1);
    if (ultimo && ultimo.fin === m && ultimo.bloque.tipo === b.tipo && ultimo.bloque.titulo === b.titulo && ultimo.bloque.grupoId === b.grupoId) ultimo.fin += MINUTOS_FRANJA;
    else tramos.push({ bloque: b, inicio: m, fin: m + MINUTOS_FRANJA });
  }
  return tramos;
}

const porHora = (a: ItemHoy, b: ItemHoy) => a.inicio - b.inicio;

/** Lo de hoy del profesor: su agenda (sin las franjas libres de asesoría), asesorías y entregas. */
export function hoyProfesor(datos: {
  agenda?: AgendaConAsuetos;
  asesorias: Asesoria[];
  actividades: Pick<Actividad, "id" | "grupoId" | "titulo" | "envioHasta">[];
  grupos: Grupo[];
  etiquetas?: Map<string, string>;
  ahora?: Date;
}): ItemHoy[] {
  const hoy = ahoraEnMexico(datos.ahora).fecha;
  const grupo = (id: string) => datos.grupos.find((g) => g.id === id);
  const items: ItemHoy[] = tramosDelDia(datos.agenda, hoy, (b) => b.tipo !== "asesoria").map(({ bloque, inicio, fin }) => ({
    inicio,
    fin,
    tipo: bloque.tipo,
    texto: bloque.titulo || (bloque.etiqueta && datos.etiquetas?.get(bloque.etiqueta)) || "",
    ...(bloque.grupoId && grupo(bloque.grupoId) ? { detalle: `${grupo(bloque.grupoId)!.materia} · ${grupo(bloque.grupoId)!.nombre}` } : {}),
  }));
  for (const a of datos.asesorias.filter((x) => x.fecha === hoy && activa(x))) {
    const g = grupo(a.grupoId);
    items.push({
      inicio: a.inicio,
      fin: a.inicio + a.duracion,
      tipo: "cita",
      texto: a.tema,
      detalle: g?.alumnos.find((x) => x.matricula === a.matricula)?.nombre,
      href: `/profesor/grupos/${a.grupoId}/asesorias?abrir=${a.id}#asesoria-${a.id}`,
    });
  }
  for (const e of entregasEnFechas(datos.actividades, datos.grupos, [hoy])) {
    items.push({ inicio: e.cierre, tipo: "entrega", texto: e.titulo, detalle: e.curso, href: `/profesor/actividades/${e.actividadId}` });
  }
  return items.sort(porHora);
}

/**
 * Lo de hoy del alumno: las clases (y otros bloques) que su profesor ligó a sus cursos, sus asesorías
 * y las entregas que cierran hoy.
 */
export function hoyAlumno(datos: {
  cursos: { grupo: Grupo; matricula: string; agenda?: AgendaConAsuetos }[];
  asesorias: Asesoria[];
  actividades: Pick<Actividad, "id" | "grupoId" | "titulo" | "envioHasta">[];
  ahora?: Date;
}): ItemHoy[] {
  const hoy = ahoraEnMexico(datos.ahora).fecha;
  const items: ItemHoy[] = [];
  const asuetos = new Set(datos.cursos.map((c) => asuetoDeAgenda(c.agenda, hoy)).filter((x): x is string => Boolean(x)));
  for (const nombre of asuetos) items.push({ inicio: INICIO_DIA, fin: FIN_DIA, tipo: "asueto", texto: nombre });
  for (const { grupo, matricula, agenda } of datos.cursos) {
    const curso = `${grupo.materia} · ${grupo.nombre}`;
    for (const { bloque, inicio, fin } of tramosDelDia(agenda, hoy, (b) => b.grupoId === grupo.id && vigente(b, hoy))) {
      items.push({ inicio, fin, tipo: bloque.tipo, texto: curso, href: `/alumno/cursos/${grupo.id}` });
    }
    for (const a of datos.asesorias.filter((x) => x.fecha === hoy && x.grupoId === grupo.id && x.matricula === matricula && x.estado === "agendada")) {
      items.push({ inicio: a.inicio, fin: a.inicio + a.duracion, tipo: "cita", texto: a.tema, detalle: curso, href: `/alumno/cursos/${grupo.id}/asesorias` });
    }
  }
  for (const e of entregasEnFechas(datos.actividades, datos.cursos.map((c) => c.grupo), [hoy])) {
    items.push({ inicio: e.cierre, tipo: "entrega", texto: e.titulo, detalle: e.curso, href: `/entregar/${e.actividadId}` });
  }
  return items.sort(porHora);
}
