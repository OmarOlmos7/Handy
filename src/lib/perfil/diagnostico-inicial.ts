// Etapa 1 del perfil de aprendizaje (Modelo CREAR): diagnóstico inicial del alumno en un curso.
// Tres pasos: consentimiento informado, autodiagnóstico de los temas (la valoración inicial que ya
// existe) y la prueba de Stroop del semestre. Funciones puras sobre la base ya leída.
import { alumnoEnGrupo } from "../cuentas";
import type { AplicacionStroop, BaseDeDatos, CuentaAlumno, Grupo, MomentoStroop, ValoracionInicial } from "../tipos";
import { consentimientoVigente } from "./consentimiento";
import { aplicacionesDelSemestre, momentoPendiente, semestreDe } from "./stroop";

export type EstadoAutodiagnostico = "hecho" | "pendiente" | "sin_temario";

export interface DiagnosticoInicial {
  consentimiento: boolean;
  autodiagnostico: EstadoAutodiagnostico;
  semestre: string;
  stroop: Partial<Record<MomentoStroop, AplicacionStroop>>;
  /** Prueba que le toca presentar ahora, o null. */
  stroopPendiente: MomentoStroop | null;
  /** true si ya no le falta nada de lo que puede hacer ahora. */
  completo: boolean;
}

type Datos = Pick<BaseDeDatos, "consentimientosPerfil" | "stroop" | "valoraciones" | "grupos" | "asignaturas">;

/** Fechas de fin de los cursos del alumno (para abrir la prueba de cierre del semestre). */
export function finesDeCursos(grupos: Pick<Grupo, "fin">[]): (string | undefined)[] {
  return grupos.map((g) => g.fin);
}

function valoracionDe(valoraciones: ValoracionInicial[] | undefined, alumnoId: string, grupoId: string, asignaturaId: string | undefined) {
  return (valoraciones ?? []).find((v) => v.alumnoId === alumnoId && v.grupoId === grupoId && (!asignaturaId || v.asignaturaId === asignaturaId));
}

/**
 * Estado del diagnóstico inicial del alumno en el curso. `asignaturaId` es la asignatura (temario)
 * del curso, o undefined si el curso no tiene temario.
 */
export function diagnosticoInicial(
  db: Datos,
  alumnoId: string,
  grupoId: string,
  asignaturaId: string | undefined,
  ahora: Date,
  finesCursos: (string | undefined)[] = [],
): DiagnosticoInicial {
  const consentimiento = Boolean(consentimientoVigente(db.consentimientosPerfil, alumnoId));
  const autodiagnostico: EstadoAutodiagnostico = !asignaturaId ? "sin_temario" : valoracionDe(db.valoraciones, alumnoId, grupoId, asignaturaId) ? "hecho" : "pendiente";
  const semestre = semestreDe(ahora);
  const stroop = aplicacionesDelSemestre(db.stroop, alumnoId, semestre);
  const stroopPendiente = momentoPendiente(db.stroop, alumnoId, ahora, finesCursos);
  return {
    consentimiento,
    autodiagnostico,
    semestre,
    stroop,
    stroopPendiente,
    completo: consentimiento && autodiagnostico !== "pendiente" && stroopPendiente === null,
  };
}

export interface FilaDiagnostico {
  matricula: string;
  nombre: string;
  /** Cuenta del alumno, si ya la creó. */
  alumnoId?: string;
  diagnostico?: DiagnosticoInicial;
}

/**
 * Una fila por alumno del curso para la vista del profesor. Solo trae los datos del perfil de
 * quien dio su consentimiento; de los demás, solo que falta.
 */
export function filasDiagnostico(
  db: Datos & { cuentasAlumno: CuentaAlumno[] },
  grupo: Grupo,
  asignaturaId: string | undefined,
  ahora: Date,
): FilaDiagnostico[] {
  return grupo.alumnos.map((al) => {
    const cuenta = db.cuentasAlumno.find((c) => alumnoEnGrupo(grupo, c)?.matricula === al.matricula);
    if (!cuenta) return { matricula: al.matricula, nombre: al.nombre };
    const fines = finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta)));
    const diagnostico = diagnosticoInicial(db, cuenta.id, grupo.id, asignaturaId, ahora, fines);
    if (!diagnostico.consentimiento) return { matricula: al.matricula, nombre: al.nombre, alumnoId: cuenta.id, diagnostico: { ...diagnostico, stroop: {} } };
    return { matricula: al.matricula, nombre: al.nombre, alumnoId: cuenta.id, diagnostico };
  });
}

/** Cuántos alumnos del curso completaron cada paso. */
export function resumenGrupo(filas: FilaDiagnostico[]) {
  const con = filas.filter((f) => f.diagnostico?.consentimiento);
  return {
    alumnos: filas.length,
    consentimiento: con.length,
    autodiagnostico: con.filter((f) => f.diagnostico!.autodiagnostico === "hecho").length,
    stroopInicio: con.filter((f) => f.diagnostico!.stroop.inicio).length,
    stroopFin: con.filter((f) => f.diagnostico!.stroop.fin).length,
  };
}

/**
 * Lo que necesita la vista del perfil del grupo, tomado de la base completa pero solo de los
 * alumnos de ese curso: sus cuentas, consentimientos, pruebas de Stroop y valoraciones del curso.
 * De los demás cursos de cada alumno solo se usan las fechas de fin (para la prueba de cierre).
 */
export function datosPerfilGrupo(db: BaseDeDatos, grupo: Grupo): Datos & { cuentasAlumno: CuentaAlumno[] } {
  const cuentas = db.cuentasAlumno.filter((c) => alumnoEnGrupo(grupo, c));
  const ids = new Set(cuentas.map((c) => c.id));
  return {
    cuentasAlumno: cuentas,
    consentimientosPerfil: (db.consentimientosPerfil ?? []).filter((c) => ids.has(c.alumnoId)),
    stroop: (db.stroop ?? []).filter((a) => ids.has(a.alumnoId)),
    valoraciones: (db.valoraciones ?? []).filter((v) => v.grupoId === grupo.id),
    grupos: db.grupos.map((g) => ({ ...g, alumnos: g.alumnos.filter((a) => cuentas.some((c) => alumnoEnGrupo({ ...g, alumnos: [a] }, c))) })),
    asignaturas: [],
  };
}
