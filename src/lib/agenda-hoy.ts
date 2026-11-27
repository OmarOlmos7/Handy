// Fechas de entrega en el calendario y el resumen "Hoy" (lo que toca hoy, con hora) para el profesor
// y el alumno. Sin nada del servidor.
import { FIN_DIA, FRANJAS, INICIO_DIA, MINUTOS_FRANJA, activa, ahoraEnMexico, asuetoDeAgenda, bloqueEn, fechasSemana, lunesDe, sumarDias, type AgendaConAsuetos } from "./asesorias";
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
  /** Actividad común que el profesor publica a sus alumnos. */
  comun?: boolean;
  /** Curso al que pertenece (para filtrar). */
  grupoId?: string;
}

type AgendaConEtiquetas = AgendaConAsuetos & { etiquetas?: { id: string; nombre: string }[] };

/** Tramos seguidos del mismo bloque en un día (para no repetir cada media hora). */
function tramosDelDia(agenda: AgendaConAsuetos | undefined, fecha: string, incluir: (b: BloqueAgenda) => boolean) {
  const tramos: { bloque: BloqueAgenda; inicio: number; fin: number }[] = [];
  for (const m of FRANJAS) {
    const b = bloqueEn(agenda, fecha, m);
    if (!b || !incluir(b)) continue;
    const ultimo = tramos.at(-1);
    const igual =
      ultimo &&
      ultimo.fin === m &&
      ultimo.bloque.tipo === b.tipo &&
      ultimo.bloque.titulo === b.titulo &&
      ultimo.bloque.grupoId === b.grupoId &&
      ultimo.bloque.etiqueta === b.etiqueta &&
      Boolean(ultimo.bloque.comun) === Boolean(b.comun);
    if (igual) ultimo.fin += MINUTOS_FRANJA;
    else tramos.push({ bloque: b, inicio: m, fin: m + MINUTOS_FRANJA });
  }
  return tramos;
}

const porHora = (a: ItemHoy, b: ItemHoy) => a.inicio - b.inicio || (a.fin ?? a.inicio) - (b.fin ?? b.inicio);
const nombreCurso = (g: Pick<Grupo, "materia" | "nombre">) => `${g.materia} · ${g.nombre}`;
const nombreEtiqueta = (agenda: AgendaConEtiquetas | undefined, id: string | undefined) => (id ? agenda?.etiquetas?.find((e) => e.id === id)?.nombre : undefined);

/**
 * Lo del profesor en un día (hoy, si no se da la fecha): su agenda (sin las franjas libres de
 * asesoría), asesorías y cierres de entrega. Con `grupoId` solo lo de ese curso (y lo que no es de
 * ningún curso).
 */
export function hoyProfesor(datos: {
  agenda?: AgendaConEtiquetas;
  asesorias: Asesoria[];
  actividades: Pick<Actividad, "id" | "grupoId" | "titulo" | "envioHasta">[];
  grupos: Grupo[];
  /** @deprecated se toman de la agenda; se conserva por compatibilidad. */
  etiquetas?: Map<string, string>;
  ahora?: Date;
  fecha?: string;
  grupoId?: string;
}): ItemHoy[] {
  const hoy = datos.fecha ?? ahoraEnMexico(datos.ahora).fecha;
  const grupo = (id: string) => datos.grupos.find((g) => g.id === id);
  const delCurso = (id: string | undefined) => !datos.grupoId || !id || id === datos.grupoId;
  const items: ItemHoy[] = tramosDelDia(datos.agenda, hoy, (b) => b.tipo !== "asesoria" && delCurso(b.grupoId)).map(({ bloque, inicio, fin }) => {
    const g = bloque.grupoId ? grupo(bloque.grupoId) : undefined;
    return {
      inicio,
      fin,
      tipo: bloque.tipo,
      texto: bloque.titulo || (bloque.etiqueta && (datos.etiquetas?.get(bloque.etiqueta) ?? nombreEtiqueta(datos.agenda, bloque.etiqueta))) || "",
      ...(g ? { detalle: nombreCurso(g), grupoId: g.id } : {}),
      ...(bloque.comun ? { comun: true } : {}),
    };
  });
  for (const a of datos.asesorias.filter((x) => x.fecha === hoy && activa(x) && (!datos.grupoId || x.grupoId === datos.grupoId))) {
    const g = grupo(a.grupoId);
    items.push({
      inicio: a.inicio,
      fin: a.inicio + a.duracion,
      tipo: "cita",
      texto: a.tema,
      detalle: g?.alumnos.find((x) => x.matricula === a.matricula)?.nombre,
      href: `/profesor/grupos/${a.grupoId}/asesorias?abrir=${a.id}#asesoria-${a.id}`,
      grupoId: a.grupoId,
    });
  }
  const grupos = datos.grupos.filter((g) => !datos.grupoId || g.id === datos.grupoId);
  for (const e of entregasEnFechas(datos.actividades, grupos, [hoy])) {
    items.push({ inicio: e.cierre, tipo: "entrega", texto: e.titulo, detalle: e.curso, href: `/profesor/actividades/${e.actividadId}`, grupoId: e.grupoId });
  }
  return items.sort(porHora);
}

