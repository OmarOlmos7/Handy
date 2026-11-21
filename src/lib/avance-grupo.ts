// Avance de un grupo en el temario: qué parte de las actividades de cada unidad y tema ya
// realizaron los alumnos, quién va adelante o atrás, cuánto tiempo dedican y a qué horas trabajan.
// Todo se calcula aquí; la página solo lo muestra.
import { calificacion, escalaDe } from "./estadisticas";
import { aPorcentaje, claveTema, clavesDeActividad, temaDe } from "./mapa-temario";
import { actividadVisible } from "./periodo";
import { horaYDiaMexico } from "./tiempo";
import type { Actividad, Asignatura, Entrega, Grupo, TiempoActividad } from "./tipos";

/** Una actividad cuenta como realizada en cuanto el alumno la entrega. */
export const realizada = (e: Pick<Entrega, "estado"> | undefined) => Boolean(e && e.estado !== "sin_entregar");

export { colorProgreso } from "./mapa-temario";

const prom = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export interface AvanceUnidad {
  nombre: string;
  indice: number;
  actividades: number;
  /** Porcentaje de actividades realizadas (alumnos × actividades); null si la unidad no tiene actividades. */
  avance: number | null;
  /** Alumnos que ya realizaron todas las actividades de la unidad. */
  terminaron: number;
  promedio: number | null;
  segundos: number;
}

export interface AvanceTema {
  clave: string;
  nombre: string;
  unidad: number;
  avance: number;
  promedio: number | null;
  segundos: number;
  actividades: number;
}

export interface AvanceAlumno {
  matricula: string;
  nombre: string;
  avance: number;
  realizadas: number;
  total: number;
  promedio: number | null;
  segundos: number;
  unidadesTerminadas: number;
}

export interface Insight {
  tipo: "alerta" | "oportunidad" | "logro" | "dato";
  /** Clave del texto (en el diccionario) y sus valores. */
  clave: string;
  valores: Record<string, string | number>;
}

export interface AvanceGrupo {
  unidades: AvanceUnidad[];
  temas: AvanceTema[];
  alumnos: AvanceAlumno[];
  /** Porcentaje (de 0 a 100) por clave del mapa: temas, subtemas y unidades. */
  porClave: Record<string, number>;
  /** Porcentaje del grupo que ya realizó cada actividad ligada al temario (por id). */
  porActividad: Record<string, number>;
  resumen: {
    unidadesTerminadas: number;
    unidadesSinIniciar: number;
    unidadesEnProceso: number;
    /** Avance promedio de las unidades en proceso. */
    avanceEnProceso: number | null;
    totalUnidades: number;
    realizadas: number;
    posibles: number;
    avance: number;
    segundos: number;
    actividades: number;
  };
  horas: { segundos: number[]; entregas: number[] };
  dias: { segundos: number[]; entregas: number[] };
  insights: Insight[];
}

