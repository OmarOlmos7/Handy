// Proyectos (retos) por etapas con evaluación de varios profesores. Cada profesor evaluador
// califica con su propia copia de la rúbrica de la etapa, sin ver la de los demás; la calificación
// del alumno en la etapa es el promedio de los evaluadores que terminaron. La nota del proyecto
// pondera las etapas. Todos los números los calcula este módulo (la IA solo propone rúbricas y
// sugerencias de evaluación). No usa nada del servidor: lo comparten páginas, rutas y pruebas.
import type {
  Actividad,
  Alumno,
  Entrega,
  CriterioProyecto,
  EntregaProyecto,
  EquipoProyecto,
  EtapaProyecto,
  EvaluacionProyecto,
  Proyecto,
  TipoEtapaProyecto,
} from "./tipos";

export const TIPOS_ETAPA: TipoEtapaProyecto[] = ["reporte", "oral_grupal", "entrevista", "demostracion"];

export const ICONO_ETAPA: Record<TipoEtapaProyecto, string> = {
  reporte: "📄",
  oral_grupal: "🎤",
  entrevista: "🗣️",
  demostracion: "🛠️",
};

/** Niveles de desempeño de las rúbricas de proyecto, del más alto al más bajo, con su puntaje. */
export const NIVELES_RUBRICA = [
  { clave: "excelente", valor: 100 },
  { clave: "bueno", valor: 85 },
  { clave: "suficiente", valor: 70 },
  { clave: "insuficiente", valor: 50 },
] as const;

export type ClaveNivel = (typeof NIVELES_RUBRICA)[number]["clave"];

