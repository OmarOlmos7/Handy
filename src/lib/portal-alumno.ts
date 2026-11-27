// Cálculos del portal del alumno: secciones de actividades, su propio cuaderno de calificaciones
// y sus analíticas. El alumno solo ve sus datos; del grupo solo ve promedios, y únicamente cuando
// hay suficientes alumnos calificados para que nadie pueda deducir la calificación de otro.
import { APROBATORIA, mediana } from "./analiticas";
import { cuadernoCurso, type Celda, type Cuaderno } from "./cuaderno";
import { calificacion, calificada, escalaDe } from "./estadisticas";
import { conPuntaje } from "./modalidad";
import { notaFinal, pesoDe } from "./plan-evaluacion";
import { notaConAutoestudio } from "./autoestudio";
import { actividadVisible, estadoEnvio } from "./periodo";
import { resultadosDisponibles } from "./resultados";
import type { Actividad, Entrega, Escala, Grupo } from "./tipos";
import { actividadDeVersion } from "./versiones";

/** Mínimo de alumnos calificados para mostrar promedios del grupo junto a los del alumno. */
export const MINIMO_COMPARACION = 5;

export type SeccionActividad = "por_entregar" | "entregadas" | "sin_programar";

export interface ActividadDelAlumno {
  actividad: Actividad;
  entrega?: Entrega;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const enviada = (e?: Entrega) => Boolean(e && e.estado !== "sin_entregar");

/** Entregadas si ya la envió; por entregar si tiene fecha de cierre; si no, sin programar. */
export function seccionDe(actividad: Actividad, entrega?: Entrega): SeccionActividad {
  if (enviada(entrega)) return "entregadas";
  return actividad.envioHasta ? "por_entregar" : "sin_programar";
}

/**
 * Reparte las actividades en las tres secciones y las ordena por fecha:
 * por entregar, primero las abiertas o próximas por fecha de cierre y al final las ya cerradas;
 * entregadas, de la más reciente a la más antigua; sin programar, por fecha de aplicación.
 */
export function seccionesAlumno(items: ActividadDelAlumno[], ahora: Date = new Date()): Record<SeccionActividad, ActividadDelAlumno[]> {
  const s: Record<SeccionActividad, ActividadDelAlumno[]> = { por_entregar: [], entregadas: [], sin_programar: [] };
  for (const i of items) s[seccionDe(i.actividad, i.entrega)].push(i);
  const cerrada = (a: Actividad) => estadoEnvio(a, ahora) === "cerrado";
  s.por_entregar.sort((x, y) => {
    const cx = cerrada(x.actividad);
    const cy = cerrada(y.actividad);
    if (cx !== cy) return cx ? 1 : -1;
    const orden = x.actividad.envioHasta!.localeCompare(y.actividad.envioHasta!);
    return cx ? -orden : orden;
  });
  const fechaEntrega = (i: ActividadDelAlumno) => i.entrega?.entregadaEn ?? i.actividad.fechaAplicacion;
  s.entregadas.sort((x, y) => fechaEntrega(y).localeCompare(fechaEntrega(x)));
  s.sin_programar.sort((x, y) => y.actividad.fechaAplicacion.localeCompare(x.actividad.fechaAplicacion));
  return s;
}

/** Actividades del curso que el alumno ya puede ver (las de alta futura no aparecen). */
export function actividadesVisibles(actividades: Actividad[], grupoId: string, ahora: Date = new Date()) {
  return actividades.filter((a) => a.grupoId === grupoId && actividadVisible(a, ahora));
}

/** true si el alumno ya puede ver la calificación de su entrega. */
export function resultadoVisible(actividad: Actividad, entrega: Entrega | undefined, ahora: Date = new Date()) {
  return entrega?.estado === "aprobada" && calificada(entrega) && resultadosDisponibles(actividad, ahora);
}

export interface CuadernoAlumno {
  escala: Escala;
  /** Columnas del cuaderno agrupadas por tipo, con el promedio del grupo solo si hay suficientes datos. */
  grupos: {
    etiqueta: string;
    /** Porcentaje del tipo en el plan de evaluación del curso (undefined si no hay plan o no está en él). */
    peso?: number;
    /** Promedio del alumno en el tipo y el del grupo (este solo con suficientes calificados). */
    promedio: number | null;
    promedioGrupo: number | null;
    columnas: { id: string; titulo: string; fecha: string; escala: Escala; cuenta: boolean; promedioGrupo: number | null; celda: Celda }[];
  }[];
  /** Promedio del alumno en la escala del cuaderno (lo no entregado cuenta como 0, igual que en el del profesor). */
  promedio: number | null;
  promedioGrupo: number | null;
  /** Nota final según el plan de evaluación (solo si el curso tiene plan). */
  final?: { nota: number | null; promedioGrupo: number | null; ponderacionActual: number; sinCalificar: string[] };
}

/**
 * Cuaderno de calificaciones de un alumno: su fila del cuaderno del curso, solo con las actividades
 * cuyos resultados ya puede ver. Las entregas que el profesor aún no libera cuentan como pendientes.
 */
export function cuadernoAlumno(
  grupo: Grupo,
  actividades: Actividad[],
  entregas: Entrega[],
  matricula: string,
  ahora: Date = new Date(),
  sinEtiqueta?: string,
  /** Promedio (sobre 100) de sus actividades autoasignadas en el curso, si el profesor les da peso. */
  autoestudio100: number | null = null,
): CuadernoAlumno {
  const visibles = actividadesVisibles(actividades, grupo.id, ahora).filter((a) => resultadosDisponibles(a, ahora));
  const ids = new Set(visibles.map((a) => a.id));
  const liberadas = entregas
    .filter((e) => ids.has(e.actividadId))
    .map((e) => (e.estado === "aprobada" ? e : { ...e, resultados: [], calificacionManual: undefined }));
  const c: Cuaderno = cuadernoCurso(grupo, visibles, liberadas, sinEtiqueta);
  const fila = c.filas.find((f) => f.matricula === matricula);
  const calificadasPorActividad = new Map(visibles.map((a) => [a.id, liberadas.filter((e) => e.actividadId === a.id && calificada(e)).length]));
  const comparable = c.filas.filter((f) => f.promedio !== null).length >= MINIMO_COMPARACION;
  const plan = grupo.planEvaluacion;
  const nf = plan ? notaFinal(c, plan) : undefined;
  const peso = grupo.pesoAutoestudio ?? 0;
  return {
    escala: c.escala,
    grupos: c.grupos.map((g) => ({
      etiqueta: g.etiqueta,
      peso: plan ? pesoDe(plan, g.clave) : undefined,
      promedio: g.promedios[matricula] ?? null,
      promedioGrupo: comparable ? g.promedioGrupo : null,
      columnas: g.columnas.map((col) => ({
        id: col.id,
        titulo: col.titulo,
        fecha: col.fecha,
        escala: col.escala,
        cuenta: col.cuenta,
        promedioGrupo: (calificadasPorActividad.get(col.id) ?? 0) >= MINIMO_COMPARACION ? col.promedio : null,
        celda: fila?.celdas[col.id] ?? { valor: null, estado: "sin_resultados", manual: false },
      })),
    })),
    promedio: fila?.promedio ?? null,
    promedioGrupo: comparable ? c.promedioGrupo : null,
    final:
      peso > 0
        ? {
            // Con autoestudio, la nota final mezcla la del curso con el promedio de sus autoasignadas.
            nota: notaConAutoestudio(nf ? (nf.porAlumno.get(matricula) ?? null) : (fila?.promedio ?? null), autoestudio100, peso, c.escala),
            promedioGrupo: null,
            ponderacionActual: nf?.ponderacionActual ?? 100,
            sinCalificar: nf?.sinCalificar ?? [],
          }
        : nf && {
            nota: nf.porAlumno.get(matricula) ?? null,
            promedioGrupo: comparable ? nf.promedioGrupo : null,
            ponderacionActual: nf.ponderacionActual,
            sinCalificar: nf.sinCalificar,
          },
  };
}

export interface Acierto {
  nombre: string;
  /** Porcentaje de puntos logrados (0 a 100). */
  acierto: number;
  /** Puntos posibles con que se calculó. */
  puntos: number;
}

/** Porcentaje de puntos logrados por tema o por habilidad, en las entregas dadas (con su versión). */
function aciertoPor(campo: "tema" | "habilidad", pares: { actividad: Actividad; entrega: Entrega }[]): Acierto[] {
  const suma = new Map<string, { logrados: number; posibles: number }>();
  for (const { actividad, entrega } of pares) {
    const act = actividadDeVersion(actividad, entrega.version);
    for (const r of entrega.resultados) {
      const reactivo = act.reactivos.find((x) => x.numero === r.numero);
      const nombre = reactivo?.[campo]?.trim();
      if (!reactivo || !nombre || reactivo.puntos <= 0) continue;
      const s = suma.get(nombre) ?? { logrados: 0, posibles: 0 };
      s.logrados += Math.min(r.puntosObtenidos, reactivo.puntos);
      s.posibles += reactivo.puntos;
      suma.set(nombre, s);
    }
  }
  return [...suma.entries()]
    .map(([nombre, s]) => ({ nombre, acierto: r1((s.logrados / s.posibles) * 100), puntos: s.posibles }))
    .sort((a, b) => b.acierto - a.acierto || a.nombre.localeCompare(b.nombre, "es"));
}

export interface EvaluadaAlumno {
  id: string;
  titulo: string;
  fecha: string;
  etiqueta?: string;
  escala: Escala;
  /** En la escala de la actividad. */
  calificacion: number;
  /** Sobre 100, para comparar actividades con distinta escala. */
  sobre100: number;
  /** Promedio del grupo sobre 100 (solo si hay suficientes calificados). */
  grupo100: number | null;
}

export interface AnaliticasAlumnoCurso {
  evaluadas: EvaluadaAlumno[];
  /** Promedio sobre 100 de las actividades evaluadas. */
  promedio: number | null;
  mediana: number | null;
  /** Promedio del grupo sobre 100 en esas mismas actividades (si hay suficientes datos). */
  promedioGrupo: number | null;
  aprobadas: number;
  /** Entregadas de las actividades cuya recepción ya cerró o que ya entregó. */
  entregadas: number;
  esperadas: number;
  tasaEntrega: number;
  porTipo: { nombre: string; valor: number; cantidad: number }[];
  temas: Acierto[];
  habilidades: Acierto[];
}

/** Promedio del grupo sobre 100 en una actividad, o null si hay pocos calificados. */
function promedioGrupo100(actividad: Actividad, entregas: Entrega[]) {
  const cal = entregas.filter((e) => e.actividadId === actividad.id && e.estado === "aprobada" && calificada(e));
  if (cal.length < MINIMO_COMPARACION) return null;
  return r1(prom(cal.map((e) => (calificacion(actividad, e) / escalaDe(actividad)) * 100))!);
}

/** Analíticas de un alumno en un curso, con las actividades que ya tienen su calificación visible. */
export function analiticasAlumnoCurso(
  grupo: Grupo,
  actividades: Actividad[],
  entregas: Entrega[],
  matricula: string,
  ahora: Date = new Date(),
  sinEtiqueta = "Sin etiqueta",
): AnaliticasAlumnoCurso {
  const visibles = actividadesVisibles(actividades, grupo.id, ahora);
  const mia = (a: Actividad) => entregas.find((e) => e.actividadId === a.id && e.matricula === matricula);
  const pares = visibles
    .filter(conPuntaje)
    .map((a) => ({ actividad: a, entrega: mia(a) }))
    .filter((p): p is { actividad: Actividad; entrega: Entrega } => resultadoVisible(p.actividad, p.entrega, ahora))
    .sort((x, y) => x.actividad.fechaAplicacion.localeCompare(y.actividad.fechaAplicacion));
  const evaluadas: EvaluadaAlumno[] = pares.map(({ actividad: a, entrega: e }) => {
    const cal = calificacion(a, e);
    return {
      id: a.id,
      titulo: a.titulo,
      fecha: a.fechaAplicacion,
      etiqueta: a.etiqueta?.trim() || undefined,
      escala: escalaDe(a),
      calificacion: cal,
      sobre100: r1((cal / escalaDe(a)) * 100),
      grupo100: promedioGrupo100(a, entregas),
    };
  });
  const valores = evaluadas.map((x) => x.sobre100);
  const grupoValores = evaluadas.map((x) => x.grupo100);
  const p = prom(valores);
  const pg = grupoValores.length > 0 && grupoValores.every((v) => v !== null) ? prom(grupoValores as number[]) : null;

  // Entrega: cuentan las que ya entregó y las que ya cerraron sin entregar.
  const conEntrega = visibles.filter((a) => enviada(mia(a)) || estadoEnvio(a, ahora) === "cerrado");
  const entregadas = conEntrega.filter((a) => enviada(mia(a))).length;

  const tipos = new Map<string, number[]>();
  for (const x of evaluadas) {
    const k = x.etiqueta ?? sinEtiqueta;
    tipos.set(k, [...(tipos.get(k) ?? []), x.sobre100]);
  }

  return {
    evaluadas,
    promedio: p === null ? null : r1(p),
    mediana: valores.length ? r1(mediana(valores)) : null,
    promedioGrupo: pg === null ? null : r1(pg),
    aprobadas: valores.filter((v) => v >= APROBATORIA).length,
    entregadas,
    esperadas: conEntrega.length,
    tasaEntrega: conEntrega.length ? Math.round((entregadas / conEntrega.length) * 100) : 0,
    porTipo: [...tipos.entries()]
      .map(([nombre, vs]) => ({ nombre, valor: r1(prom(vs)!), cantidad: vs.length }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    temas: aciertoPor("tema", pares),
    habilidades: aciertoPor("habilidad", pares),
  };
}

export interface ReactivoAlumno {
  numero: number;
  tema: string;
  /** Porcentaje de puntos logrados por el alumno. */
  acierto: number;
  obtenidos: number;
  puntos: number;
  /** Porcentaje promedio del grupo (solo si hay suficientes calificados). */
  grupo: number | null;
}

export interface AnaliticasAlumnoActividad {
  escala: Escala;
  calificacion: number;
  sobre100: number;
  aprobada: boolean;
  /** Datos del grupo, solo si hay suficientes calificados. */
  grupo: { promedio: number; mediana: number; calificados: number } | null;
  reactivos: ReactivoAlumno[];
  temas: Acierto[];
  habilidades: Acierto[];
}

/** Analíticas de aprendizaje del alumno en una actividad ya liberada. */
export function analiticasAlumnoActividad(actividad: Actividad, entregas: Entrega[], matricula: string): AnaliticasAlumnoActividad | undefined {
  const propia = entregas.find((e) => e.actividadId === actividad.id && e.matricula === matricula);
  if (!propia || propia.estado !== "aprobada" || !calificada(propia)) return undefined;
  const escala = escalaDe(actividad);
  const cal = calificacion(actividad, propia);
  const calificadas = entregas.filter((e) => e.actividadId === actividad.id && e.estado === "aprobada" && calificada(e));
  const comparable = calificadas.length >= MINIMO_COMPARACION;
  const sobre100 = (e: Entrega) => (calificacion(actividad, e) / escala) * 100;

  const mia = actividadDeVersion(actividad, propia.version);
  const aciertoGrupo = (numero: number) => {
    const xs: number[] = [];
    for (const e of calificadas) {
      const r = e.resultados.find((x) => x.numero === numero);
      const reactivo = actividadDeVersion(actividad, e.version).reactivos.find((x) => x.numero === numero);
      if (r && reactivo && reactivo.puntos > 0) xs.push(Math.min(r.puntosObtenidos, reactivo.puntos) / reactivo.puntos);
    }
    return xs.length >= MINIMO_COMPARACION ? r1(prom(xs)! * 100) : null;
  };
  const reactivos: ReactivoAlumno[] = mia.reactivos
    .filter((r) => r.puntos > 0)
    .map((r) => {
      const res = propia.resultados.find((x) => x.numero === r.numero);
      const obtenidos = Math.min(res?.puntosObtenidos ?? 0, r.puntos);
      return { numero: r.numero, tema: r.tema, acierto: r1((obtenidos / r.puntos) * 100), obtenidos, puntos: r.puntos, grupo: comparable ? aciertoGrupo(r.numero) : null };
    })
    .filter((r) => propia.resultados.some((x) => x.numero === r.numero));

  return {
    escala,
    calificacion: cal,
    sobre100: r1(sobre100(propia)),
    aprobada: sobre100(propia) >= APROBATORIA,
    grupo: comparable
      ? { promedio: r1(prom(calificadas.map(sobre100))!), mediana: r1(mediana(calificadas.map(sobre100))), calificados: calificadas.length }
      : null,
    reactivos,
    temas: aciertoPor("tema", [{ actividad, entrega: propia }]),
    habilidades: aciertoPor("habilidad", [{ actividad, entrega: propia }]),
  };
}

/** Resumen de un curso para su tarjeta: actividades visibles, pendientes de entregar (sin cerrar) y promedio. */
export function resumenCursoAlumno(grupo: Grupo, actividades: Actividad[], entregas: Entrega[], matricula: string, ahora: Date = new Date()) {
  const visibles = actividadesVisibles(actividades, grupo.id, ahora);
  const mia = (a: Actividad) => entregas.find((e) => e.actividadId === a.id && e.matricula === matricula);
  const porEntregar = visibles.filter((a) => !enviada(mia(a)) && estadoEnvio(a, ahora) !== "cerrado").length;
  const an = analiticasAlumnoCurso(grupo, actividades, entregas, matricula, ahora);
  return { actividades: visibles.length, porEntregar, promedio: an.promedio, evaluadas: an.evaluadas.length };
}

/** Avance del alumno en una actividad, para el resumen de cada categoría. */
export type AvanceActividad = "terminada" | "en_proceso" | "sin_iniciar";

/**
 * Terminada si ya la envió y el profesor la aprobó; en proceso si la envió y falta evaluarla o si
 * empezó a contestarla (páginas o respuestas en la app sin enviar); sin iniciar en otro caso.
 */
export function avanceActividad(entrega?: Entrega): AvanceActividad {
  if (enviada(entrega)) return entrega!.estado === "aprobada" ? "terminada" : "en_proceso";
  if (entrega && (entrega.paginasRecibidas > 0 || (entrega.respuestas?.length ?? 0) > 0)) return "en_proceso";
  return "sin_iniciar";
}

export interface ResumenAvance {
  total: number;
  terminadas: number;
  enProceso: number;
  sinIniciar: number;
}

/** Cuenta cuántas hay en cada estado de avance. */
export function resumenAvance(estados: AvanceActividad[]): ResumenAvance {
  return {
    total: estados.length,
    terminadas: estados.filter((e) => e === "terminada").length,
    enProceso: estados.filter((e) => e === "en_proceso").length,
    sinIniciar: estados.filter((e) => e === "sin_iniciar").length,
  };
}

export interface CategoriaAlumno {
  /** Tipo de actividad (etiqueta); "" para las que no tienen. */
  etiqueta: string;
  items: (ActividadDelAlumno & { avance: AvanceActividad })[];
  resumen: ResumenAvance;
}

/**
 * Agrupa las actividades por categoría (tipo de actividad). Dentro de cada una van primero las
 * por entregar (por fecha de cierre), luego las sin programar y al final las entregadas. Las
 * categorías salen en el orden de su actividad más urgente, y las que no tienen tipo, al final.
 */
export function categoriasAlumno(items: ActividadDelAlumno[], ahora: Date = new Date()): CategoriaAlumno[] {
  const s = seccionesAlumno(items, ahora);
  const mapa = new Map<string, CategoriaAlumno>();
  for (const i of [...s.por_entregar, ...s.sin_programar, ...s.entregadas]) {
    const etiqueta = i.actividad.etiqueta?.trim() ?? "";
    const clave = etiqueta.toLocaleLowerCase("es");
    const c = mapa.get(clave) ?? { etiqueta, items: [], resumen: resumenAvance([]) };
    c.items.push({ ...i, avance: avanceActividad(i.entrega) });
    mapa.set(clave, c);
  }
  const lista = [...mapa.values()].map((c) => ({ ...c, resumen: resumenAvance(c.items.map((x) => x.avance)) }));
  return [...lista.filter((c) => c.etiqueta), ...lista.filter((c) => !c.etiqueta)];
}
