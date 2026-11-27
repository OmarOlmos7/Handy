// Agenda semanal del profesor y asesorías con sus alumnos. Aquí van las reglas (franjas de 30 min de
// lunes a viernes, de 7:00 a 18:00, en hora del centro de México), la disponibilidad y los resúmenes
// del curso. No usa nada del servidor para poder probarlo.
import { asuetoEn } from "./asuetos";
import type { AgendaProfesor, Asesoria, BloqueAgenda, Grupo, TipoBloque } from "./tipos";

export const MINUTOS_FRANJA = 30;
export const INICIO_DIA = 7 * 60;
export const FIN_DIA = 18 * 60;
/** Franjas del día: 7:00, 7:30, … 17:30 (la última termina a las 18:00). */
export const FRANJAS = Array.from({ length: (FIN_DIA - INICIO_DIA) / MINUTOS_FRANJA }, (_, i) => INICIO_DIA + i * MINUTOS_FRANJA);
/** Días de la agenda: 1 = lunes … 5 = viernes. */
export const DIAS = [1, 2, 3, 4, 5] as const;
/** Tipos que bloquean la agenda (no se puede atender) y el de asesoría. */
export const TIPOS_BLOQUEO = ["clase", "comida", "proyecto", "reunion", "evento", "vacaciones", "otro"] as const;
export const TIPOS_AGENDA: TipoBloque[] = [...TIPOS_BLOQUEO, "asesoria"];
/** Duraciones que puede pedir el alumno (minutos). */
export const DURACIONES = [30, 60] as const;
/** Asesorías por venir que puede tener un alumno en un curso al mismo tiempo. */
export const MAX_PENDIENTES_ALUMNO = 3;
/** Hora (minutos) desde la que sale el recordatorio del día. */
export const HORA_RECORDATORIO = 6 * 60 + 30;
export const MAX_TEMA = 120;
export const MAX_COMENTARIOS = 1500;
export const MAX_NOTAS = 3000;
export const MAX_TITULO_BLOQUE = 60;
export const MOTIVOS = ["problema", "entrevista", "equipo", "dudas", "otro"] as const;
export type Motivo = (typeof MOTIVOS)[number];

/** El centro de México no cambia de horario desde 2022: siempre UTC−6. */
const DESFASE_MS = 6 * 3_600_000;

export type ErrorAsesoria = "franja" | "pasada" | "fueraDelCurso" | "ocupada" | "tema" | "limite" | "noEncontrada" | "cerrada" | "empezada" | "fechas" | "agenda";

export class ErrorAsesoriaCurso extends Error {
  constructor(readonly clave: ErrorAsesoria) {
    super(clave);
  }
}

// ---------- Fechas ----------

const esFecha = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(`${f}T00:00:00Z`));

/** Fecha AAAA-MM-DD válida o undefined. */
export function fechaValida(f: unknown): string | undefined {
  return typeof f === "string" && esFecha(f) ? f : undefined;
}

function aUtc(fecha: string) {
  return new Date(`${fecha}T00:00:00Z`);
}
function deUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUtc(d);
}

