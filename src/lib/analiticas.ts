// Analíticas de aprendizaje de un curso. Todos los números los calcula este código;
// la IA no participa. Para comparar actividades con escalas distintas, todo se
// expresa en puntaje sobre 100. Un trabajo no entregado cuenta como 0.
import { calificada, escalaDe, puntosObtenidos, puntosTotales } from "./estadisticas";
import type { Actividad, Alumno, Entrega, Grupo } from "./tipos";

/** Calificación mínima aprobatoria sobre 100 (6 sobre 10). */
export const APROBATORIA = 60;
/** Caída (en puntos sobre 100) de la última actividad contra el promedio previo que se marca como descenso. */
export const CAIDA_ALERTA = 15;

export interface EstadisticasActividad {
  id: string;
  titulo: string;
  etiqueta?: string;
  fecha: string;
  alumnos: number;
  entregadas: number;
  noEntregadas: number;
  /** Entregadas que aún no se evalúan (no cuentan en los números). */
  pendientes: number;
  /** Promedio sobre 100 con los no entregados en 0. */
  promedio: number;
  /** Promedio solo de quienes entregaron. */
  promedioEntregadas: number;
  mediana: number;
  desviacion: number;
  minima: number;
  maxima: number;
  /** Porcentaje de alumnos con calificación aprobatoria. */
  aprobacion: number;
  /** Porcentaje de alumnos que entregaron. */
  tasaEntrega: number;
}

export interface PuntajeAlumno {
  actividadId: string;
  puntaje: number;
  entregada: boolean;
}

export interface ResumenAlumno {
  alumno: Alumno;
  promedio: number;
  noEntregadas: number;
  /** Última actividad menos el promedio de las anteriores; null con menos de dos actividades. */
  tendencia: number | null;
  puntajes: PuntajeAlumno[];
  /** Por qué requiere atención (vacío si no la requiere). */
  motivos: string[];
}

export interface PromedioCategoria {
  nombre: string;
  promedio: number;
  /** Actividades que entran en el promedio. */
  cantidad: number;
}

export interface Analiticas {
  general: {
    promedio: number;
    promedioEntregadas: number;
    mediana: number;
    desviacion: number;
    aprobacion: number;
    tasaEntrega: number;
    noEntregadas: number;
    alumnos: number;
  };
  actividades: EstadisticasActividad[];
  sinResultados: { id: string; titulo: string }[];
  porTipo: PromedioCategoria[];
  alumnos: ResumenAlumno[];
  mejores: ResumenAlumno[];
  atencion: ResumenAlumno[];
  distribucion: { rango: string; cantidad: number }[];
  temasDebiles: { nombre: string; acierto: number }[];
  hallazgos: string[];
}

