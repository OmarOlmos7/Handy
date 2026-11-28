// Seguimiento en actividades (etapa 2 del perfil CREAR): cada intento del alumno en una actividad o
// en sus casos equivalentes queda registrado con su logro por etapa, el tiempo y cuándo trabajó.
// Si no llega al 70 %, puede practicar con casos equivalentes (máximo 5); cuenta el último intento
// y los anteriores se conservan. Funciones puras: el llamador decide si la bandera está activa.
import { alumnoEnGrupo } from "../cuentas";
import { calificacion, escalaDe, puntosTotales } from "../estadisticas";
import { horaYDiaMexico } from "../tiempo";
import type { Actividad, Autoactividad, BaseDeDatos, Entrega, EtapaCrear, IntentoActividad } from "../tipos";
import { tieneConsentimiento } from "./consentimiento";
import { etapaDeReactivo, logroPorEtapa, nivelAlcanzado, porcentajesEtapa, UMBRAL_LOGRO } from "./etapas";

/** Casos equivalentes por actividad, como máximo. */
export const MAX_CASOS = 5;

type Db = Pick<BaseDeDatos, "grupos" | "cuentasAlumno" | "consentimientosPerfil" | "tiempos" | "modelosCrear"> & { intentosPerfil?: IntentoActividad[] };

/** Cuenta del alumno que aparece en el curso con esa matrícula. */
export function cuentaDeMatricula(db: Pick<BaseDeDatos, "grupos" | "cuentasAlumno">, grupoId: string, matricula: string) {
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) return undefined;
  return db.cuentasAlumno.find((c) => alumnoEnGrupo(grupo, c)?.matricula === matricula);
}

/** Agrega el intento o, si ya existe (misma entrega re-evaluada o mismo caso), lo actualiza. */
export function guardarIntento(db: { intentosPerfil?: IntentoActividad[] }, intento: Omit<IntentoActividad, "numero">): IntentoActividad {
  const lista = (db.intentosPerfil ??= []);
  const previo = lista.find((x) => x.alumnoId === intento.alumnoId && x.actividadId === intento.actividadId && x.origen === intento.origen && x.clave === intento.clave);
  if (previo) {
    Object.assign(previo, intento, { numero: previo.numero });
    return previo;
  }
  const numero = lista.filter((x) => x.alumnoId === intento.alumnoId && x.actividadId === intento.actividadId).length + 1;
  const nuevo = { ...intento, numero };
  lista.push(nuevo);
  return nuevo;
}

const cuando = (iso: string) => {
  const { dia, hora } = horaYDiaMexico(new Date(iso));
  return { fecha: iso, dia, hora };
};

/**
 * Registra el intento de una entrega recién evaluada, si el alumno tiene cuenta y consentimiento.
 * Devuelve el intento, o undefined si no se registró.
 */
export function registrarIntentoEntrega(db: Db, actividad: Actividad, entrega: Entrega, ahora: Date = new Date()): IntentoActividad | undefined {
  if (!entrega.resultados.length) return undefined;
  const cuenta = cuentaDeMatricula(db, actividad.grupoId, entrega.matricula);
  if (!cuenta || !tieneConsentimiento(db.consentimientosPerfil, cuenta.id)) return undefined;
  const total = puntosTotales(actividad);
  if (!(total > 0)) return undefined;
  const obtenidos = entrega.resultados.reduce((s, r) => s + r.puntosObtenidos, 0);
  const porEtapa = porcentajesEtapa(logroPorEtapa(actividad, entrega.resultados));
  const tiempo = db.tiempos?.find((t) => t.actividadId === actividad.id && t.matricula === entrega.matricula);
  const fecha = entrega.entregadaEn ?? entrega.evaluadaEn ?? ahora.toISOString();
  return guardarIntento(db, {
    alumnoId: cuenta.id,
    grupoId: actividad.grupoId,
    actividadId: actividad.id,
    origen: "actividad",
    clave: fecha,
    calificacion: Math.round((Math.min(total, obtenidos) / total) * 100),
    porEtapa,
    nivel: nivelAlcanzado(porEtapa),
    ...(tiempo?.segundos ? { segundos: tiempo.segundos } : {}),
    ...cuando(fecha),
    versionModelo: db.modelosCrear?.find((m) => m.grupoId === actividad.grupoId)?.version,
  });
}

/**
 * Logro por etapa de un caso equivalente: cada ejercicio hereda la etapa del reactivo de la
 * actividad con el mismo número (o el que le corresponde en orden) y pesa lo mismo.
 */
export function etapasDelCaso(actividad: Pick<Actividad, "reactivos">, caso: Pick<Autoactividad, "resultados">): Partial<Record<EtapaCrear, number>> {
  const reactivos = actividad.reactivos;
  if (!reactivos.length) return {};
  const logro: Partial<Record<EtapaCrear, { posible: number; obtenido: number }>> = {};
  (caso.resultados ?? []).forEach((res, i) => {
    const r = reactivos.find((x) => x.numero === res.numero) ?? reactivos[i % reactivos.length];
    const e = etapaDeReactivo(r);
    const x = (logro[e] ??= { posible: 0, obtenido: 0 });
    x.posible += 1;
    x.obtenido += Math.max(0, Math.min(1, res.logro));
  });
  return porcentajesEtapa(logro);
}

