// Reporte en tablero (etapa 3 del perfil CREAR): perfil del alumno en el curso, evolución,
// fortalezas y áreas a desarrollar, horario de trabajo, avance por unidad y resumen del grupo.
// Todo lo calcula este código con los intentos registrados; la IA solo redacta la ruta de mejora.
import type { Actividad, EtapaCrear, IntentoActividad, NivelConocimiento, ReflexionPerfil, ValoracionInicial } from "../tipos";
import { ETAPAS_CREAR, type NivelSolo } from "./crear";
import { UMBRAL_LOGRO, nivelAlcanzado } from "./etapas";
import { perfilEtapasCurso } from "./intentos";

/** Desde este logro, una etapa se considera fortaleza. */
export const UMBRAL_FORTALEZA = 85;

/** Franjas del día (hora del centro de México) para el horario de trabajo. */
export const FRANJAS = ["madrugada", "manana", "tarde", "noche"] as const;
export type Franja = (typeof FRANJAS)[number];
export const franjaDe = (hora: number): Franja => (hora < 6 ? "madrugada" : hora < 12 ? "manana" : hora < 18 ? "tarde" : "noche");

/** Logro que el alumno esperaba de sí mismo según su autodiagnóstico, para compararlo con el real. */
export const ESPERADO_AUTODIAGNOSTICO: Record<NivelConocimiento, number> = { avanzado: 90, bueno: 75, basico: 60, apoyo: 40, sin_idea: 20 };

export interface EtapaValor {
  etapa: EtapaCrear;
  logro: number;
}

/** Fortalezas (≥ 85 %, de mayor a menor) y áreas a desarrollar (< 70 %, de menor a mayor). */
export function fortalezasYAreas(porEtapa: Partial<Record<EtapaCrear, number>>): { fortalezas: EtapaValor[]; areas: EtapaValor[] } {
  const lista = ETAPAS_CREAR.filter((e) => porEtapa[e] !== undefined).map((e) => ({ etapa: e, logro: porEtapa[e]! }));
  return {
    fortalezas: lista.filter((x) => x.logro >= UMBRAL_FORTALEZA).sort((a, b) => b.logro - a.logro),
    areas: lista.filter((x) => x.logro < UMBRAL_LOGRO).sort((a, b) => a.logro - b.logro),
  };
}

export interface PuntoEvolucion {
  fecha: string;
  calificacion: number;
  origen: IntentoActividad["origen"];
  actividadId: string;
  numero: number;
}