export function promedio(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

export function mediana(xs: number[]) {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** Desviación estándar poblacional (el grupo completo, no una muestra). */
export function desviacion(xs: number[]) {
  if (xs.length < 2) return 0;
  const p = promedio(xs);
  return Math.sqrt(promedio(xs.map((x) => (x - p) ** 2)));
}

export function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function porcentaje(parte: number, total: number) {
  return total ? Math.round((parte / total) * 100) : 0;
}

/** Puntaje sobre 100 de una entrega evaluada; null si no se puede calcular aún. */
function puntajeDe(actividad: Actividad, entrega: Entrega | undefined): { puntaje: number; entregada: boolean } | null {
  if (entrega?.calificacionManual !== undefined) {
    return { puntaje: (entrega.calificacionManual / escalaDe(actividad)) * 100, entregada: true };
  }
  if (!entrega || entrega.estado === "sin_entregar") return { puntaje: 0, entregada: false };
  if (entrega.resultados.length === 0) return null; // entregada, por evaluar
  const total = puntosTotales(actividad);
  return { puntaje: total ? (puntosObtenidos(entrega) / total) * 100 : 0, entregada: true };
}

export function analiticasCurso(grupo: Grupo, actividades: Actividad[], entregas: Entrega[]): Analiticas {
  const alumnos = grupo.alumnos;
  const ordenadas = [...actividades].sort((a, b) => a.fechaAplicacion.localeCompare(b.fechaAplicacion));
  // Solo cuentan las actividades que ya tienen al menos una entrega evaluada.
  const conResultados = ordenadas.filter((a) =>
    entregas.some((e) => e.actividadId === a.id && calificada(e)),
  );
  const sinResultados = ordenadas.filter((a) => !conResultados.includes(a)).map((a) => ({ id: a.id, titulo: a.titulo }));

  // Puntajes por alumno y actividad.
  const tabla = new Map<string, PuntajeAlumno[]>();
  const statsActividad: EstadisticasActividad[] = conResultados.map((a) => {
    const puntajes: number[] = [];
    const deEntregados: number[] = [];
    let pendientes = 0;
    for (const al of alumnos) {
      const e = entregas.find((x) => x.actividadId === a.id && x.matricula === al.matricula);
      const p = puntajeDe(a, e);
      if (!p) {
        pendientes++;
        continue;
      }
      puntajes.push(p.puntaje);
      if (p.entregada) deEntregados.push(p.puntaje);
      tabla.set(al.matricula, [...(tabla.get(al.matricula) ?? []), { actividadId: a.id, ...p }]);
    }
    const noEntregadas = puntajes.length - deEntregados.length;
    return {
      id: a.id,
      titulo: a.titulo,
      etiqueta: a.etiqueta?.trim() || undefined,
      fecha: a.fechaAplicacion,
      alumnos: alumnos.length,
      entregadas: deEntregados.length + pendientes,
      noEntregadas,
      pendientes,
      promedio: r1(promedio(puntajes)),
      promedioEntregadas: r1(promedio(deEntregados)),
      mediana: r1(mediana(puntajes)),
      desviacion: r1(desviacion(puntajes)),
      minima: puntajes.length ? r1(Math.min(...puntajes)) : 0,
      maxima: puntajes.length ? r1(Math.max(...puntajes)) : 0,
      aprobacion: porcentaje(puntajes.filter((x) => x >= APROBATORIA).length, puntajes.length),
      tasaEntrega: porcentaje(deEntregados.length + pendientes, alumnos.length),
    };
  });

  // Resumen por alumno.
  const resumenes: ResumenAlumno[] = alumnos
    .filter((al) => tabla.has(al.matricula))
    .map((al) => {
      const puntajes = tabla.get(al.matricula)!;
      const valores = puntajes.map((p) => p.puntaje);
      const prom = promedio(valores);
      const noEntregadas = puntajes.filter((p) => !p.entregada).length;
      const tendencia = valores.length >= 2 ? r1(valores[valores.length - 1] - promedio(valores.slice(0, -1))) : null;
      const motivos: string[] = [];
      if (prom < APROBATORIA) motivos.push("Promedio reprobatorio");
      if (noEntregadas >= 2) motivos.push(`${noEntregadas} actividades sin entregar`);
      else if (noEntregadas === 1 && puntajes.length <= 2) motivos.push("1 actividad sin entregar");
      if (tendencia !== null && tendencia <= -CAIDA_ALERTA) motivos.push(`Bajó ${Math.abs(Math.round(tendencia))} puntos en la última actividad`);
      return { alumno: al, promedio: r1(prom), noEntregadas, tendencia, puntajes, motivos };
    });

  const todos = [...tabla.values()].flat();
  const valoresTodos = todos.map((p) => p.puntaje);
  const entregadosTodos = todos.filter((p) => p.entregada).map((p) => p.puntaje);
  const promAlumnos = resumenes.map((r) => r.promedio);

  // Promedio por tipo de actividad (etiqueta): todos los puntajes de esas actividades.
  const tipos = new Map<string, { valores: number[]; actividades: number }>();
  for (const s of statsActividad) {
    const nombre = s.etiqueta ?? "Sin etiqueta";
    const t = tipos.get(nombre) ?? { valores: [], actividades: 0 };
    t.actividades++;
    t.valores.push(...todos.filter((p) => p.actividadId === s.id).map((p) => p.puntaje));
    tipos.set(nombre, t);
  }
  const porTipo = [...tipos.entries()]
    .map(([nombre, t]) => ({ nombre, promedio: r1(promedio(t.valores)), cantidad: t.actividades }))
    .sort((a, b) => b.promedio - a.promedio);

  // Temas con menor acierto, sumando los reactivos de todas las actividades evaluadas.
  const temas = new Map<string, number[]>();
  for (const a of conResultados) {
    const evaluadas = entregas.filter((e) => e.actividadId === a.id && e.resultados.length > 0);
    for (const r of a.reactivos) {
      if (!r.tema || r.puntos <= 0) continue;
      const fr = evaluadas.map((e) => (e.resultados.find((x) => x.numero === r.numero)?.puntosObtenidos ?? 0) / r.puntos);
      temas.set(r.tema, [...(temas.get(r.tema) ?? []), ...fr]);
    }
  }
  const temasDebiles = [...temas.entries()]
    .map(([nombre, xs]) => ({ nombre, acierto: Math.round(promedio(xs) * 100) }))
    .sort((a, b) => a.acierto - b.acierto)
    .slice(0, 5);

  const rangos = [
    { rango: "0 a 59", min: 0, max: 60 },
    { rango: "60 a 69", min: 60, max: 70 },
    { rango: "70 a 79", min: 70, max: 80 },
    { rango: "80 a 89", min: 80, max: 90 },
    { rango: "90 a 100", min: 90, max: 101 },
  ];

  const general = {
    promedio: r1(promedio(valoresTodos)),
    promedioEntregadas: r1(promedio(entregadosTodos)),
    mediana: r1(mediana(promAlumnos)),
    desviacion: r1(desviacion(promAlumnos)),
    aprobacion: porcentaje(promAlumnos.filter((x) => x >= APROBATORIA).length, promAlumnos.length),
    tasaEntrega: porcentaje(entregadosTodos.length, valoresTodos.length),
    noEntregadas: valoresTodos.length - entregadosTodos.length,
    alumnos: alumnos.length,
  };

  const porPromedio = [...resumenes].sort((a, b) => b.promedio - a.promedio);
  const atencion = resumenes.filter((r) => r.motivos.length > 0).sort((a, b) => a.promedio - b.promedio);
  const mejores = porPromedio.filter((r) => r.motivos.length === 0).slice(0, 5);

  const analiticas: Analiticas = {
    general,
    actividades: statsActividad,
    sinResultados,
    porTipo,
    alumnos: porPromedio,
    mejores,
    atencion,
    distribucion: rangos.map(({ rango, min, max }) => ({
      rango,
      cantidad: promAlumnos.filter((x) => x >= min && x < max).length,
    })),
    temasDebiles,
    hallazgos: [],
  };
  analiticas.hallazgos = hallazgos(analiticas);
  return analiticas;
}

/** Observaciones redactadas con plantillas a partir de los números ya calculados. */
export function hallazgos(a: Analiticas): string[] {
  const h: string[] = [];
  const g = a.general;
  if (a.actividades.length === 0) return ["Aún no hay actividades evaluadas en este curso."];

  if (g.noEntregadas > 0) {
    h.push(
      `Hay ${g.noEntregadas} ${g.noEntregadas === 1 ? "trabajo no entregado" : "trabajos no entregados"} (tasa de entrega ${g.tasaEntrega}%). ` +
        `Con ellos en 0 el promedio es ${g.promedio}; solo con lo entregado sería ${g.promedioEntregadas}.`,
    );
  } else {
    h.push(`Todos los alumnos entregaron todas las actividades evaluadas.`);
  }

  if (a.porTipo.length >= 2) {
    const mejor = a.porTipo[0];
    const peor = a.porTipo[a.porTipo.length - 1];
    if (mejor.promedio - peor.promedio >= 5) {
      h.push(`El grupo rinde mejor en ${mejor.nombre} (${mejor.promedio}) que en ${peor.nombre} (${peor.promedio}).`);
    }
  }

  const tendencia = a.actividades.filter((s) => s.entregadas > 0);
  if (tendencia.length >= 2) {
    const primera = tendencia[0];
    const ultima = tendencia[tendencia.length - 1];
    const dif = r1(ultima.promedioEntregadas - primera.promedioEntregadas);
    if (Math.abs(dif) >= 5) {
      h.push(
        `Entre "${primera.titulo}" y "${ultima.titulo}" el promedio de lo entregado ${dif > 0 ? "subió" : "bajó"} ${Math.abs(dif)} puntos.`,
      );
    }
  }

  const dispersa = [...a.actividades].sort((x, y) => y.desviacion - x.desviacion)[0];
  if (dispersa && dispersa.desviacion >= 20) {
    h.push(
      `"${dispersa.titulo}" tiene la mayor dispersión (desviación ${dispersa.desviacion}): el grupo quedó dividido y conviene trabajo diferenciado.`,
    );
  }

  if (a.temasDebiles.length > 0 && a.temasDebiles[0].acierto < 70) {
    const t = a.temasDebiles[0];
    h.push(`El tema con menor acierto es ${t.nombre} (${t.acierto}%). Es buen candidato para repaso.`);
  }

  if (a.atencion.length > 0) {
    h.push(
      `${a.atencion.length} ${a.atencion.length === 1 ? "alumno requiere" : "alumnos requieren"} atención urgente por promedio reprobatorio, trabajos sin entregar o una caída reciente.`,
    );
  }
  return h;
}
