// Avisos (mensajes) dentro de cada curso: el profesor escribe a todo el grupo, a un equipo o a
// alumnos elegidos, y cada alumno escribe a su profesor. Aquí van las reglas y los conteos (leídos,
// sin leer, porcentajes); este módulo no usa nada del servidor para poder probarlo.
import type { Alumno, Aviso, BaseDeDatos, DestinoAviso, Grupo } from "./tipos";

/** Clave de lectura del profesor en `Aviso.leidos` (las de los alumnos son su matrícula). */
export const LECTOR_PROFESOR = "profesor";
/** Máximo de archivos anexos por aviso. */
export const MAX_ANEXOS_AVISO = 5;
export const MAX_ASUNTO = 120;
export const MAX_TEXTO = 5000;

export type ErrorAviso = "vacio" | "destino" | "sinDestinatarios" | "noEncontrado";

export class ErrorAvisoCurso extends Error {
  constructor(readonly clave: ErrorAviso) {
    super(clave);
  }
}

export interface EquipoDelCurso {
  proyectoId: string;
  equipoId: string;
  nombre: string;
  proyecto: string;
  matriculas: string[];
}

/** Equipos de los proyectos del curso (los equipos se arman en cada proyecto). */
export function equiposDelGrupo(db: Pick<BaseDeDatos, "proyectos">, grupoId: string): EquipoDelCurso[] {
  return (db.proyectos ?? [])
    .filter((p) => p.grupoId === grupoId)
    .flatMap((p) =>
      p.equipos
        .filter((e) => e.matriculas.length > 0)
        .map((e) => ({ proyectoId: p.id, equipoId: e.id, nombre: e.nombre, proyecto: p.titulo, matriculas: e.matriculas })),
    );
}

/** Limpia asunto y texto; exige texto o al menos un anexo. */
export function limpiarContenido(asunto: string, texto: string, anexos: number): { asunto: string; texto: string } {
  const a = asunto.replace(/\s+/g, " ").trim().slice(0, MAX_ASUNTO);
  const t = texto.replace(/\r\n/g, "\n").trim().slice(0, MAX_TEXTO);
  if (!t && anexos === 0) throw new ErrorAvisoCurso("vacio");
  return { asunto: a, texto: t };
}

/** Lee el destino que manda el formulario ("grupo", "equipo:<proyecto>:<equipo>", "alumnos:<m1>,<m2>"). */
export function leerDestino(valor: string): DestinoAviso | undefined {
  if (valor === "grupo") return { tipo: "grupo" };
  const equipo = valor.match(/^equipo:([^:]+):([^:]+)$/);
  if (equipo) return { tipo: "equipo", proyectoId: equipo[1], equipoId: equipo[2], nombre: "" };
  const alumnos = valor.match(/^alumnos:(.+)$/);
  if (alumnos) {
    const matriculas = [...new Set(alumnos[1].split(",").map((m) => m.trim()).filter(Boolean))];
    return matriculas.length ? { tipo: "alumnos", matriculas } : undefined;
  }
  return undefined;
}

/**
 * Destino del profesor ya revisado contra el curso y a qué matrículas llega. Solo cuentan los
 * alumnos que siguen en la lista del curso.
 */
export function resolverDestino(db: Pick<BaseDeDatos, "proyectos">, grupo: Grupo, destino: DestinoAviso): { destino: DestinoAviso; destinatarios: string[] } {
  const enLista = new Set(grupo.alumnos.map((a) => a.matricula));
  let destinatarios: string[];
  let final = destino;
  if (destino.tipo === "grupo") destinatarios = [...enLista];
  else if (destino.tipo === "equipo") {
    const equipo = equiposDelGrupo(db, grupo.id).find((e) => e.proyectoId === destino.proyectoId && e.equipoId === destino.equipoId);
    if (!equipo) throw new ErrorAvisoCurso("destino");
    final = { ...destino, nombre: equipo.nombre };
    destinatarios = equipo.matriculas.filter((m) => enLista.has(m));
  } else if (destino.tipo === "alumnos") {
    destinatarios = destino.matriculas.filter((m) => enLista.has(m));
    final = { tipo: "alumnos", matriculas: destinatarios };
  } else throw new ErrorAvisoCurso("destino");
  destinatarios = [...new Set(destinatarios)];
  if (!destinatarios.length) throw new ErrorAvisoCurso("sinDestinatarios");
  return { destino: final, destinatarios };
}