/** Máximo de etapas, elementos por rúbrica, evaluadores y equipos (para que la página no crezca sin fin). */
export const MAX_ETAPAS = 10;
export const MAX_CRITERIOS = 12;
export const MAX_EVALUADORES = 8;
export const MAX_EQUIPOS = 40;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function nuevoIdCorto(prefijo: string) {
  return `${prefijo}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Lo habitual de cada tipo de etapa: por equipo (presentación grupal) y con evidencia (reporte, demostración). */
export function valoresTipoEtapa(tipo: TipoEtapaProyecto): Pick<EtapaProyecto, "porEquipo" | "conEvidencia"> {
  switch (tipo) {
    case "reporte":
      return { porEquipo: false, conEvidencia: true };
    case "oral_grupal":
      return { porEquipo: true, conEvidencia: true };
    case "entrevista":
      return { porEquipo: false, conEvidencia: false };
    case "demostracion":
      return { porEquipo: true, conEvidencia: true };
  }
}

/** Nivel más cercano a un puntaje (para mostrar "Bueno" junto a un 87). */
export function nivelDePuntaje(puntaje: number): ClaveNivel {
  for (const n of NIVELES_RUBRICA) if (puntaje >= n.valor - 7.5) return n.clave;
  return "insuficiente";
}

/**
 * Reparte 100 entre los pesos dados conservando su proporción (método del mayor residuo): sirve
 * para los porcentajes de los elementos de una rúbrica y para los pesos de las etapas.
 */
export function repartirCien(pesos: number[]): number[] {
  if (!pesos.length) return [];
  const limpios = pesos.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const total = limpios.reduce((s, p) => s + p, 0);
  const base = total > 0 ? limpios.map((p) => (p / total) * 100) : limpios.map(() => 100 / limpios.length);
  const enteros = base.map(Math.floor);
  let falta = 100 - enteros.reduce((s, p) => s + p, 0);
  const orden = base.map((p, i) => ({ i, resto: p - Math.floor(p) })).sort((a, b) => b.resto - a.resto);
  for (const { i } of orden) {
    if (falta <= 0) break;
    enteros[i]++;
    falta--;
  }
  return enteros;
}

/** Suma de los pesos de las etapas (debe dar 100 para que la nota final esté completa). */
export function sumaPesos(etapas: Pick<EtapaProyecto, "peso">[]): number {
  return r1(etapas.reduce((s, e) => s + (e.peso > 0 ? e.peso : 0), 0));
}

/** Evaluadores del proyecto: el dueño primero y luego los invitados (sin repetir). */
export function evaluadoresDe(p: Pick<Proyecto, "profesorId" | "evaluadores">): string[] {
  return [...new Set([p.profesorId, ...p.evaluadores])];
}

export function puedeEvaluar(p: Pick<Proyecto, "profesorId" | "evaluadores">, profesorId: string): boolean {
  return evaluadoresDe(p).includes(profesorId);
}

export function equipoDe(p: Pick<Proyecto, "equipos">, matricula: string): EquipoProyecto | undefined {
  return p.equipos.find((e) => e.matriculas.includes(matricula));
}

export const sujetoEquipo = (equipoId: string) => `equipo:${equipoId}`;

/** A quién se evalúa en la etapa: al equipo del alumno (si la etapa es por equipo y tiene uno) o al alumno. */
export function sujetoDe(p: Pick<Proyecto, "equipos">, etapa: Pick<EtapaProyecto, "porEquipo">, matricula: string): string {
  const equipo = etapa.porEquipo ? equipoDe(p, matricula) : undefined;
  return equipo ? sujetoEquipo(equipo.id) : matricula;
}

export interface SujetoEtapa {
  sujeto: string;
  nombre: string;
  /** Alumnos que reciben la calificación (uno, o los integrantes del equipo). */
  matriculas: string[];
  esEquipo: boolean;
}

/**
 * Lista de quienes se evalúan en una etapa: los equipos (si es por equipo) y los alumnos que no
 * están en ninguno; en una etapa individual, todos los alumnos.
 */
export function sujetosDeEtapa(p: Pick<Proyecto, "equipos">, etapa: Pick<EtapaProyecto, "porEquipo">, alumnos: Alumno[]): SujetoEtapa[] {
  const unicos = alumnos.filter((a, i) => alumnos.findIndex((x) => x.matricula === a.matricula) === i);
  if (!etapa.porEquipo || p.equipos.length === 0) {
    return unicos.map((a) => ({ sujeto: a.matricula, nombre: a.nombre, matriculas: [a.matricula], esEquipo: false }));
  }
  const enLista = new Set(unicos.map((a) => a.matricula));
  const equipos = p.equipos
    .map((e) => ({ sujeto: sujetoEquipo(e.id), nombre: e.nombre, matriculas: e.matriculas.filter((m) => enLista.has(m)), esEquipo: true }))
    .filter((e) => e.matriculas.length > 0);
  const conEquipo = new Set(equipos.flatMap((e) => e.matriculas));
  const sueltos = unicos.filter((a) => !conEquipo.has(a.matricula)).map((a) => ({ sujeto: a.matricula, nombre: a.nombre, matriculas: [a.matricula], esEquipo: false }));
  return [...equipos, ...sueltos];
}

/** Matrículas que reciben la calificación de un sujeto ("equipo:…" o una matrícula). */
export function matriculasDeSujeto(p: Pick<Proyecto, "equipos">, sujeto: string): string[] {
  if (sujeto.startsWith("equipo:")) return p.equipos.find((e) => sujetoEquipo(e.id) === sujeto)?.matriculas ?? [];
  return [sujeto];
}

/**
 * Calificación (0 a 100) de una evaluación con los pesos de los elementos de la rúbrica. null si
 * falta calificar algún elemento.
 */
export function calificacionEvaluacion(etapa: Pick<EtapaProyecto, "criterios">, ev: Pick<EvaluacionProyecto, "criterios">): number | null {
  if (!etapa.criterios.length) return null;
  let suma = 0;
  let pesos = 0;
  for (const c of etapa.criterios) {
    const p = ev.criterios.find((x) => x.criterioId === c.id)?.puntaje;
    if (p === undefined || !Number.isFinite(p)) return null;
    const peso = c.porcentaje > 0 ? c.porcentaje : 0;
    suma += Math.max(0, Math.min(100, p)) * peso;
    pesos += peso;
  }
  if (pesos === 0) {
    // Sin porcentajes, todos los elementos pesan igual.
    const ps = etapa.criterios.map((c) => ev.criterios.find((x) => x.criterioId === c.id)!.puntaje!);
    return r1(ps.reduce((s, x) => s + x, 0) / ps.length);
  }
  return r1(suma / pesos);
}

export interface ComentarioEvaluador {
  /** 1, 2, 3… en el orden de los evaluadores del proyecto. */
  evaluador: number;
  evaluadorId: string;
  /** Elemento de la rúbrica al que se refiere; sin él, comentario general. */
  criterio?: string;
  texto: string;
}

export interface ResultadoCriterio {
  criterioId: string;
  nombre: string;
  porcentaje: number;
  /** Promedio de los evaluadores que lo calificaron (0 a 100). */
  promedio: number | null;
  nivel: ClaveNivel | null;
}

export interface ResultadoEtapa {
  /** Promedio (0 a 100) de los evaluadores que terminaron; null si ninguno. */
  calificacion: number | null;
  /** Calificación de cada evaluador que terminó, en el orden de los evaluadores. */
  porEvaluador: { evaluadorId: string; evaluador: number; calificacion: number }[];
  /** Evaluadores que terminaron y evaluadores asignados. */
  terminadas: number;
  esperadas: number;
  porCriterio: ResultadoCriterio[];
  comentarios: ComentarioEvaluador[];
  /** Áreas de mejora de todos los evaluadores, sin repetir. */
  mejoras: string[];
}

/** Resultado de un alumno o equipo en una etapa: promedio de las evaluaciones terminadas. */
export function resultadoEtapa(p: Proyecto, etapa: EtapaProyecto, evaluaciones: EvaluacionProyecto[], sujeto: string): ResultadoEtapa {
  const orden = evaluadoresDe(p);
  const propias = evaluaciones
    .filter((e) => e.proyectoId === p.id && e.etapaId === etapa.id && e.sujeto === sujeto && e.terminada && orden.includes(e.evaluadorId))
    .sort((a, b) => orden.indexOf(a.evaluadorId) - orden.indexOf(b.evaluadorId));
  const porEvaluador = propias
    .map((e) => ({ evaluadorId: e.evaluadorId, evaluador: orden.indexOf(e.evaluadorId) + 1, calificacion: calificacionEvaluacion(etapa, e) }))
    .filter((x): x is { evaluadorId: string; evaluador: number; calificacion: number } => x.calificacion !== null);
  const validas = propias.filter((e) => porEvaluador.some((x) => x.evaluadorId === e.evaluadorId));
  const calificacion = porEvaluador.length ? r1(porEvaluador.reduce((s, x) => s + x.calificacion, 0) / porEvaluador.length) : null;
  const porCriterio = etapa.criterios.map((c) => {
    const ps = validas.map((e) => e.criterios.find((x) => x.criterioId === c.id)?.puntaje).filter((x): x is number => x !== undefined);
    const promedio = ps.length ? r1(ps.reduce((s, x) => s + x, 0) / ps.length) : null;
    return { criterioId: c.id, nombre: c.nombre, porcentaje: c.porcentaje, promedio, nivel: promedio === null ? null : nivelDePuntaje(promedio) };
  });
  const comentarios: ComentarioEvaluador[] = [];
  for (const e of validas) {
    const evaluador = orden.indexOf(e.evaluadorId) + 1;
    for (const c of etapa.criterios) {
      const texto = e.criterios.find((x) => x.criterioId === c.id)?.comentario.trim();
      if (texto) comentarios.push({ evaluador, evaluadorId: e.evaluadorId, criterio: c.nombre, texto });
    }
    if (e.comentario.trim()) comentarios.push({ evaluador, evaluadorId: e.evaluadorId, texto: e.comentario.trim() });
  }
  const mejoras = [...new Set(validas.flatMap((e) => e.mejoras.map((m) => m.trim()).filter(Boolean)))];
  return { calificacion, porEvaluador, terminadas: porEvaluador.length, esperadas: orden.length, porCriterio, comentarios, mejoras };
}

export type EstadoEtapaAlumno = "pendiente" | "entregada" | "en_evaluacion" | "cerrada";

export interface EtapaAlumno {
  etapa: EtapaProyecto;
  numero: number;
  sujeto: string;
  entrega?: EntregaProyecto;
  estado: EstadoEtapaAlumno;
  /** Resultado de la etapa (solo con la etapa cerrada, salvo que se pidan los resultados en curso). */
  resultado?: ResultadoEtapa;
  /** Puntos que aporta a la nota final: peso × calificación / 100. */
  aporte: number | null;
  /** Suma de los aportes de las etapas cerradas hasta esta (calificación acumulada al cierre). */
  acumulada: number | null;
}

export interface ResumenAlumnoProyecto {
  etapas: EtapaAlumno[];
  /** Puntos acumulados de las etapas cerradas (de 100 posibles). */
  acumulada: number;
  /** Promedio ponderado de las etapas cerradas (0 a 100); null si aún no se cierra ninguna. */
  promedioALaFecha: number | null;
  /** Nota final (0 a 100) cuando todas las etapas están cerradas. */
  final: number | null;
  /** Porcentaje del proyecto (por peso) que ya se cerró. */
  avance: number;
  cerradas: number;
}

/**
 * Lo que ve el alumno de su proyecto: estado de cada etapa, su calificación (al cierre), lo que
 * aporta y la acumulada. Con `enCurso`, también los resultados de etapas aún abiertas (vista del profesor).
 */
export function resumenAlumno(
  p: Proyecto,
  evaluaciones: EvaluacionProyecto[],
  entregas: EntregaProyecto[],
  matricula: string,
  { enCurso = false }: { enCurso?: boolean } = {},
): ResumenAlumnoProyecto {
  let acumulada = 0;
  let pesoCerrado = 0;
  let cerradas = 0;
  const etapas = p.etapas.map((etapa, i): EtapaAlumno => {
    const sujeto = sujetoDe(p, etapa, matricula);
    const entrega = entregas.find((e) => e.proyectoId === p.id && e.etapaId === etapa.id && e.sujeto === sujeto);
    const res = resultadoEtapa(p, etapa, evaluaciones, sujeto);
    const cerrada = Boolean(etapa.cerradaEn);
    const estado: EstadoEtapaAlumno = cerrada ? "cerrada" : res.terminadas > 0 ? "en_evaluacion" : entrega ? "entregada" : "pendiente";
    const visible = cerrada || enCurso;
    // Al cierre, sin evaluación cuenta como 0 (no presentó).
    const cal = visible ? (res.calificacion ?? (cerrada ? 0 : null)) : null;
    const aporte = cal === null ? null : r1((cal * Math.max(0, etapa.peso)) / 100);
    if (cerrada && aporte !== null) {
      acumulada += aporte;
      pesoCerrado += Math.max(0, etapa.peso);
      cerradas++;
    }
    return {
      etapa,
      numero: i + 1,
      sujeto,
      entrega,
      estado,
      resultado: visible ? res : undefined,
      aporte,
      acumulada: cerrada ? r1(acumulada) : null,
    };
  });
  const total = sumaPesos(p.etapas);
  return {
    etapas,
    acumulada: r1(acumulada),
    promedioALaFecha: pesoCerrado > 0 ? r1((acumulada / pesoCerrado) * 100) : null,
    final: p.etapas.length > 0 && cerradas === p.etapas.length ? r1(total > 0 ? (acumulada / total) * 100 : 0) : null,
    avance: total > 0 ? Math.round((pesoCerrado / total) * 100) : 0,
    cerradas,
  };
}

export interface CeldaAvance {
  entrega?: EntregaProyecto;
  /** Evaluación del profesor que mira la tabla (si ya empezó). */
  mia?: EvaluacionProyecto;
  terminadas: number;
  esperadas: number;
  /** Promedio de los evaluadores que terminaron (solo para el dueño del proyecto). */
  calificacion: number | null;
}

/** Tabla de avance de una etapa: una celda por alumno o equipo. */
export function avanceEtapa(
  p: Proyecto,
  etapa: EtapaProyecto,
  alumnos: Alumno[],
  evaluaciones: EvaluacionProyecto[],
  entregas: EntregaProyecto[],
  profesorId: string,
): (SujetoEtapa & CeldaAvance)[] {
  return sujetosDeEtapa(p, etapa, alumnos).map((s) => {
    const res = resultadoEtapa(p, etapa, evaluaciones, s.sujeto);
    return {
      ...s,
      entrega: entregas.find((e) => e.proyectoId === p.id && e.etapaId === etapa.id && e.sujeto === s.sujeto),
      mia: evaluaciones.find((e) => e.proyectoId === p.id && e.etapaId === etapa.id && e.sujeto === s.sujeto && e.evaluadorId === profesorId),
      terminadas: res.terminadas,
      esperadas: res.esperadas,
      calificacion: p.profesorId === profesorId ? res.calificacion : null,
    };
  });
}

/** Nota del proyecto para el cuaderno: promedio ponderado de las etapas cerradas; null si ninguna. */
export function notaProyecto(p: Proyecto, evaluaciones: EvaluacionProyecto[], matricula: string): number | null {
  return resumenAlumno(p, evaluaciones, [], matricula).promedioALaFecha;
}

/** Revisa el modelo del proyecto antes de guardarlo. Devuelve la clave del problema, o undefined. */
export function revisarModelo(p: Pick<Proyecto, "titulo" | "etapas" | "equipos">):
  | "titulo"
  | "sinEtapas"
  | "nombreEtapa"
  | "pesos"
  | "sinCriterios"
  | "porcentajes"
  | "equipoRepetido"
  | undefined {
  if (!p.titulo.trim()) return "titulo";
  if (!p.etapas.length) return "sinEtapas";
  if (p.etapas.some((e) => !e.nombre.trim())) return "nombreEtapa";
  if (Math.abs(sumaPesos(p.etapas) - 100) > 0.05) return "pesos";
  if (p.etapas.some((e) => e.criterios.length === 0)) return "sinCriterios";
  if (p.etapas.some((e) => Math.abs(e.criterios.reduce((s, c) => s + (c.porcentaje > 0 ? c.porcentaje : 0), 0) - 100) > 0.05)) return "porcentajes";
  const vistos = new Set<string>();
  for (const eq of p.equipos) for (const m of eq.matriculas) {
    if (vistos.has(m)) return "equipoRepetido";
    vistos.add(m);
  }
  return undefined;
}

/** Limpia un criterio que llega del formulario o de la IA. */
export function limpiarCriterio(c: Partial<CriterioProyecto>, i: number): CriterioProyecto {
  const niveles = Array.isArray(c.niveles) ? c.niveles.map((n) => String(n ?? "").slice(0, 400)) : [];
  return {
    id: String(c.id || `c${i + 1}`).slice(0, 40),
    nombre: String(c.nombre ?? "").trim().slice(0, 120),
    descripcion: String(c.descripcion ?? "").trim().slice(0, 600),
    porcentaje: Number.isFinite(Number(c.porcentaje)) ? Math.max(0, Math.min(100, Number(c.porcentaje))) : 0,
    niveles: NIVELES_RUBRICA.map((_, k) => niveles[k] ?? ""),
  };
}

/** Limpia la evaluación que manda un profesor: solo elementos de la rúbrica y puntajes de 0 a 100. */
export function limpiarEvaluacion(
  etapa: EtapaProyecto,
  datos: { criterios?: { criterioId?: string; puntaje?: number | null; comentario?: string }[]; comentario?: string; mejoras?: string[] | string; terminada?: boolean },
): Pick<EvaluacionProyecto, "criterios" | "comentario" | "mejoras" | "terminada"> {
  const criterios = etapa.criterios.map((c) => {
    const d = datos.criterios?.find((x) => x.criterioId === c.id);
    const n = d?.puntaje === null || d?.puntaje === undefined ? undefined : Number(d.puntaje);
    return {
      criterioId: c.id,
      puntaje: n === undefined || !Number.isFinite(n) ? undefined : Math.round(Math.max(0, Math.min(100, n))),
      comentario: String(d?.comentario ?? "").trim().slice(0, 1500),
    };
  });
  const mejoras = (Array.isArray(datos.mejoras) ? datos.mejoras : String(datos.mejoras ?? "").split(/\r?\n/))
    .map((m) => String(m).trim().replace(/^([-•*]|\d+[.)])\s+/, ""))
    .filter(Boolean)
    .slice(0, 12)
    .map((m) => m.slice(0, 300));
  // Solo se puede terminar con todos los elementos calificados.
  const terminada = Boolean(datos.terminada) && criterios.every((c) => c.puntaje !== undefined);
  return { criterios, comentario: String(datos.comentario ?? "").trim().slice(0, 3000), mejoras, terminada };
}

/** Prefijo del id de las columnas de proyecto en el cuaderno (no son actividades: no se editan ahí). */
export const PREFIJO_COLUMNA_PROYECTO = "proyecto:";

export function esColumnaProyecto(id: string): boolean {
  return id.startsWith(PREFIJO_COLUMNA_PROYECTO);
}

/**
 * Los proyectos del curso como columnas del cuaderno: una "actividad" sobre 100 con la etiqueta de
 * proyecto, y para cada alumno su promedio ponderado de las etapas cerradas (sin etapas cerradas,
 * la columna aún no cuenta). Así entran al promedio del tipo y al plan de evaluación del curso.
 */
export function columnasDeProyectos(
  proyectos: Proyecto[],
  evaluaciones: EvaluacionProyecto[],
  alumnos: Alumno[],
  etiqueta: string,
): { actividades: Actividad[]; entregas: Entrega[] } {
  const actividades: Actividad[] = [];
  const entregas: Entrega[] = [];
  for (const p of proyectos) {
    const id = `${PREFIJO_COLUMNA_PROYECTO}${p.id}`;
    actividades.push({
      id,
      grupoId: p.grupoId,
      titulo: p.titulo,
      descripcion: p.descripcion,
      etiqueta,
      escala: 100,
      fechaAplicacion: (p.etapas.map((e) => e.fecha).filter((f): f is string => !!f).sort().at(-1) ?? p.creadoEn).slice(0, 10),
      paginas: 0,
      estado: "publicada",
      reactivos: [],
    });
    for (const a of alumnos) {
      const nota = notaProyecto(p, evaluaciones, a.matricula);
      if (nota === null) continue;
      entregas.push({ actividadId: id, matricula: a.matricula, estado: "aprobada", paginasRecibidas: 0, resultados: [], positivos: [], mejoras: [], calificacionManual: nota });
    }
  }
  return { actividades, entregas };
}