/** Día de la semana de una fecha: 1 = lunes … 7 = domingo. */
export function diaSemana(fecha: string): number {
  const d = aUtc(fecha).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Lunes de la semana de la fecha (el sábado y el domingo pasan a la semana siguiente). */
export function lunesDe(fecha: string): string {
  const d = diaSemana(fecha);
  return d >= 6 ? sumarDias(fecha, 8 - d) : sumarDias(fecha, 1 - d);
}

/** Las cinco fechas (lunes a viernes) de la semana que empieza en `lunes`. */
export function fechasSemana(lunes: string): string[] {
  return DIAS.map((d) => sumarDias(lunes, d - 1));
}

/** Fecha y minutos del día en el centro de México. */
export function ahoraEnMexico(ahora: Date = new Date()): { fecha: string; minutos: number } {
  const local = new Date(ahora.getTime() - DESFASE_MS);
  return { fecha: deUtc(local), minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** Instante (ISO) de una fecha y hora del centro de México. */
export function instante(fecha: string, minutos: number): string {
  return new Date(aUtc(fecha).getTime() + minutos * 60_000 + DESFASE_MS).toISOString();
}

/** "7:00", "13:30". */
export function hora(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`;
}

/** "1 h 30 min", "45 min", "2 h". */
export function duracionTexto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** ¿La fecha cae dentro de las fechas del curso? (sin fechas, siempre). */
export function dentroDelCurso(grupo: Pick<Grupo, "inicio" | "fin">, fecha: string): boolean {
  return (!grupo.inicio || fecha >= grupo.inicio) && (!grupo.fin || fecha <= grupo.fin);
}

/** Revisa las fechas de inicio y fin del curso (vacío = sin fecha). */
export function leerFechasCurso(inicio: string, fin: string): { inicio?: string; fin?: string } {
  const i = inicio.trim();
  const f = fin.trim();
  if ((i && !esFecha(i)) || (f && !esFecha(f))) throw new ErrorAsesoriaCurso("fechas");
  if (i && f && f < i) throw new ErrorAsesoriaCurso("fechas");
  return { ...(i ? { inicio: i } : {}), ...(f ? { fin: f } : {}) };
}

// ---------- Agenda ----------

/** Celda de la agenda en el editor: un día (de cada semana) o una fecha, y la hora. */
export interface CeldaAgenda {
  dia?: number;
  fecha?: string;
  inicio: number;
  tipo: TipoBloque;
  titulo?: string;
  /** Solo en las de cada semana: fechas en que valen y curso al que pertenecen. */
  desde?: string;
  hasta?: string;
  grupoId?: string;
  etiqueta?: string;
  comun?: boolean;
}

/** Clave del "renglón" de la celda: la fecha, o el día de la semana con sus fechas de validez. */
const claveDe = (b: { dia?: number; fecha?: string; desde?: string; hasta?: string }) => (b.fecha ? `f:${b.fecha}` : `d:${b.dia}|${b.desde ?? ""}|${b.hasta ?? ""}`);
const mismoContenido = (a: Omit<CeldaAgenda, "inicio">, b: Omit<CeldaAgenda, "inicio">) =>
  a.tipo === b.tipo && a.titulo === b.titulo && a.grupoId === b.grupoId && a.etiqueta === b.etiqueta && Boolean(a.comun) === Boolean(b.comun);

/** ¿Se enciman dos rangos de fechas? (sin fecha = sin límite). */
export function rangosSeEnciman(a: { desde?: string; hasta?: string }, b: { desde?: string; hasta?: string }) {
  return (a.desde ?? "") <= (b.hasta ?? "9999-12-31") && (b.desde ?? "") <= (a.hasta ?? "9999-12-31");
}

/** ¿El bloque de cada semana vale en esa fecha? */
export function vigente(b: { desde?: string; hasta?: string }, fecha: string) {
  return (!b.desde || fecha >= b.desde) && (!b.hasta || fecha <= b.hasta);
}

type Rango = { desde?: string; hasta?: string };

/** Quita a un bloque de cada semana las fechas de r: queda igual, en un pedazo, en dos o en nada. */
export function restarRango<T extends Rango>(c: T, r: Rango): T[] {
  if (!rangosSeEnciman(c, r)) return [c];
  const piezas: T[] = [];
  if (r.desde && (!c.desde || c.desde < r.desde)) piezas.push({ ...c, hasta: sumarDias(r.desde, -1) });
  if (r.hasta && (!c.hasta || c.hasta > r.hasta)) piezas.push({ ...c, desde: sumarDias(r.hasta, 1) });
  return piezas;
}

/**
 * Pinta (o borra, sin `nuevo`) una franja del horario de cada semana solo entre las fechas del rango:
 * lo que había en esas fechas se reemplaza y lo de otras fechas se conserva.
 */
export function pintarSemanal(
  celdas: CeldaAgenda[],
  dia: number,
  inicio: number,
  rango: Rango,
  nuevo?: Pick<CeldaAgenda, "tipo" | "titulo" | "grupoId" | "etiqueta" | "comun">,
): CeldaAgenda[] {
  let desde = rango.desde || undefined;
  let hasta = rango.hasta || undefined;
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde];
  const r = { desde, hasta };
  const aqui = (c: CeldaAgenda) => c.dia === dia && c.inicio === inicio && !c.fecha;
  return [
    ...celdas.filter((c) => !aqui(c)),
    ...celdas.filter(aqui).flatMap((c) => restarRango(c, r)),
    ...(nuevo ? [{ dia, inicio, ...nuevo, ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) }] : []),
  ];
}

const TIPOS_VALIDOS = new Set<TipoBloque>([...TIPOS_BLOQUEO, "personal", "asesoria", "libre"]);

/** Une celdas seguidas del mismo tipo, nota, curso y fechas en bloques (lo que se guarda). */
export function bloquesDeCeldas(celdas: CeldaAgenda[]): BloqueAgenda[] {
  const limpias = celdas
    .filter((c) => TIPOS_VALIDOS.has(c.tipo) && FRANJAS.includes(c.inicio) && (c.fecha ? esFecha(c.fecha) && diaSemana(c.fecha) <= 5 : DIAS.includes(c.dia as 1)))
    .filter((c) => (c.fecha ? true : c.tipo !== "libre"))
    .filter((c) => c.tipo !== "personal" || Boolean(c.etiqueta))
    .map((c) => {
      const desde = !c.fecha && c.desde && esFecha(c.desde) ? c.desde : undefined;
      const hasta = !c.fecha && c.hasta && esFecha(c.hasta) ? c.hasta : undefined;
      return {
        ...c,
        titulo: c.titulo?.replace(/\s+/g, " ").trim().slice(0, MAX_TITULO_BLOQUE) || undefined,
        desde: desde && hasta && desde > hasta ? hasta : desde,
        hasta: desde && hasta && desde > hasta ? desde : hasta,
        grupoId: c.grupoId || undefined,
        etiqueta: c.tipo === "personal" ? c.etiqueta : undefined,
        // Solo lo que se puede publicar (no la comida ni las franjas de asesoría).
        comun: c.comun && c.tipo !== "asesoria" && c.tipo !== "libre" && c.tipo !== "comida" ? true : undefined,
      };
    });
  // Una celda por renglón y hora (la última manda).
  const unicas = new Map(limpias.map((c) => [`${claveDe(c)}|${c.inicio}`, c]));
  const orden = [...unicas.values()].sort((a, b) => claveDe(a).localeCompare(claveDe(b)) || a.inicio - b.inicio);
  const bloques: BloqueAgenda[] = [];
  for (const c of orden) {
    const ultimo = bloques.at(-1);
    if (ultimo && claveDe(ultimo) === claveDe(c) && ultimo.fin === c.inicio && mismoContenido(ultimo, c)) {
      ultimo.fin += MINUTOS_FRANJA;
      continue;
    }
    bloques.push({
      tipo: c.tipo,
      ...(c.fecha ? { fecha: c.fecha } : { dia: c.dia }),
      inicio: c.inicio,
      fin: c.inicio + MINUTOS_FRANJA,
      ...(c.titulo ? { titulo: c.titulo } : {}),
      ...(c.desde ? { desde: c.desde } : {}),
      ...(c.hasta ? { hasta: c.hasta } : {}),
      ...(c.grupoId ? { grupoId: c.grupoId } : {}),
      ...(c.etiqueta ? { etiqueta: c.etiqueta } : {}),
      ...(c.comun ? { comun: true } : {}),
    });
  }
  return bloques;
}

/** Separa los bloques en celdas de 30 minutos (para el editor). */
export function celdasDeBloques(bloques: BloqueAgenda[]): CeldaAgenda[] {
  return bloques.flatMap((b) =>
    FRANJAS.filter((f) => f >= b.inicio && f < b.fin).map((inicio) => ({
      ...(b.fecha ? { fecha: b.fecha } : { dia: b.dia }),
      inicio,
      tipo: b.tipo,
      ...(b.titulo ? { titulo: b.titulo } : {}),
      ...(b.desde ? { desde: b.desde } : {}),
      ...(b.hasta ? { hasta: b.hasta } : {}),
      ...(b.grupoId ? { grupoId: b.grupoId } : {}),
      ...(b.etiqueta ? { etiqueta: b.etiqueta } : {}),
      ...(b.comun ? { comun: true } : {}),
    })),
  );
}

/**
 * Nueva agenda al guardar una semana del editor: los bloques de cada semana se reemplazan por
 * completo y los de una sola fecha solo en las fechas de esa semana.
 */
export function agendaNueva(anteriores: BloqueAgenda[], semanales: CeldaAgenda[], deLaSemana: CeldaAgenda[], fechas: string[]): BloqueAgenda[] {
  const enSemana = new Set(fechas);
  const otrasFechas = anteriores.filter((b) => b.fecha && !enSemana.has(b.fecha));
  return [
    ...bloquesDeCeldas(semanales.map((c) => ({ ...c, fecha: undefined }))),
    ...bloquesDeCeldas(deLaSemana.filter((c) => c.fecha && enSemana.has(c.fecha)).map((c) => ({ ...c, desde: undefined, hasta: undefined }))),
    ...otrasFechas,
  ];
}

export type AgendaConAsuetos = Pick<AgendaProfesor, "bloques"> & Partial<Pick<AgendaProfesor, "pais" | "asuetos">>;

/** Asueto oficial de esa fecha según el país de la agenda (si los asuetos están activos). */
export function asuetoDeAgenda(agenda: AgendaConAsuetos | undefined, fecha: string): string | undefined {
  if (agenda?.asuetos === false) return undefined;
  return asuetoEn(agenda?.pais, fecha);
}

/**
 * Qué hay en la agenda en una fecha y hora. Manda lo marcado para esa fecha; luego el asueto
 * oficial (todo el día); al final lo de cada semana que esté vigente en esa fecha.
 */
export function bloqueEn(agenda: AgendaConAsuetos | undefined, fecha: string, minutos: number): BloqueAgenda | undefined {
  if (!agenda) return undefined;
  const cubre = (b: BloqueAgenda) => minutos >= b.inicio && minutos < b.fin;
  const deFecha = agenda.bloques.find((b) => b.fecha === fecha && cubre(b));
  if (deFecha) return deFecha.tipo === "libre" ? undefined : deFecha;
  const asueto = asuetoDeAgenda(agenda, fecha);
  if (asueto) return { tipo: "asueto", fecha, inicio: INICIO_DIA, fin: FIN_DIA, titulo: asueto };
  const dia = diaSemana(fecha);
  return agenda.bloques.findLast((b) => !b.fecha && b.dia === dia && cubre(b) && vigente(b, fecha));
}

/** Borra los bloques de una sola fecha que ya pasaron (para que la agenda no crezca sin fin). */
export function podarAgenda(bloques: BloqueAgenda[], hoy: string): BloqueAgenda[] {
  const limite = sumarDias(hoy, -14);
  return bloques.filter((b) => !b.fecha || b.fecha >= limite);
}

/** Minutos de asesoría que ofrece el profesor en una semana. */
export function minutosDisponibles(agenda: AgendaConAsuetos | undefined, fechas: string[]): number {
  return fechas.reduce((s, f) => s + FRANJAS.filter((m) => bloqueEn(agenda, f, m)?.tipo === "asesoria").length * MINUTOS_FRANJA, 0);
}

// ---------- Asesorías ----------

export const activa = (a: Pick<Asesoria, "estado">) => a.estado === "agendada" || a.estado === "realizada";

/** ¿Se cruza con otra asesoría activa del mismo profesor? */
export function seCruza(asesorias: Asesoria[], profesorId: string, fecha: string, inicio: number, duracion: number, excepto?: string): Asesoria | undefined {
  return asesorias.find(
    (a) => a.id !== excepto && a.profesorId === profesorId && a.fecha === fecha && activa(a) && a.inicio < inicio + duracion && inicio < a.inicio + a.duracion,
  );
}

/** Revisa si el alumno puede tomar esa franja; lanza el motivo si no. */
export function revisarFranja(
  datos: { agenda?: AgendaConAsuetos; asesorias: Asesoria[]; grupo: Pick<Grupo, "id" | "profesorId" | "inicio" | "fin">; matricula: string },
  fecha: string,
  inicio: number,
  duracion: number,
  ahora: Date = new Date(),
) {
  if (!esFecha(fecha) || diaSemana(fecha) > 5 || !FRANJAS.includes(inicio) || !(DURACIONES as readonly number[]).includes(duracion) || inicio + duracion > FIN_DIA)
    throw new ErrorAsesoriaCurso("franja");
  const hoy = ahoraEnMexico(ahora);
  if (fecha < hoy.fecha || (fecha === hoy.fecha && inicio <= hoy.minutos)) throw new ErrorAsesoriaCurso("pasada");
  if (!dentroDelCurso(datos.grupo, fecha)) throw new ErrorAsesoriaCurso("fueraDelCurso");
  for (let m = inicio; m < inicio + duracion; m += MINUTOS_FRANJA) {
    if (bloqueEn(datos.agenda, fecha, m)?.tipo !== "asesoria") throw new ErrorAsesoriaCurso("franja");
  }
  if (seCruza(datos.asesorias, datos.grupo.profesorId ?? "", fecha, inicio, duracion)) throw new ErrorAsesoriaCurso("ocupada");
  const pendientes = datos.asesorias.filter((a) => a.grupoId === datos.grupo.id && a.matricula === datos.matricula && a.estado === "agendada" && !yaPaso(a, ahora));
  if (pendientes.length >= MAX_PENDIENTES_ALUMNO) throw new ErrorAsesoriaCurso("limite");
}

/** Limpia tema, motivo y comentarios del alumno; el tema es obligatorio. */
export function limpiarSolicitud(tema: string, motivo: string, comentarios: string): { tema: string; motivo?: Motivo; comentarios: string } {
  const t = tema.replace(/\s+/g, " ").trim().slice(0, MAX_TEMA);
  if (!t) throw new ErrorAsesoriaCurso("tema");
  const m = (MOTIVOS as readonly string[]).includes(motivo) ? (motivo as Motivo) : undefined;
  return { tema: t, ...(m ? { motivo: m } : {}), comentarios: comentarios.replace(/\r\n/g, "\n").trim().slice(0, MAX_COMENTARIOS) };
}

/** ¿Ya terminó la hora de la asesoría? */
export function yaPaso(a: Pick<Asesoria, "fecha" | "inicio" | "duracion">, ahora: Date = new Date()): boolean {
  return Date.parse(instante(a.fecha, a.inicio + a.duracion)) <= ahora.getTime();
}

/** ¿Ya empezó? (el alumno ya no la puede cancelar). */
export function yaEmpezo(a: Pick<Asesoria, "fecha" | "inicio">, ahora: Date = new Date()): boolean {
  return Date.parse(instante(a.fecha, a.inicio)) <= ahora.getTime();
}

/** Minutos que cuentan de una asesoría realizada. */
export function minutosDe(a: Pick<Asesoria, "duracion" | "duracionReal">): number {
  return a.duracionReal ?? a.duracion;
}

const ordenFecha = (a: Asesoria, b: Asesoria) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio;

/** Asesorías de un curso (y de un alumno, si se da la matrícula), de la más antigua a la más nueva. */
export function asesoriasDelCurso(asesorias: Asesoria[], grupoId: string, matricula?: string): Asesoria[] {
  return asesorias.filter((a) => a.grupoId === grupoId && (!matricula || a.matricula === matricula)).sort(ordenFecha);
}

export interface ResumenAsesorias {
  realizadas: number;
  minutos: number;
  /** Agendadas que aún no pasan. */
  proximas: number;
  /** Agendadas cuya hora ya pasó y el profesor no ha registrado. */
  porRegistrar: number;
  noAsistio: number;
  canceladas: number;
  /** Alumnos distintos atendidos (con al menos una realizada). */
  alumnos: number;
  /** Minutos promedio por asesoría realizada (0 si no hay). */
  promedio: number;
}

/**
 * Resumen de asesorías durante la impartición del curso (entre su inicio y su fin, si los tiene):
 * cuántas y cuánto tiempo. Con matrícula, solo las de ese alumno.
 */
export function resumenAsesorias(asesorias: Asesoria[], grupo: Pick<Grupo, "id" | "inicio" | "fin">, matricula?: string, ahora: Date = new Date()): ResumenAsesorias {
  const del = asesoriasDelCurso(asesorias, grupo.id, matricula).filter((a) => dentroDelCurso(grupo, a.fecha));
  const realizadas = del.filter((a) => a.estado === "realizada");
  const minutos = realizadas.reduce((s, a) => s + minutosDe(a), 0);
  const agendadas = del.filter((a) => a.estado === "agendada");
  return {
    realizadas: realizadas.length,
    minutos,
    proximas: agendadas.filter((a) => !yaPaso(a, ahora)).length,
    porRegistrar: agendadas.filter((a) => yaPaso(a, ahora)).length,
    noAsistio: del.filter((a) => a.estado === "no_asistio").length,
    canceladas: del.filter((a) => a.estado === "cancelada").length,
    alumnos: new Set(realizadas.map((a) => a.matricula)).size,
    promedio: realizadas.length ? Math.round(minutos / realizadas.length) : 0,
  };
}

/** Realizadas y minutos de cada alumno del curso (para la tabla del profesor), con más tiempo primero. */
export function asesoriasPorAlumno(asesorias: Asesoria[], grupo: Grupo): { matricula: string; nombre: string; realizadas: number; minutos: number; ultima?: string }[] {
  const del = asesoriasDelCurso(asesorias, grupo.id).filter((a) => a.estado === "realizada" && dentroDelCurso(grupo, a.fecha));
  return grupo.alumnos
    .map((al) => {
      const suyas = del.filter((a) => a.matricula === al.matricula);
      return { matricula: al.matricula, nombre: al.nombre, realizadas: suyas.length, minutos: suyas.reduce((s, a) => s + minutosDe(a), 0), ultima: suyas.at(-1)?.fecha };
    })
    .filter((x) => x.realizadas > 0)
    .sort((a, b) => b.minutos - a.minutos || a.nombre.localeCompare(b.nombre));
}

/** Registro del profesor al cerrar una asesoría: qué pasó, lo revisado, acuerdos y minutos reales. */
export function cerrarAsesoria(a: Asesoria, datos: { estado: "realizada" | "no_asistio"; revisado: string; acuerdos: string; minutos?: number }, ahora: Date = new Date()) {
  if (a.estado === "cancelada") throw new ErrorAsesoriaCurso("cerrada");
  a.estado = datos.estado;
  a.revisado = datos.revisado.replace(/\r\n/g, "\n").trim().slice(0, MAX_NOTAS) || undefined;
  a.acuerdos = datos.acuerdos.replace(/\r\n/g, "\n").trim().slice(0, MAX_NOTAS) || undefined;
  const m = Math.round(Number(datos.minutos));
  if (datos.estado === "realizada" && Number.isFinite(m) && m > 0 && m <= 240 && m !== a.duracion) a.duracionReal = m;
  else delete a.duracionReal;
  a.cerradaEn = ahora.toISOString();
}

/** Estado de cada franja para el alumno en una semana. */
export type FranjaAlumno = "libre" | "mia" | "ocupada" | "no" | "pasada" | "fuera";

/**
 * Cómo ve el alumno la agenda de su profesor: solo si una franja está libre para asesoría, ocupada
 * o no disponible (no ve si es clase, comida o reunión).
 */
export function semanaParaAlumno(
  datos: { agenda?: AgendaConAsuetos; asesorias: Asesoria[]; grupo: Pick<Grupo, "id" | "profesorId" | "inicio" | "fin">; matricula: string },
  fechas: string[],
  ahora: Date = new Date(),
): Record<string, FranjaAlumno[]> {
  const hoy = ahoraEnMexico(ahora);
  const delProfesor = datos.asesorias.filter((a) => a.profesorId === datos.grupo.profesorId && activa(a));
  return Object.fromEntries(
    fechas.map((fecha) => [
      fecha,
      FRANJAS.map((m): FranjaAlumno => {
        const cita = delProfesor.find((a) => a.fecha === fecha && m >= a.inicio && m < a.inicio + a.duracion);
        if (cita) return cita.grupoId === datos.grupo.id && cita.matricula === datos.matricula ? "mia" : "ocupada";
        if (fecha < hoy.fecha || (fecha === hoy.fecha && m <= hoy.minutos)) return "pasada";
        if (!dentroDelCurso(datos.grupo, fecha)) return "fuera";
        return bloqueEn(datos.agenda, fecha, m)?.tipo === "asesoria" ? "libre" : "no";
      }),
    ]),
  );
}

/** Asesorías de hoy que todavía no tienen recordatorio y aún no empiezan (desde las 6:30). */
export function pendientesDeRecordatorio(asesorias: Asesoria[], ahora: Date = new Date()): Asesoria[] {
  const hoy = ahoraEnMexico(ahora);
  if (hoy.minutos < HORA_RECORDATORIO) return [];
  return asesorias.filter((a) => a.estado === "agendada" && !a.recordatorio && a.fecha === hoy.fecha && a.inicio > hoy.minutos);
}

/** Cambio de matrícula de un alumno en la lista del curso: sus asesorías pasan a la nueva. */
export function renombrarMatriculaAsesorias(asesorias: Asesoria[] | undefined, grupoId: string, antes: string, nueva: string) {
  for (const a of asesorias ?? []) if (a.grupoId === grupoId && a.matricula === antes) a.matricula = nueva;
}

/** Baja del alumno: se borran sus asesorías en ese curso. */
export function quitarAlumnoDeAsesorias(asesorias: Asesoria[] | undefined, grupoId: string, matricula: string): Asesoria[] {
  return (asesorias ?? []).filter((a) => !(a.grupoId === grupoId && a.matricula === matricula));
}
