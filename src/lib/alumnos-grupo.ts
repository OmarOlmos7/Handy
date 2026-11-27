// Altas, cambios y bajas de alumnos en la lista de un curso (lo usa el profesor).
// Funciones puras sobre la base de datos: las acciones del servidor las envuelven.
import { correoValido, normalizarCorreo, normalizarMatricula } from "./cuentas";
import { quitarAlumnoDeAsesorias, renombrarMatriculaAsesorias } from "./asesorias";
import { quitarAlumnoDeAvisos, renombrarMatriculaAvisos } from "./avisos";
import type { Alumno, BaseDeDatos, Grupo } from "./tipos";

/** Motivos por los que no se puede guardar un alumno (los textos están en el diccionario). */
export type ErrorAlumno = "matricula" | "nombre" | "correo" | "matriculaRepetida" | "correoRepetido" | "noEncontrado";

export class ErrorAlumnoGrupo extends Error {
  constructor(public codigo: ErrorAlumno) {
    super(codigo);
  }
}

export interface DatosAlumno {
  matricula: string;
  nombre: string;
  correo?: string;
}

/** Limpia y valida los datos de un alumno. Lanza ErrorAlumnoGrupo si algo no sirve. */
export function limpiarAlumno(datos: DatosAlumno): Alumno {
  const matricula = normalizarMatricula(datos.matricula ?? "");
  const nombre = (datos.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const correo = normalizarCorreo(datos.correo ?? "");
  if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) throw new ErrorAlumnoGrupo("matricula");
  if (nombre.length < 3) throw new ErrorAlumnoGrupo("nombre");
  if (correo && !correoValido(correo)) throw new ErrorAlumnoGrupo("correo");
  return { matricula, nombre, correo };
}

function revisarDuplicados(grupo: Grupo, alumno: Alumno, excepto?: Alumno) {
  const otros = grupo.alumnos.filter((a) => a !== excepto);
  if (otros.some((a) => normalizarMatricula(a.matricula) === alumno.matricula)) throw new ErrorAlumnoGrupo("matriculaRepetida");
  if (alumno.correo && otros.some((a) => a.correo && normalizarCorreo(a.correo) === alumno.correo)) {
    throw new ErrorAlumnoGrupo("correoRepetido");
  }
}

function buscar(grupo: Grupo, matricula: string): Alumno {
  const m = normalizarMatricula(matricula);
  const alumno = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === m);
  if (!alumno) throw new ErrorAlumnoGrupo("noEncontrado");
  return alumno;
}

/** Da de alta a un alumno en el curso. */
export function altaAlumno(grupo: Grupo, datos: DatosAlumno): Alumno {
  const alumno = limpiarAlumno(datos);
  revisarDuplicados(grupo, alumno);
  grupo.alumnos.push(alumno);
  return alumno;
}

/**
 * Alta de varios alumnos pegados de una lista (una línea por alumno: "matrícula, nombre, correo").
 * Acepta comas, tabuladores o punto y coma. Devuelve cuántos entraron y qué líneas no.
 */
export function altaVarios(grupo: Grupo, lista: string): { agregados: number; fallidas: { linea: number; error: ErrorAlumno }[] } {
  let agregados = 0;
  const fallidas: { linea: number; error: ErrorAlumno }[] = [];
  lista.split(/\r?\n/).forEach((texto, i) => {
    if (!texto.trim()) return;
    const [matricula = "", nombre = "", correo = ""] = texto.split(/[,\t;]/).map((x) => x.trim());
    try {
      altaAlumno(grupo, { matricula, nombre, correo });
      agregados++;
    } catch (e) {
      if (!(e instanceof ErrorAlumnoGrupo)) throw e;
      fallidas.push({ linea: i + 1, error: e.codigo });
    }
  });
  return { agregados, fallidas };
}

/**
 * Cambia nombre, matrícula o correo de un alumno. Si cambia la matrícula, su trabajo en el curso
 * (entregas, autoestudio, valoración y tiempos) pasa a la matrícula nueva para no perderlo.
 */
export function cambiarAlumno(db: BaseDeDatos, grupo: Grupo, matriculaAnterior: string, datos: DatosAlumno): Alumno {
  const alumno = buscar(grupo, matriculaAnterior);
  const nuevo = limpiarAlumno(datos);
  revisarDuplicados(grupo, nuevo, alumno);
  const antes = alumno.matricula;
  if (nuevo.matricula !== antes) {
    const actividades = new Set(db.actividades.filter((a) => a.grupoId === grupo.id).map((a) => a.id));
    for (const e of db.entregas) if (actividades.has(e.actividadId) && e.matricula === antes) e.matricula = nuevo.matricula;
    for (const t of db.tiempos ?? []) if (actividades.has(t.actividadId) && t.matricula === antes) t.matricula = nuevo.matricula;
    for (const a of db.autoactividades ?? []) if (a.grupoId === grupo.id && a.matricula === antes) a.matricula = nuevo.matricula;
    for (const v of db.valoraciones ?? []) if (v.grupoId === grupo.id && v.matricula === antes) v.matricula = nuevo.matricula;
    renombrarMatriculaAvisos(db.avisos, grupo.id, antes, nuevo.matricula);
    renombrarMatriculaAsesorias(db.asesorias, grupo.id, antes, nuevo.matricula);
  }
  Object.assign(alumno, nuevo);
  return alumno;
}