const recientePrimero = (a: Aviso, b: Aviso) => b.enviadoEn.localeCompare(a.enviadoEn);

/** Avisos del curso que ve el alumno: los que le llegaron y los que él escribió. */
export function avisosDelAlumno(avisos: Aviso[], grupoId: string, matricula: string): Aviso[] {
  return avisos
    .filter((a) => a.grupoId === grupoId && (a.destinatarios.includes(matricula) || (a.autor.tipo === "alumno" && a.autor.matricula === matricula)))
    .sort(recientePrimero);
}

/** Todos los avisos del curso (el profesor los ve todos). */
export function avisosDelGrupo(avisos: Aviso[], grupoId: string): Aviso[] {
  return avisos.filter((a) => a.grupoId === grupoId).sort(recientePrimero);
}

/** ¿El aviso le llegó a este lector y aún no lo abre? */
export function sinLeerPara(aviso: Aviso, lector: string): boolean {
  if (aviso.leidos[lector]) return false;
  if (lector === LECTOR_PROFESOR) return aviso.destino.tipo === "profesor";
  return aviso.destinatarios.includes(lector);
}

/** Avisos sin leer del alumno en un curso. */
export function sinLeerAlumno(avisos: Aviso[], grupoId: string, matricula: string): number {
  return avisos.filter((a) => a.grupoId === grupoId && sinLeerPara(a, matricula)).length;
}

/** Mensajes de alumnos que el profesor aún no abre en un curso. */
export function sinLeerProfesor(avisos: Aviso[], grupoId: string): number {
  return avisos.filter((a) => a.grupoId === grupoId && sinLeerPara(a, LECTOR_PROFESOR)).length;
}

/** ¿Puede este lector ver el aviso? (el profesor del curso, el autor o un destinatario). */
export function puedeVerAviso(aviso: Aviso, quien: { profesorDelCurso?: boolean; matricula?: string }): boolean {
  if (quien.profesorDelCurso) return true;
  const m = quien.matricula;
  if (!m) return false;
  return aviso.destinatarios.includes(m) || (aviso.autor.tipo === "alumno" && aviso.autor.matricula === m);
}

/** Marca el aviso como leído por el lector (si le llegó). Devuelve true si cambió. */
export function marcarLeido(aviso: Aviso, lector: string, fecha = new Date()): boolean {
  if (!sinLeerPara(aviso, lector)) return false;
  aviso.leidos[lector] = fecha.toISOString();
  return true;
}

export interface LecturaAviso {
  total: number;
  leidos: number;
  /** Porcentaje leído (0 a 100, entero). */
  porcentaje: number;
  /** Alumnos que ya lo abrieron (con la fecha) y los que no, en el orden de la lista del curso. */
  quienLeyo: { alumno: Alumno; fecha: string }[];
  pendientes: Alumno[];
}

/** Lectura de un aviso enviado por el profesor: cuántos y quiénes lo abrieron. */
export function lecturaAviso(aviso: Aviso, grupo: Grupo): LecturaAviso {
  const porMatricula = new Map(grupo.alumnos.map((a) => [a.matricula, a]));
  const quienLeyo: LecturaAviso["quienLeyo"] = [];
  const pendientes: Alumno[] = [];
  for (const m of aviso.destinatarios) {
    const alumno = porMatricula.get(m) ?? { matricula: m, nombre: m, correo: "" };
    const fecha = aviso.leidos[m];
    if (fecha) quienLeyo.push({ alumno, fecha });
    else pendientes.push(alumno);
  }
  const total = aviso.destinatarios.length;
  return { total, leidos: quienLeyo.length, porcentaje: porcentaje(quienLeyo.length, total), quienLeyo, pendientes };
}

function porcentaje(parte: number, total: number) {
  return total ? Math.round((parte / total) * 100) : 0;
}

export interface ResumenAvisosCurso {
  grupo: Grupo;
  enviados: number;
  /** Lecturas esperadas (suma de destinatarios de los avisos enviados) y las que ya ocurrieron. */
  entregas: number;
  lecturas: number;
  porcentaje: number;
  recibidos: number;
  recibidosSinLeer: number;
  ultimo?: string;
}

