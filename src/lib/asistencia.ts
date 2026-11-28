// Asistencia del curso: horario de clase, sesiones que salen de él entre las fechas del curso, la
// lista de cada sesión (asistencia, falta o retardo) y los resúmenes por alumno. Todo lo cuenta el
// código; no usa nada del servidor para poder probarlo.
import { fechaValida, lunesDe, sumarDias } from "./asesorias";
import type { ClaseHorario, EstadoAsistencia, Grupo, MarcaAsistencia, RegistroAsistencia } from "./tipos";

export const ESTADOS_ASISTENCIA: EstadoAsistencia[] = ["asistencia", "retardo", "falta"];
/** Días de la semana del horario: 1 = lunes … 7 = domingo. */
export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7] as const;
export const MAX_CLASES = 14;
/** Sin fechas del curso, la lista muestra estas semanas antes y después de hoy. */
const SEMANAS_ANTES = 8;
const SEMANAS_DESPUES = 2;

export class ErrorAsistencia extends Error {
  constructor(public clave: "horario" | "sesion" | "marcas" | "noEncontrado" | "consentimiento" | "rostro") {
    super(clave);
  }
}

// ---------- Horario ----------

const aMinutos = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string") {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (m && Number(m[1]) < 24 && Number(m[2]) < 60) return Number(m[1]) * 60 + Number(m[2]);
  }
  return undefined;
};

/**
 * Revisa el horario que manda el formulario: cada clase con día (1 a 7) y horas de inicio y fin
 * ("8:00" o minutos), fin después del inicio y sin clases encimadas el mismo día. Lo ordena.
 */
export function leerHorario(entrada: unknown): ClaseHorario[] {
  if (!Array.isArray(entrada) || entrada.length > MAX_CLASES) throw new ErrorAsistencia("horario");
  const clases = entrada.map((c) => {
    const x = (c ?? {}) as Record<string, unknown>;
    const dia = Number(x.dia);
    const inicio = aMinutos(x.inicio);
    const fin = aMinutos(x.fin);
    if (!Number.isInteger(dia) || dia < 1 || dia > 7 || inicio === undefined || fin === undefined) throw new ErrorAsistencia("horario");
    if (inicio < 0 || fin > 24 * 60 || fin <= inicio) throw new ErrorAsistencia("horario");
    return { dia, inicio, fin };
  });
  clases.sort((a, b) => a.dia - b.dia || a.inicio - b.inicio);
  for (let i = 1; i < clases.length; i++) {
    if (clases[i].dia === clases[i - 1].dia && clases[i].inicio < clases[i - 1].fin) throw new ErrorAsistencia("horario");
  }
  return clases;
}

/** 1 (cada semana) o 2 (cada dos semanas). */
export function leerFrecuencia(v: unknown): 1 | 2 {
  return Number(v) === 2 ? 2 : 1;
}