/**
 * Lo del alumno en un día (hoy, si no se da la fecha): las clases y otros bloques que su profesor
 * ligó a sus cursos, las actividades comunes que publicó, sus asesorías, los cierres de entrega y el
 * asueto. Con `grupoId`, solo ese curso.
 */
export function hoyAlumno(datos: {
  cursos: { grupo: Grupo; matricula: string; agenda?: AgendaConEtiquetas }[];
  asesorias: Asesoria[];
  actividades: Pick<Actividad, "id" | "grupoId" | "titulo" | "envioHasta">[];
  ahora?: Date;
  fecha?: string;
  grupoId?: string;
}): ItemHoy[] {
  const hoy = datos.fecha ?? ahoraEnMexico(datos.ahora).fecha;
  const cursos = datos.cursos.filter((c) => !datos.grupoId || c.grupo.id === datos.grupoId);
  const items: ItemHoy[] = [];
  const asuetos = new Set(cursos.map((c) => asuetoDeAgenda(c.agenda, hoy)).filter((x): x is string => Boolean(x)));
  for (const nombre of asuetos) items.push({ inicio: INICIO_DIA, fin: FIN_DIA, tipo: "asueto", texto: nombre });
  // Las actividades comunes sin curso de un profesor salen una sola vez aunque el alumno lleve varios de sus cursos.
  const comunesVistas = new Set<string>();
  for (const { grupo, matricula, agenda } of cursos) {
    const curso = nombreCurso(grupo);
    const visible = (b: BloqueAgenda) => b.tipo !== "asueto" && b.tipo !== "asesoria" && (b.grupoId === grupo.id || (Boolean(b.comun) && !b.grupoId));
    for (const { bloque, inicio, fin } of tramosDelDia(agenda, hoy, visible)) {
      if (!bloque.grupoId) {
        const clave = `${grupo.profesorId}|${inicio}|${fin}|${bloque.tipo}|${bloque.titulo ?? ""}`;
        if (comunesVistas.has(clave)) continue;
        comunesVistas.add(clave);
      }
      items.push({
        inicio,
        fin,
        tipo: bloque.tipo,
        // La clase lleva el nombre del curso; lo demás, su nota o etiqueta.
        texto: bloque.tipo === "clase" && !bloque.titulo ? curso : bloque.titulo || nombreEtiqueta(agenda, bloque.etiqueta) || "",
        ...(bloque.tipo !== "clase" || bloque.titulo ? { detalle: curso } : {}),
        href: `/alumno/cursos/${grupo.id}`,
        grupoId: grupo.id,
        ...(bloque.comun ? { comun: true } : {}),
      });
    }
    for (const a of datos.asesorias.filter((x) => x.fecha === hoy && x.grupoId === grupo.id && x.matricula === matricula && x.estado === "agendada")) {
      items.push({ inicio: a.inicio, fin: a.inicio + a.duracion, tipo: "cita", texto: a.tema, detalle: curso, href: `/alumno/cursos/${grupo.id}/asesorias`, grupoId: grupo.id });
    }
  }
  for (const e of entregasEnFechas(datos.actividades, cursos.map((c) => c.grupo), [hoy])) {
    items.push({ inicio: e.cierre, tipo: "entrega", texto: e.titulo, detalle: e.curso, href: `/entregar/${e.actividadId}`, grupoId: e.grupoId });
  }
  return items.sort(porHora);
}

/** Semanas (lunes a viernes) del mes de esa fecha, para la vista de mes. */
export function semanasDelMes(fecha: string): string[][] {
  const mes = fecha.slice(0, 7);
  const ultimo = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const semanas: string[][] = [];
  for (let lunes = lunesDe(`${mes}-01`); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    const dias = fechasSemana(lunes);
    if (dias.some((d) => d.startsWith(mes))) semanas.push(dias);
  }
  return semanas;
}

/** Primer día del mes anterior y del siguiente (AAAA-MM-01). */
export function mesVecino(fecha: string, paso: number): string {
  const d = new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1 + paso, 1));
  return d.toISOString().slice(0, 10);
}