/** Estadísticas de avisos de cada curso del profesor y del total. */
export function resumenAvisos(avisos: Aviso[], grupos: Grupo[]): { cursos: ResumenAvisosCurso[]; total: Omit<ResumenAvisosCurso, "grupo" | "ultimo"> } {
  const cursos = grupos.map((grupo) => {
    const delCurso = avisos.filter((a) => a.grupoId === grupo.id);
    const enviados = delCurso.filter((a) => a.autor.tipo === "profesor");
    const recibidos = delCurso.filter((a) => a.destino.tipo === "profesor");
    const entregas = enviados.reduce((s, a) => s + a.destinatarios.length, 0);
    const lecturas = enviados.reduce((s, a) => s + a.destinatarios.filter((m) => a.leidos[m]).length, 0);
    return {
      grupo,
      enviados: enviados.length,
      entregas,
      lecturas,
      porcentaje: porcentaje(lecturas, entregas),
      recibidos: recibidos.length,
      recibidosSinLeer: recibidos.filter((a) => !a.leidos[LECTOR_PROFESOR]).length,
      ultimo: delCurso.map((a) => a.enviadoEn).sort().at(-1),
    };
  });
  const suma = (k: "enviados" | "entregas" | "lecturas" | "recibidos" | "recibidosSinLeer") => cursos.reduce((s, c) => s + c[k], 0);
  return {
    cursos,
    total: {
      enviados: suma("enviados"),
      entregas: suma("entregas"),
      lecturas: suma("lecturas"),
      porcentaje: porcentaje(suma("lecturas"), suma("entregas")),
      recibidos: suma("recibidos"),
      recibidosSinLeer: suma("recibidosSinLeer"),
    },
  };
}

/** Cambio de matrícula de un alumno (lista del curso): sus avisos pasan a la nueva. */
export function renombrarMatriculaAvisos(avisos: Aviso[] | undefined, grupoId: string, antes: string, nueva: string) {
  for (const a of avisos ?? []) {
    if (a.grupoId !== grupoId) continue;
    a.destinatarios = a.destinatarios.map((m) => (m === antes ? nueva : m));
    if (a.destino.tipo === "alumnos") a.destino.matriculas = a.destino.matriculas.map((m) => (m === antes ? nueva : m));
    if (a.autor.tipo === "alumno" && a.autor.matricula === antes) a.autor.matricula = nueva;
    if (a.leidos[antes]) {
      a.leidos[nueva] = a.leidos[antes];
      delete a.leidos[antes];
    }
  }
}

/**
 * Baja de un alumno del curso: se borran los avisos que escribió y los que eran solo para él, y sale
 * de los demás. Devuelve la lista nueva y las carpetas de anexos que hay que borrar.
 */
export function quitarAlumnoDeAvisos(avisos: Aviso[] | undefined, grupoId: string, matricula: string): { avisos: Aviso[]; carpetas: string[] } {
  const quedan: Aviso[] = [];
  const carpetas: string[] = [];
  for (const a of avisos ?? []) {
    if (a.grupoId !== grupoId) {
      quedan.push(a);
      continue;
    }
    const suyo = a.autor.tipo === "alumno" && a.autor.matricula === matricula;
    const soloSuyo = a.destino.tipo !== "grupo" && a.destinatarios.length > 0 && a.destinatarios.every((m) => m === matricula);
    if (suyo || soloSuyo) {
      if (a.anexos.length) carpetas.push(carpetaAviso(a.id));
      continue;
    }
    a.destinatarios = a.destinatarios.filter((m) => m !== matricula);
    if (a.destino.tipo === "alumnos") a.destino.matriculas = a.destino.matriculas.filter((m) => m !== matricula);
    delete a.leidos[matricula];
    quedan.push(a);
  }
  return { avisos: quedan, carpetas };
}

/** Carpeta de los anexos de un aviso dentro de la carpeta de datos. */
export function carpetaAviso(id: string) {
  return `avisos/${id}`;
}

/** Texto corto del aviso para la lista y el correo. */
export function extracto(texto: string, largo = 140): string {
  const plano = texto.replace(/\s+/g, " ").trim();
  return plano.length > largo ? `${plano.slice(0, largo - 1).trimEnd()}…` : plano;
}