/** "8:00", "13:30" (formato de 24 horas, como en la agenda). */
export function horaTexto(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, "0")}`;
}

/** "08:00" para los campos de hora del formulario. */
export function horaCampo(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** Minutos de clase a la semana (en promedio, si es cada dos semanas). */
export function minutosPorSemana(horario: ClaseHorario[] | undefined, cadaSemanas: number = 1): number {
  return (horario ?? []).reduce((s, c) => s + c.fin - c.inicio, 0) / (cadaSemanas === 2 ? 2 : 1);
}

// ---------- Sesiones ----------

export interface SesionClase {
  /** "AAAA-MM-DD-HHMM", se usa en la dirección de la página de la sesión. */
  id: string;
  fecha: string;
  inicio: number;
  fin: number;
  /** Asueto oficial de esa fecha (la sesión se muestra, pero no se espera lista). */
  asueto?: string;
}

export function idSesion(fecha: string, inicio: number): string {
  return `${fecha}-${String(Math.floor(inicio / 60)).padStart(2, "0")}${String(inicio % 60).padStart(2, "0")}`;
}

/** Fecha e inicio de un id de sesión, o undefined si no es válido. */
export function leerIdSesion(id: string): { fecha: string; inicio: number } | undefined {
  const m = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/.exec(id);
  if (!m || !fechaValida(m[1])) return undefined;
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) return undefined;
  return { fecha: m[1], inicio: h * 60 + min };
}

/** Fechas que abarca la lista: las del curso o, sin ellas, unas semanas alrededor de hoy. */
export function periodoAsistencia(grupo: Pick<Grupo, "inicio" | "fin">, hoy: string): { desde: string; hasta: string } {
  const desde = grupo.inicio ?? lunesDe(sumarDias(hoy, -7 * SEMANAS_ANTES));
  const hasta = grupo.fin ?? sumarDias(hoy, 7 * SEMANAS_DESPUES);
  return { desde, hasta: hasta < desde ? desde : hasta };
}

/**
 * Sesiones del curso: cada clase del horario en cada semana del periodo (cada dos semanas si así
 * se configuró, contando desde la semana en que empieza el curso). Se agregan las sesiones que ya
 * tienen lista aunque el horario haya cambiado después, para no perderlas.
 */
export function sesionesDelCurso(
  grupo: Pick<Grupo, "id" | "inicio" | "fin" | "horario" | "cadaSemanas">,
  hoy: string,
  registros: RegistroAsistencia[] = [],
  asuetoDe: (fecha: string) => string | undefined = () => undefined,
): SesionClase[] {
  const { desde, hasta } = periodoAsistencia(grupo, hoy);
  const horario = grupo.horario ?? [];
  const cada = grupo.cadaSemanas === 2 ? 2 : 1;
  const sesiones = new Map<string, SesionClase>();
  if (horario.length) {
    const primerLunes = lunesDe(desde) > desde ? sumarDias(lunesDe(desde), -7) : lunesDe(desde);
    for (let lunes = primerLunes, semana = 0; lunes <= hasta; lunes = sumarDias(lunes, 7), semana++) {
      if (semana % cada) continue;
      for (const c of horario) {
        const fecha = sumarDias(lunes, c.dia - 1);
        if (fecha < desde || fecha > hasta) continue;
        const id = idSesion(fecha, c.inicio);
        const asueto = asuetoDe(fecha);
        sesiones.set(id, { id, fecha, inicio: c.inicio, fin: c.fin, ...(asueto ? { asueto } : {}) });
      }
    }
  }
  for (const r of registros) {
    if (r.grupoId !== grupo.id) continue;
    const id = idSesion(r.fecha, r.inicio);
    const ya = sesiones.get(id);
    sesiones.set(id, ya ? { ...ya, fin: r.fin } : { id, fecha: r.fecha, inicio: r.inicio, fin: r.fin });
  }
  return [...sesiones.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio);
}

/** La sesión del día (la que está en curso, si no la próxima, si no la última del día). */
export function sesionDeHoy(sesiones: SesionClase[], hoy: string, minutos: number): SesionClase | undefined {
  const deHoy = sesiones.filter((s) => s.fecha === hoy && !s.asueto);
  return deHoy.find((s) => minutos >= s.inicio && minutos < s.fin) ?? deHoy.find((s) => s.inicio > minutos) ?? deHoy.at(-1);
}

// ---------- Listas ----------

export function registroDe(registros: RegistroAsistencia[], grupoId: string, fecha: string, inicio: number): RegistroAsistencia | undefined {
  return registros.find((r) => r.grupoId === grupoId && r.fecha === fecha && r.inicio === inicio);
}

/**
 * Revisa las marcas que manda la lista: solo alumnos del curso, estados válidos y una marca por
 * alumno (la última manda). Los alumnos sin marca quedan sin marca.
 */
export function leerMarcas(grupo: Pick<Grupo, "alumnos">, entrada: unknown): MarcaAsistencia[] {
  if (!Array.isArray(entrada)) throw new ErrorAsistencia("marcas");
  const del = new Set(grupo.alumnos.map((a) => a.matricula));
  const marcas = new Map<string, EstadoAsistencia>();
  for (const x of entrada) {
    const m = (x ?? {}) as Record<string, unknown>;
    const matricula = typeof m.matricula === "string" ? m.matricula : "";
    const estado = m.estado as EstadoAsistencia;
    if (!del.has(matricula) || !ESTADOS_ASISTENCIA.includes(estado)) throw new ErrorAsistencia("marcas");
    marcas.set(matricula, estado);
  }
  return [...marcas].map(([matricula, estado]) => ({ matricula, estado }));
}

/** Pone el mismo estado a todos los alumnos (o solo a los que aún no tienen marca). */
export function marcarTodos(
  matriculas: string[],
  marcas: Record<string, EstadoAsistencia | undefined>,
  estado: EstadoAsistencia,
  soloSinMarca = false,
): Record<string, EstadoAsistencia | undefined> {
  const nuevas = { ...marcas };
  for (const m of matriculas) if (!soloSinMarca || !nuevas[m]) nuevas[m] = estado;
  return nuevas;
}

export interface ConteoAsistencia {
  asistencia: number;
  retardo: number;
  falta: number;
  /** Alumnos del curso sin marca en esa lista. */
  sinMarca: number;
}

/** Cuántos asistieron, llegaron tarde o faltaron en una lista (solo alumnos que siguen en el curso). */
export function conteoLista(grupo: Pick<Grupo, "alumnos">, registro: Pick<RegistroAsistencia, "marcas"> | undefined): ConteoAsistencia {
  const c: ConteoAsistencia = { asistencia: 0, retardo: 0, falta: 0, sinMarca: 0 };
  const marcas = new Map((registro?.marcas ?? []).map((m) => [m.matricula, m.estado]));
  for (const a of grupo.alumnos) {
    const e = marcas.get(a.matricula);
    if (e) c[e]++;
    else c.sinMarca++;
  }
  return c;
}

export interface ResumenAlumnoAsistencia extends ConteoAsistencia {
  matricula: string;
  nombre: string;
  /** Sesiones con lista en que el alumno tiene marca. */
  sesiones: number;
  /** % de asistencia: (asistencias + retardos) / sesiones con marca. null sin sesiones. */
  porcentaje: number | null;
}

/** % de asistencia (los retardos cuentan como asistencia). */
export function porcentajeAsistencia(c: Pick<ConteoAsistencia, "asistencia" | "retardo" | "falta">): number | null {
  const total = c.asistencia + c.retardo + c.falta;
  return total ? Math.round(((c.asistencia + c.retardo) / total) * 1000) / 10 : null;
}

/** Resumen de asistencia de cada alumno del curso, en orden alfabético. */
export function resumenPorAlumno(grupo: Pick<Grupo, "id" | "alumnos">, registros: RegistroAsistencia[], locale = "es"): ResumenAlumnoAsistencia[] {
  const del = registros.filter((r) => r.grupoId === grupo.id);
  return [...grupo.alumnos]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale))
    .map((a) => {
      const c: ConteoAsistencia = { asistencia: 0, retardo: 0, falta: 0, sinMarca: 0 };
      for (const r of del) {
        const e = r.marcas.find((m) => m.matricula === a.matricula)?.estado;
        if (e) c[e]++;
        else c.sinMarca++;
      }
      const sesiones = c.asistencia + c.retardo + c.falta;
      return { matricula: a.matricula, nombre: a.nombre, ...c, sesiones, porcentaje: porcentajeAsistencia(c) };
    });
}

export interface ResumenCursoAsistencia {
  /** Sesiones del horario que ya pasaron (sin asuetos), incluida la de hoy si ya empezó. */
  pasadas: number;
  /** De esas, cuántas tienen lista. */
  tomadas: number;
  /** Sesiones pasadas sin lista. */
  pendientes: number;
  /** % de asistencia del grupo en todas las listas. */
  porcentaje: number | null;
  retardos: number;
  faltas: number;
}

/** Resumen del curso: listas tomadas y pendientes y la asistencia promedio del grupo. */
export function resumenCurso(
  grupo: Pick<Grupo, "id" | "alumnos">,
  sesiones: SesionClase[],
  registros: RegistroAsistencia[],
  hoy: string,
  minutos: number,
): ResumenCursoAsistencia {
  const pasadas = sesiones.filter((s) => !s.asueto && (s.fecha < hoy || (s.fecha === hoy && s.inicio <= minutos)));
  const tomadas = pasadas.filter((s) => registroDe(registros, grupo.id, s.fecha, s.inicio)).length;
  const total = { asistencia: 0, retardo: 0, falta: 0 };
  for (const r of registros.filter((x) => x.grupoId === grupo.id)) {
    const c = conteoLista(grupo, r);
    total.asistencia += c.asistencia;
    total.retardo += c.retardo;
    total.falta += c.falta;
  }
  return {
    pasadas: pasadas.length,
    tomadas,
    pendientes: pasadas.length - tomadas,
    porcentaje: porcentajeAsistencia(total),
    retardos: total.retardo,
    faltas: total.falta,
  };
}

/** Cambia la matrícula de un alumno en sus listas y rostros (cambio de datos en la lista de alumnos). */
export function renombrarMatriculaAsistencia(
  db: { asistencias?: RegistroAsistencia[]; rostros?: { grupoId: string; matricula: string }[] },
  grupoId: string,
  antes: string,
  despues: string,
) {
  for (const r of db.asistencias ?? []) if (r.grupoId === grupoId) for (const m of r.marcas) if (m.matricula === antes) m.matricula = despues;
  for (const r of db.rostros ?? []) if (r.grupoId === grupoId && r.matricula === antes) r.matricula = despues;
}

/** Saca al alumno de las listas del curso y borra su rostro (baja del alumno). */
export function quitarAlumnoDeAsistencia(
  db: { asistencias?: RegistroAsistencia[]; rostros?: { grupoId: string; matricula: string }[] },
  grupoId: string,
  matricula: string,
) {
  for (const r of db.asistencias ?? []) if (r.grupoId === grupoId) r.marcas = r.marcas.filter((m) => m.matricula !== matricula);
  if (db.rostros) db.rostros = db.rostros.filter((r) => !(r.grupoId === grupoId && r.matricula === matricula));
}