/** Cuánto trabajo tiene el alumno en el curso (para avisar antes de darlo de baja). */
export function trabajoDelAlumno(db: BaseDeDatos, grupo: Grupo, matricula: string) {
  const actividades = new Set(db.actividades.filter((a) => a.grupoId === grupo.id).map((a) => a.id));
  return {
    entregas: db.entregas.filter((e) => actividades.has(e.actividadId) && e.matricula === matricula && e.estado !== "sin_entregar").length,
    autoactividades: (db.autoactividades ?? []).filter((a) => a.grupoId === grupo.id && a.matricula === matricula).length,
  };
}

/**
 * Da de baja al alumno: sale de la lista y se borra su trabajo en este curso (entregas,
 * calificaciones, autoestudio, valoración inicial y tiempos). Devuelve los archivos que hay que borrar
 * del disco. Su cuenta y sus otros cursos no cambian.
 */
export function bajaAlumno(db: BaseDeDatos, grupo: Grupo, matricula: string): { alumno: Alumno; archivos: string[] } {
  const alumno = buscar(grupo, matricula);
  const m = alumno.matricula;
  const actividades = new Set(db.actividades.filter((a) => a.grupoId === grupo.id).map((a) => a.id));
  const archivos: string[] = [];
  const suya = (e: { actividadId: string; matricula: string }) => actividades.has(e.actividadId) && e.matricula === m;
  for (const e of db.entregas.filter(suya)) {
    archivos.push(...(e.imagenes ?? []));
    if (e.pdf) archivos.push(e.pdf);
    for (const r of e.respuestas ?? []) archivos.push(...(r.archivos ?? []));
    // Carpeta de sus hojas en cada actividad (solo si la matrícula es un nombre de carpeta seguro).
    if (/^[A-Z0-9-]+$/.test(m)) archivos.push(`actividades/${e.actividadId}/entregas/${m}`);
  }
  const autoSuya = (a: { grupoId: string; matricula: string }) => a.grupoId === grupo.id && a.matricula === m;
  for (const a of (db.autoactividades ?? []).filter(autoSuya)) archivos.push(...(a.archivos ?? []));
  db.entregas = db.entregas.filter((e) => !suya(e));
  if (db.tiempos) db.tiempos = db.tiempos.filter((t) => !suya(t));
  if (db.autoactividades) db.autoactividades = db.autoactividades.filter((a) => !autoSuya(a));
  if (db.valoraciones) db.valoraciones = db.valoraciones.filter((v) => !(v.grupoId === grupo.id && v.matricula === m));
  // Avisos que escribió o que eran solo para él (con sus anexos); de los demás sale.
  if (db.avisos) {
    const avisos = quitarAlumnoDeAvisos(db.avisos, grupo.id, m);
    db.avisos = avisos.avisos;
    archivos.push(...avisos.carpetas);
  }
  if (db.asesorias) db.asesorias = quitarAlumnoDeAsesorias(db.asesorias, grupo.id, m);
  grupo.alumnos = grupo.alumnos.filter((a) => a !== alumno);
  // Solo rutas dentro de la carpeta de datos, sin "..".
  return { alumno, archivos: [...new Set(archivos)].filter((r) => r && !r.split(/[\\/]/).includes("..") && !/^[\\/]/.test(r)) };
}

/** ¿El alumno ya tiene cuenta para ver sus resultados? (por su correo, entre los correos con cuenta). */
export function tieneCuenta(correosConCuenta: Set<string>, alumno: Alumno): boolean {
  return Boolean(alumno.correo) && correosConCuenta.has(normalizarCorreo(alumno.correo));
}

/** Filas de la lista de alumnos del curso, en orden alfabético, con su cuenta y su trabajo. */
export function filasAlumnos(db: BaseDeDatos, grupo: Grupo, correosConCuenta: Set<string>, locale = "es") {
  return [...grupo.alumnos]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale))
    .map((a) => ({ ...a, correo: a.correo ?? "", cuenta: tieneCuenta(correosConCuenta, a), ...trabajoDelAlumno(db, grupo, a.matricula) }));
}