/** Avance del grupo en una asignatura, con las actividades del grupo ligadas a ella. */
export function avanceGrupo(
  asignatura: Pick<Asignatura, "id" | "unidades">,
  grupo: Pick<Grupo, "id" | "alumnos">,
  actividadesTodas: Actividad[],
  entregasTodas: Entrega[],
  tiemposTodos: TiempoActividad[] = [],
  ahora = new Date(),
): AvanceGrupo {
  const alumnos = grupo.alumnos;
  const nA = alumnos.length;
  const actividades = actividadesTodas.filter((a) => a.grupoId === grupo.id && a.temario?.asignaturaId === asignatura.id && actividadVisible(a, ahora));
  const ids = new Set(actividades.map((a) => a.id));
  const entregas = entregasTodas.filter((e) => ids.has(e.actividadId) && alumnos.some((x) => x.matricula === e.matricula));
  const tiempos = tiemposTodos.filter((t) => ids.has(t.actividadId) && alumnos.some((x) => x.matricula === t.matricula));
  const entrega = (act: string, m: string) => entregas.find((e) => e.actividadId === act && e.matricula === m);
  const nota = (act: Actividad, m: string) => {
    const e = entrega(act.id, m);
    return e && (e.estado === "evaluada" || e.estado === "aprobada") ? aPorcentaje(calificacion(act, e), escalaDe(act)) : null;
  };
  const segundosDe = (act: string, m?: string) => tiempos.filter((t) => t.actividadId === act && (!m || t.matricula === m)).reduce((s, t) => s + t.segundos, 0);
  const hechas = (act: Actividad) => alumnos.filter((x) => realizada(entrega(act.id, x.matricula))).length;
  const notasDe = (acts: Actividad[]) => acts.flatMap((a) => alumnos.map((x) => nota(a, x.matricula)).filter((x): x is number => x !== null));

  // Unidades
  const actsDeUnidad = asignatura.unidades.map((u) => actividades.filter((a) => a.temario!.unidad === u.nombre));
  const unidades: AvanceUnidad[] = asignatura.unidades.map((u, i) => {
    const acts = actsDeUnidad[i];
    const posibles = acts.length * nA;
    const hechasU = acts.reduce((s, a) => s + hechas(a), 0);
    return {
      nombre: u.nombre,
      indice: i,
      actividades: acts.length,
      avance: acts.length && nA ? pct(hechasU, posibles) : null,
      terminaron: acts.length ? alumnos.filter((x) => acts.every((a) => realizada(entrega(a.id, x.matricula)))).length : 0,
      promedio: prom(notasDe(acts)),
      segundos: acts.reduce((s, a) => s + segundosDe(a.id), 0),
    };
  });

  // Temas: cada actividad cuenta en los temas que cubre (o en todos los de su unidad si no eligió).
  const actsDeTema = new Map<string, Actividad[]>();
  for (const a of actividades) {
    const claves = clavesDeActividad(asignatura, a).map(temaDe);
    const u = asignatura.unidades.find((x) => x.nombre === a.temario!.unidad);
    const temasAct = claves.some((c) => c.includes(" › ")) ? [...new Set(claves.filter((c) => c.includes(" › ")))] : (u?.temas.map((t) => claveTema(u.nombre, t.nombre)) ?? []);
    for (const c of temasAct) actsDeTema.set(c, [...(actsDeTema.get(c) ?? []), a]);
  }
  const temas: AvanceTema[] = [];
  asignatura.unidades.forEach((u, i) =>
    u.temas.forEach((t) => {
      const clave = claveTema(u.nombre, t.nombre);
      const acts = actsDeTema.get(clave) ?? [];
      // El tiempo de una actividad se reparte entre los temas que cubre.
      const segundos = acts.reduce((s, a) => s + segundosDe(a.id) / Math.max(1, temasDeActividad(a)), 0);
      temas.push({
        clave,
        nombre: t.nombre,
        unidad: i,
        actividades: acts.length,
        avance: acts.length && nA ? pct(acts.reduce((s, a) => s + hechas(a), 0), acts.length * nA) : 0,
        promedio: prom(notasDe(acts)),
        segundos: Math.round(segundos),
      });
    }),
  );
  function temasDeActividad(a: Actividad) {
    let n = 0;
    for (const acts of actsDeTema.values()) if (acts.includes(a)) n++;
    return n;
  }

  // Alumnos
  const alumnosAv: AvanceAlumno[] = alumnos.map((x) => {
    const realizadas = actividades.filter((a) => realizada(entrega(a.id, x.matricula))).length;
    const notas = actividades.map((a) => nota(a, x.matricula)).filter((n): n is number => n !== null);
    return {
      matricula: x.matricula,
      nombre: x.nombre,
      realizadas,
      total: actividades.length,
      avance: pct(realizadas, actividades.length),
      promedio: prom(notas),
      segundos: tiempos.filter((t) => t.matricula === x.matricula).reduce((s, t) => s + t.segundos, 0),
      unidadesTerminadas: actsDeUnidad.filter((acts) => acts.length && acts.every((a) => realizada(entrega(a.id, x.matricula)))).length,
    };
  });

  const porClave: Record<string, number> = {};
  for (const u of unidades) if (u.avance !== null) porClave[u.nombre] = u.avance;
  for (const t of temas) if (t.actividades) porClave[t.clave] = t.avance;

  const conAvance = unidades.map((u) => u.avance ?? 0);
  const enProceso = conAvance.filter((p) => p > 0 && p < 100);
  const posibles = actividades.length * nA;
  const realizadasTot = actividades.reduce((s, a) => s + hechas(a), 0);

  // Horarios: tiempo con la actividad abierta y entregas, por hora y por día (centro de México).
  const horas = { segundos: new Array(24).fill(0), entregas: new Array(24).fill(0) };
  const dias = { segundos: new Array(7).fill(0), entregas: new Array(7).fill(0) };
  for (const t of tiempos) {
    t.porHora.forEach((s, h) => (horas.segundos[h] += s));
    t.porDia.forEach((s, d) => (dias.segundos[d] += s));
  }
  for (const e of entregas) {
    const f = e.primeraEntregaEn ?? e.entregadaEn;
    if (!f || !realizada(e)) continue;
    const { hora, dia } = horaYDiaMexico(new Date(f));
    horas.entregas[hora]++;
    dias.entregas[dia]++;
  }

  const resumen = {
    unidadesTerminadas: conAvance.filter((p) => p >= 100).length,
    unidadesSinIniciar: conAvance.filter((p) => p <= 0).length,
    unidadesEnProceso: enProceso.length,
    avanceEnProceso: prom(enProceso),
    totalUnidades: unidades.length,
    realizadas: realizadasTot,
    posibles,
    avance: pct(realizadasTot, posibles),
    segundos: tiempos.reduce((s, t) => s + t.segundos, 0),
    actividades: actividades.length,
  };

  return {
    unidades,
    temas,
    alumnos: alumnosAv,
    porClave,
    porActividad: Object.fromEntries(actividades.map((a) => [a.id, pct(hechas(a), nA)])),
    resumen,
    horas,
    dias,
    insights: insights({ unidades, temas, alumnos: alumnosAv, actividades, hechas, nA, horas, dias, tiempos: tiempos.length }),
  };
}