/** Registra el intento de un caso equivalente terminado. */
export function registrarIntentoCaso(db: Db, actividad: Actividad, caso: Autoactividad): IntentoActividad | undefined {
  if (!caso.casoDe || caso.estado !== "completada" || caso.calificacion === undefined) return undefined;
  if (!tieneConsentimiento(db.consentimientosPerfil, caso.alumnoId)) return undefined;
  const porEtapa = etapasDelCaso(actividad, caso);
  const fecha = caso.completadaEn ?? new Date().toISOString();
  return guardarIntento(db, {
    alumnoId: caso.alumnoId,
    grupoId: caso.grupoId,
    actividadId: actividad.id,
    origen: "caso",
    clave: caso.id,
    calificacion: Math.round(caso.calificacion),
    porEtapa,
    nivel: nivelAlcanzado(porEtapa),
    ...(caso.segundos ? { segundos: caso.segundos } : {}),
    ...cuando(fecha),
    versionModelo: db.modelosCrear?.find((m) => m.grupoId === caso.grupoId)?.version,
  });
}

/** Calificación sobre 100 del caso, llevada a la escala de la actividad (lo que se reporta). */
export function calificacionCasoEnEscala(actividad: Pick<Actividad, "escala">, sobre100: number): number {
  return escalaDe(actividad) === 100 ? Math.round(sobre100) : Math.round(sobre100) / 10;
}

export type EstadoCasos = "sinCalificar" | "aprobada" | "pendiente" | "disponible" | "limite";

export interface SeguimientoActividad {
  /** Calificación que cuenta (último intento), sobre 100. */
  calificacion: number | null;
  casos: Autoactividad[];
  /** Caso pedido que aún no termina. */
  pendiente?: Autoactividad;
  estado: EstadoCasos;
  /** true si agotó los 5 casos sin llegar al 70 %: se le invita a pedir asesoría. */
  asesoria: boolean;
}

/** Qué puede hacer el alumno con una actividad: si ya aprobó, si puede pedir otro caso o si llegó al límite. */
export function seguimientoActividad(actividad: Actividad, entrega: Entrega | undefined, autoactividades: Autoactividad[] | undefined, alumnoId: string): SeguimientoActividad {
  const casos = (autoactividades ?? []).filter((a) => a.alumnoId === alumnoId && a.casoDe?.actividadId === actividad.id).sort((a, b) => a.casoDe!.numero - b.casoDe!.numero);
  const pendiente = casos.find((c) => c.estado !== "completada");
  const conResultado = entrega && (entrega.resultados.length > 0 || entrega.calificacionManual !== undefined);
  const cal = conResultado ? Math.round((calificacion(actividad, entrega) / escalaDe(actividad)) * 100) : null;
  let estado: EstadoCasos;
  if (cal === null) estado = "sinCalificar";
  else if (cal >= UMBRAL_LOGRO) estado = "aprobada";
  else if (pendiente) estado = "pendiente";
  else if (casos.length >= MAX_CASOS) estado = "limite";
  else estado = "disponible";
  return { calificacion: cal, casos, pendiente, estado, asesoria: estado === "limite" };
}

/** Intentos del alumno en una actividad, en orden. */
export function intentosDe(lista: IntentoActividad[] | undefined, alumnoId: string, actividadId: string): IntentoActividad[] {
  return (lista ?? []).filter((x) => x.alumnoId === alumnoId && x.actividadId === actividadId).sort((a, b) => a.numero - b.numero);
}

/** Logro por etapa del alumno en el curso: promedio del último intento de cada actividad. */
export function perfilEtapasCurso(lista: IntentoActividad[] | undefined, alumnoId: string, grupoId: string): { porEtapa: Partial<Record<EtapaCrear, number>>; actividades: number; intentos: number } {
  const propios = (lista ?? []).filter((x) => x.alumnoId === alumnoId && x.grupoId === grupoId);
  const ultimos = new Map<string, IntentoActividad>();
  for (const x of propios) {
    const u = ultimos.get(x.actividadId);
    if (!u || x.numero > u.numero) ultimos.set(x.actividadId, x);
  }
  const sumas: Partial<Record<EtapaCrear, number[]>> = {};
  for (const x of ultimos.values()) for (const [e, v] of Object.entries(x.porEtapa) as [EtapaCrear, number][]) (sumas[e] ??= []).push(v);
  const porEtapa: Partial<Record<EtapaCrear, number>> = {};
  for (const [e, vs] of Object.entries(sumas) as [EtapaCrear, number[]][]) porEtapa[e] = Math.round(vs.reduce((s, v) => s + v, 0) / vs.length);
  return { porEtapa, actividades: ultimos.size, intentos: propios.length };
}

/** Texto para la IA que pide el caso equivalente: solo la rúbrica de la actividad, sin datos del alumno. */
export function peticionCaso(actividad: Pick<Actividad, "titulo" | "reactivos">, numero: number, reforzar: string[]): string {
  const reactivos = actividad.reactivos
    .slice(0, 10)
    .map((r) => `${r.numero}. (${r.tipo}; ${r.tema || "tema"}) ${r.enunciado.replace(/\s+/g, " ").slice(0, 300)}`)
    .join("\n");
  return [
    `Caso equivalente ${numero} de la actividad "${actividad.titulo}". Crea ejercicios equivalentes: los mismos conceptos, procedimiento y dificultad, con otros datos, valores y contexto. No copies los enunciados.`,
    reforzar.length ? `Refuerza en especial estas etapas: ${reforzar.join(", ")}.` : "",
    `Reactivos originales:\n${reactivos}`,
  ]
    .filter(Boolean)
    .join("\n");
}