/** Todos los intentos del alumno en el curso, en orden de fecha. */
export function evolucion(intentos: IntentoActividad[]): PuntoEvolucion[] {
  return [...intentos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((x) => ({ fecha: x.fecha, calificacion: x.calificacion, origen: x.origen, actividadId: x.actividadId, numero: x.numero }));
}

/**
 * Horario de trabajo: intentos por día de la semana (0 domingo) y franja del día. `masFrecuente` es
 * la celda con más intentos (o undefined sin datos).
 */
export function horarioTrabajo(intentos: Pick<IntentoActividad, "dia" | "hora">[]): { celdas: number[][]; maximo: number; masFrecuente?: { dia: number; franja: Franja } } {
  const celdas = Array.from({ length: 7 }, () => FRANJAS.map(() => 0));
  for (const x of intentos) if (x.dia >= 0 && x.dia < 7) celdas[x.dia][FRANJAS.indexOf(franjaDe(x.hora))]++;
  let maximo = 0;
  let masFrecuente: { dia: number; franja: Franja } | undefined;
  celdas.forEach((fila, d) =>
    fila.forEach((n, f) => {
      if (n > maximo) {
        maximo = n;
        masFrecuente = { dia: d, franja: FRANJAS[f] };
      }
    }),
  );
  return { celdas, maximo, masFrecuente };
}

/** Último intento de cada actividad. */
function ultimos(intentos: IntentoActividad[]): IntentoActividad[] {
  const m = new Map<string, IntentoActividad>();
  for (const x of intentos) {
    const u = m.get(x.actividadId);
    if (!u || x.numero > u.numero) m.set(x.actividadId, x);
  }
  return [...m.values()];
}

const promedio = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

function promedioEtapas(lista: Pick<IntentoActividad, "porEtapa">[]): Partial<Record<EtapaCrear, number>> {
  const out: Partial<Record<EtapaCrear, number>> = {};
  for (const e of ETAPAS_CREAR) {
    const v = promedio(lista.map((x) => x.porEtapa[e]).filter((v): v is number => v !== undefined));
    if (v !== null) out[e] = v;
  }
  return out;
}

export interface UnidadTablero {
  unidad: string;
  /** Promedio (sobre 100) del último intento de cada actividad de la unidad. */
  calificacion: number | null;
  porEtapa: Partial<Record<EtapaCrear, number>>;
  actividades: number;
  /** Lo que el alumno dijo de sí mismo en su autodiagnóstico, si lo hizo. */
  autodiagnostico?: NivelConocimiento;
}

/** Avance por unidad del temario: actividades de cada unidad (por su temario) y su logro. */
export function porUnidad(
  intentos: IntentoActividad[],
  actividades: Pick<Actividad, "id" | "temario">[],
  unidades: string[],
  valoracion?: Pick<ValoracionInicial, "niveles">,
): UnidadTablero[] {
  const unidadDe = new Map(actividades.map((a) => [a.id, a.temario?.unidad]));
  const finales = ultimos(intentos);
  return unidades.map((unidad) => {
    const suyos = finales.filter((x) => unidadDe.get(x.actividadId) === unidad);
    return {
      unidad,
      calificacion: promedio(suyos.map((x) => x.calificacion)),
      porEtapa: promedioEtapas(suyos),
      actividades: suyos.length,
      ...(valoracion?.niveles[unidad] ? { autodiagnostico: valoracion.niveles[unidad] } : {}),
    };
  });
}

export interface ReporteAlumno {
  porEtapa: Partial<Record<EtapaCrear, number>>;
  nivel: NivelSolo;
  fortalezas: EtapaValor[];
  areas: EtapaValor[];
  evolucion: PuntoEvolucion[];
  horario: ReturnType<typeof horarioTrabajo>;
  /** Promedio (sobre 100) del último intento de cada actividad. */
  calificacion: number | null;
  actividades: number;
  intentos: number;
  casos: number;
  segundos: number;
  /** Diferencia entre el primer intento y el último de las actividades con más de uno (puntos). */
  mejoraCasos: number | null;
}

/** Reporte del alumno en el curso con sus intentos (ya filtrados por alumno y curso). */
export function reporteAlumno(intentos: IntentoActividad[], alumnoId: string, grupoId: string): ReporteAlumno {
  const propios = intentos.filter((x) => x.alumnoId === alumnoId && x.grupoId === grupoId);
  const { porEtapa, actividades } = perfilEtapasCurso(propios, alumnoId, grupoId);
  const finales = ultimos(propios);
  const mejoras: number[] = [];
  for (const u of finales) {
    const primero = propios.find((x) => x.actividadId === u.actividadId && x.numero === 1);
    if (primero && u.numero > 1) mejoras.push(u.calificacion - primero.calificacion);
  }
  return {
    porEtapa,
    nivel: nivelAlcanzado(porEtapa),
    ...fortalezasYAreas(porEtapa),
    evolucion: evolucion(propios),
    horario: horarioTrabajo(propios),
    calificacion: promedio(finales.map((x) => x.calificacion)),
    actividades,
    intentos: propios.length,
    casos: propios.filter((x) => x.origen === "caso").length,
    segundos: propios.reduce((s, x) => s + (x.segundos ?? 0), 0),
    mejoraCasos: promedio(mejoras),
  };
}

export interface ReporteGrupo {
  alumnos: number;
  /** Promedio de las calificaciones de los alumnos. */
  calificacion: number | null;
  porEtapa: Partial<Record<EtapaCrear, number>>;
  /** Cuántos alumnos hay en cada nivel SOLO. */
  niveles: Partial<Record<NivelSolo, number>>;
  /** Alumnos con cada etapa como área a desarrollar. */
  areas: Partial<Record<EtapaCrear, number>>;
  horario: ReturnType<typeof horarioTrabajo>;
}

/** Resumen del grupo con los alumnos que dieron su consentimiento. */
export function reporteGrupo(intentos: IntentoActividad[], alumnoIds: string[], grupoId: string): ReporteGrupo {
  const reportes = alumnoIds.map((id) => reporteAlumno(intentos, id, grupoId)).filter((r) => r.intentos > 0);
  const niveles: Partial<Record<NivelSolo, number>> = {};
  const areas: Partial<Record<EtapaCrear, number>> = {};
  for (const r of reportes) {
    niveles[r.nivel] = (niveles[r.nivel] ?? 0) + 1;
    for (const a of r.areas) areas[a.etapa] = (areas[a.etapa] ?? 0) + 1;
  }
  const delGrupo = intentos.filter((x) => x.grupoId === grupoId && alumnoIds.includes(x.alumnoId));
  return { alumnos: reportes.length, calificacion: promedio(reportes.flatMap((r) => (r.calificacion === null ? [] : [r.calificacion]))), porEtapa: promedioEtapas(reportes), niveles, areas, horario: horarioTrabajo(delGrupo) };
}

// ---------- Reflexiones del profesor ----------

export const LARGO_REFLEXION = 3000;

/** Clave de una reflexión: "unidad:<nombre>" o "cierre". */
export const claveReflexion = (r: Pick<ReflexionPerfil, "alcance" | "unidad">) => (r.alcance === "cierre" ? "cierre" : `unidad:${r.unidad ?? ""}`);

/** Guarda (o borra, si queda vacía) la reflexión de una unidad o del cierre del curso. */
export function guardarReflexion(
  lista: ReflexionPerfil[] | undefined,
  datos: { grupoId: string; alcance: ReflexionPerfil["alcance"]; unidad?: string; texto: string },
  ahora: Date = new Date(),
): ReflexionPerfil[] {
  const texto = datos.texto.replace(/\r\n/g, "\n").trim().slice(0, LARGO_REFLEXION);
  const nueva: ReflexionPerfil = {
    grupoId: datos.grupoId,
    alcance: datos.alcance,
    ...(datos.alcance === "unidad" ? { unidad: (datos.unidad ?? "").slice(0, 200) } : {}),
    texto,
    actualizadoEn: ahora.toISOString(),
  };
  const resto = (lista ?? []).filter((r) => !(r.grupoId === datos.grupoId && claveReflexion(r) === claveReflexion(nueva)));
  return texto ? [...resto, nueva] : resto;
}

/** Reflexiones del curso por clave. */
export function reflexionesDelCurso(lista: ReflexionPerfil[] | undefined, grupoId: string): Map<string, ReflexionPerfil> {
  return new Map((lista ?? []).filter((r) => r.grupoId === grupoId).map((r) => [claveReflexion(r), r]));
}

// ---------- Datos para la ruta de mejora (IA) ----------

/**
 * Lo único que viaja a la IA para redactar la ruta de mejora: números por etapa, nivel, horario y
 * el modelo CREAR del curso. Nunca el nombre, la matrícula ni el correo del alumno.
 */
export function datosRutaMejora(r: ReporteAlumno, materia: string, modelo: { etapas: Record<EtapaCrear, { evidencias: string; procesos: string }> }, stroop?: { efectoInicio?: number | null; efectoFin?: number | null }) {
  return {
    materia,
    logroPorEtapa: r.porEtapa,
    nivelSolo: r.nivel,
    fortalezas: r.fortalezas.map((x) => x.etapa),
    areasADesarrollar: r.areas.map((x) => x.etapa),
    calificacionPromedio: r.calificacion,
    actividades: r.actividades,
    intentos: r.intentos,
    casosEquivalentes: r.casos,
    mejoraConCasos: r.mejoraCasos,
    horarioMasFrecuente: r.horario.masFrecuente ?? null,
    ...(stroop ? { efectoStroopMs: stroop } : {}),
    modeloDelCurso: Object.fromEntries(ETAPAS_CREAR.map((e) => [e, { procesos: modelo.etapas[e].procesos, evidencias: modelo.etapas[e].evidencias }])),
  };
}

// ---------- Recomendaciones y unidades del grupo ----------

/**
 * Etapas sobre las que recomendar: las áreas a desarrollar (hasta 3); si no hay, las que aún no son
 * fortaleza, de menor a mayor logro (hasta 2). Sin etapas con datos, ninguna.
 */
export function etapasARecomendar(r: Pick<ReporteAlumno, "porEtapa" | "areas">): EtapaCrear[] {
  if (r.areas.length) return r.areas.slice(0, 3).map((x) => x.etapa);
  return ETAPAS_CREAR.filter((e) => r.porEtapa[e] !== undefined && r.porEtapa[e]! < UMBRAL_FORTALEZA)
    .sort((a, b) => r.porEtapa[a]! - r.porEtapa[b]!)
    .slice(0, 2);
}

/** Comparación del autodiagnóstico con el logro real de la unidad (± 10 puntos cuenta como igual). */
export function comparaAutodiagnostico(u: Pick<UnidadTablero, "autodiagnostico" | "calificacion">): "arriba" | "abajo" | "igual" | null {
  if (!u.autodiagnostico || u.calificacion === null) return null;
  const d = u.calificacion - ESPERADO_AUTODIAGNOSTICO[u.autodiagnostico];
  return d > 10 ? "arriba" : d < -10 ? "abajo" : "igual";
}

/** Avance del grupo por unidad: promedio de los alumnos (cada uno con el último intento de cada actividad). */
export function porUnidadGrupo(
  intentos: IntentoActividad[],
  alumnoIds: string[],
  grupoId: string,
  actividades: Pick<Actividad, "id" | "temario">[],
  unidades: string[],
): { unidad: string; calificacion: number | null; porEtapa: Partial<Record<EtapaCrear, number>>; alumnos: number }[] {
  const porAlumno = alumnoIds.map((id) => porUnidad(intentos.filter((x) => x.alumnoId === id && x.grupoId === grupoId), actividades, unidades));
  return unidades.map((unidad, i) => {
    const filas = porAlumno.map((p) => p[i]).filter((u) => u.calificacion !== null);
    const porEtapa: Partial<Record<EtapaCrear, number>> = {};
    for (const e of ETAPAS_CREAR) {
      const v = promedio(filas.map((u) => u.porEtapa[e]).filter((v): v is number => v !== undefined));
      if (v !== null) porEtapa[e] = v;
    }
    return { unidad, calificacion: promedio(filas.map((u) => u.calificacion!)), porEtapa, alumnos: filas.length };
  });
}