/** Sugerencias para actuar, a partir de los números del avance (sin IA). */
function insights(d: {
  unidades: AvanceUnidad[];
  temas: AvanceTema[];
  alumnos: AvanceAlumno[];
  actividades: Actividad[];
  hechas: (a: Actividad) => number;
  nA: number;
  horas: { segundos: number[]; entregas: number[] };
  dias: { segundos: number[]; entregas: number[] };
  tiempos: number;
}): Insight[] {
  const r: Insight[] = [];
  if (!d.actividades.length || !d.nA) return [{ tipo: "dato", clave: "sinActividades", valores: {} }];

  const conActs = d.unidades.filter((u) => u.avance !== null);
  const rezagada = [...conActs].sort((a, b) => a.avance! - b.avance!)[0];
  if (rezagada && rezagada.avance! < 60) r.push({ tipo: "alerta", clave: "unidadRezagada", valores: { u: rezagada.nombre, p: rezagada.avance! } });

  const sinNada = d.alumnos.filter((a) => a.realizadas === 0);
  if (sinNada.length)
    r.push({ tipo: "alerta", clave: "sinEntregas", valores: { n: sinNada.length, nombres: sinNada.slice(0, 3).map((a) => a.nombre).join(", ") + (sinNada.length > 3 ? "…" : "") } });

  const riesgo = d.alumnos.filter((a) => a.realizadas > 0 && a.avance < 50);
  if (riesgo.length) r.push({ tipo: "alerta", clave: "alumnosRiesgo", valores: { n: riesgo.length } });

  const baja = d.actividades
    .map((a) => ({ a, p: (d.hechas(a) / d.nA) * 100 }))
    .sort((x, y) => x.p - y.p)[0];
  if (baja && baja.p < 60) r.push({ tipo: "oportunidad", clave: "actividadBaja", valores: { a: baja.a.titulo, p: Math.round(baja.p) } });

  const conTiempo = d.temas.filter((t) => t.segundos > 0);
  if (conTiempo.length) {
    const mucho = [...conTiempo].sort((a, b) => b.segundos - a.segundos)[0];
    if (mucho.promedio !== null && mucho.promedio < 70)
      r.push({ tipo: "oportunidad", clave: "temaDificil", valores: { t: mucho.nombre, min: Math.round(mucho.segundos / 60), p: mucho.promedio } });
  }
  const bajos = d.temas.filter((t) => t.promedio !== null && t.promedio < 60).sort((a, b) => a.promedio! - b.promedio!);
  if (bajos.length) r.push({ tipo: "oportunidad", clave: "temaBajo", valores: { t: bajos[0].nombre, p: bajos[0].promedio! } });

  // Horario pico: la ventana de 3 horas con más tiempo (o más entregas si aún no hay tiempo medido).
  const serie = d.horas.segundos.some((s) => s > 0) ? d.horas.segundos : d.horas.entregas;
  if (serie.some((s) => s > 0)) {
    let mejor = 0;
    let suma = -1;
    for (let h = 0; h < 24; h++) {
      const s = serie[h] + serie[(h + 1) % 24] + serie[(h + 2) % 24];
      if (s > suma) {
        suma = s;
        mejor = h;
      }
    }
    r.push({ tipo: "dato", clave: "horarioPico", valores: { de: mejor, a: (mejor + 3) % 24 } });
    const total = serie.reduce((s, x) => s + x, 0);
    const noche = [22, 23, 0, 1, 2, 3, 4].reduce((s, h) => s + serie[h], 0);
    if (total && noche / total >= 0.25) r.push({ tipo: "oportunidad", clave: "trasnochan", valores: { p: Math.round((noche / total) * 100) } });
  }
  const serieDias = d.dias.segundos.some((s) => s > 0) ? d.dias.segundos : d.dias.entregas;
  if (serieDias.some((s) => s > 0)) r.push({ tipo: "dato", clave: "diaPico", valores: { d: serieDias.indexOf(Math.max(...serieDias)) } });

  const logradas = conActs.filter((u) => u.terminaron >= d.nA * 0.8);
  if (logradas.length) r.push({ tipo: "logro", clave: "unidadLograda", valores: { u: logradas.map((u) => u.nombre).join(", ") } });
  const top = [...d.alumnos].sort((a, b) => b.avance - a.avance || (b.promedio ?? 0) - (a.promedio ?? 0))[0];
  if (top && top.avance >= 80) r.push({ tipo: "logro", clave: "alumnoDestacado", valores: { nombre: top.nombre, p: top.avance } });
  if (!d.tiempos) r.push({ tipo: "dato", clave: "sinTiempo", valores: {} });
  return r;
}
