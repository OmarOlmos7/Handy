// Mapa del temario: la asignatura como grafo. Primera capa: cada unidad es un agrupamiento de color
// con sus temas como nodos; segunda capa: una unidad con sus temas y subtemas. Las líneas unen temas
// afines (de la misma unidad o de otras). Todo se calcula por código; la IA solo propone relaciones.
import type { Actividad, Asignatura, Entrega, RelacionTemario } from "./tipos";

export type TipoNodo = "unidad" | "tema" | "subtema";

export interface NodoTemario {
  clave: string;
  tipo: TipoNodo;
  nombre: string;
  /** Índice de la unidad (para el color). */
  unidad: number;
  /** Clave del nodo padre (la unidad del tema, el tema del subtema). */
  padre?: string;
}

const SEP = " › ";

export const claveUnidad = (u: string) => u;
export const claveTema = (u: string, t: string) => `${u}${SEP}${t}`;
export const claveSubtema = (u: string, t: string, s: string) => `${u}${SEP}${t}${SEP}${s}`;

/** Todos los nodos de la asignatura: unidades, temas y subtemas. */
export function nodosTemario(a: Pick<Asignatura, "unidades">): NodoTemario[] {
  const nodos: NodoTemario[] = [];
  a.unidades.forEach((u, i) => {
    nodos.push({ clave: claveUnidad(u.nombre), tipo: "unidad", nombre: u.nombre, unidad: i });
    for (const t of u.temas) {
      const ct = claveTema(u.nombre, t.nombre);
      nodos.push({ clave: ct, tipo: "tema", nombre: t.nombre, unidad: i, padre: u.nombre });
      for (const s of t.subtemas) nodos.push({ clave: claveSubtema(u.nombre, t.nombre, s), tipo: "subtema", nombre: s, unidad: i, padre: ct });
    }
  });
  return nodos;
}

// ---------- Temas afines ----------

const VACIAS = new Set(
  "de la el los las del y en a por para con un una que se su sus al lo como o e es son entre sobre sin mas más tipos tipo uso usos introduccion introducción concepto conceptos general generales parte partes the of and to in for with on an or its from".split(" "),
);

/** Palabras con significado de un nombre, sin numeración, acentos ni plurales simples. */
export function palabras(nombre: string): string[] {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[\divxlc]+(\.\d+)*[.)]?\s+/i, "")
    .replace(/^(unidad|bloque|tema|modulo)\s+\w+[.:)-]?\s*/, "")
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !VACIAS.has(w) && !/^\d+$/.test(w))
    .map((w) => (w.length > 4 ? w.replace(/(es|s)$/, "") : w));
}

function parecido(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const comunes = [...new Set(b)].filter((w) => sa.has(w)).length;
  return comunes / Math.min(sa.size, new Set(b).size);
}

/**
 * Relaciones entre temas y subtemas de unidades distintas que comparten palabras clave. Se usan
 * cuando la IA todavía no propuso relaciones (o junto con ellas).
 */
export function relacionesPorPalabras(a: Pick<Asignatura, "unidades">, max = 30): RelacionTemario[] {
  const nodos = nodosTemario(a).filter((n) => n.tipo !== "unidad");
  const pal = new Map(nodos.map((n) => [n.clave, palabras(n.nombre)]));
  const pares: { a: string; b: string; p: number }[] = [];
  for (let i = 0; i < nodos.length; i++)
    for (let j = i + 1; j < nodos.length; j++) {
      const x = nodos[i];
      const y = nodos[j];
      if (x.unidad === y.unidad) continue;
      const p = parecido(pal.get(x.clave)!, pal.get(y.clave)!);
      if (p >= 0.5) pares.push({ a: x.clave, b: y.clave, p });
    }
  return pares
    .sort((x, y) => y.p - x.p)
    .slice(0, max)
    .map(({ a, b }) => ({ a, b }));
}

/** Relaciones válidas (las dos claves existen y son distintas), sin repetir. */
export function relacionesValidas(a: Pick<Asignatura, "unidades" | "relaciones">): RelacionTemario[] {
  const claves = new Set(nodosTemario(a).filter((n) => n.tipo !== "unidad").map((n) => n.clave));
  const vistas = new Set<string>();
  const propias = (a.relaciones ?? []).filter((r) => claves.has(r.a) && claves.has(r.b) && r.a !== r.b);
  return [...propias, ...relacionesPorPalabras(a)].filter((r) => {
    const k = [r.a, r.b].sort().join("|");
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}

/** Tema al que pertenece una clave (el mismo si es tema; el padre si es subtema). */
export function temaDe(clave: string) {
  const partes = clave.split(SEP);
  return partes.length >= 3 ? partes.slice(0, 2).join(SEP) : clave;
}
export function unidadDe(clave: string) {
  return clave.split(SEP)[0];
}

// ---------- Avance por tema ----------

export interface ActividadEnTema {
  id: string;
  titulo: string;
  /** Calificación en porcentaje (0-100), o null si aún no hay. */
  porcentaje: number | null;
  /** El alumno ya la entregó (solo en la vista del alumno). */
  entregada?: boolean;
}

export interface AvanceNodo {
  actividades: ActividadEnTema[];
  /** Promedio de las actividades calificadas, en porcentaje; null si no hay. */
  promedio: number | null;
}

/** Claves que cubre una actividad: los temas y subtemas elegidos, o toda la unidad si no eligió. */
export function clavesDeActividad(a: Pick<Asignatura, "id" | "unidades">, act: Pick<Actividad, "temario">): string[] {
  const t = act.temario;
  if (!t || t.asignaturaId !== a.id) return [];
  const u = a.unidades.find((x) => x.nombre === t.unidad);
  if (!u) return [];
  const elegidos = new Set(t.temas);
  const claves: string[] = [];
  for (const tm of u.temas) {
    if (elegidos.has(tm.nombre)) claves.push(claveTema(u.nombre, tm.nombre));
    for (const s of tm.subtemas) if (elegidos.has(s)) claves.push(claveSubtema(u.nombre, tm.nombre, s));
  }
  return claves.length ? claves : [claveUnidad(u.nombre)];
}

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

/**
 * Avance de cada unidad, tema y subtema. `calificar` da el porcentaje de una actividad (del alumno
 * o del grupo) o null si aún no hay calificación. Un tema suma lo de sus subtemas; una unidad, todo.
 */
export function avanceTemario(
  a: Pick<Asignatura, "id" | "unidades">,
  actividades: Pick<Actividad, "id" | "titulo" | "temario">[],
  calificar: (actividadId: string) => { porcentaje: number | null; entregada?: boolean },
): Record<string, AvanceNodo> {
  const directo = new Map<string, ActividadEnTema[]>();
  for (const act of actividades) {
    const claves = clavesDeActividad(a, act);
    if (!claves.length) continue;
    const c = calificar(act.id);
    const item: ActividadEnTema = { id: act.id, titulo: act.titulo, porcentaje: c.porcentaje, entregada: c.entregada };
    for (const k of claves) directo.set(k, [...(directo.get(k) ?? []), item]);
  }
  const resultado: Record<string, AvanceNodo> = {};
  for (const n of nodosTemario(a)) {
    // Lo propio y lo de sus descendientes (sin repetir actividades).
    const prefijo = n.clave + SEP;
    const lista = [...directo.entries()].filter(([k]) => k === n.clave || k.startsWith(prefijo)).flatMap(([, v]) => v);
    const unicas = [...new Map(lista.map((x) => [x.id, x])).values()];
    resultado[n.clave] = { actividades: unicas, promedio: promedio(unicas.map((x) => x.porcentaje).filter((x): x is number => x !== null)) };
  }
  return resultado;
}

/** Porcentaje de una calificación en su escala. */
export function aPorcentaje(cal: number, escala: number) {
  return Math.round((cal / escala) * 1000) / 10;
}

/** Porcentaje promedio del grupo en una actividad, con las entregas ya liberadas. */
export function porcentajeGrupo<E extends Pick<Entrega, "estado">>(entregas: E[], cal: (e: E) => number, escala: number): number | null {
  const ok = entregas.filter((e) => e.estado === "aprobada");
  return ok.length ? promedio(ok.map((e) => aPorcentaje(cal(e), escala))) : null;
}

// ---------- Ruta del alumno ----------

export const MAX_RUTA = 60;

/** Deja en la ruta solo claves que existen, sin repetir y con un máximo. */
export function limpiarRuta(a: Pick<Asignatura, "unidades">, nodos: unknown): string[] {
  const claves = new Set(nodosTemario(a).filter((n) => n.tipo !== "unidad").map((n) => n.clave));
  return [...new Set((Array.isArray(nodos) ? nodos : []).filter((x): x is string => typeof x === "string" && claves.has(x)))].slice(0, MAX_RUTA);
}

// ---------- Acomodo de los nodos (coordenadas del SVG) ----------

export interface Punto {
  x: number;
  y: number;
}

export interface Agrupamiento {
  clave: string;
  nombre: string;
  unidad: number;
  x: number;
  y: number;
  r: number;
}

export interface Acomodo {
  ancho: number;
  alto: number;
  grupos: Agrupamiento[];
  posiciones: Record<string, Punto>;
}

/** Puntos repartidos en anillos dentro de un círculo de radio r (el primero, al centro si hay muchos). */
function anillos(n: number, cx: number, cy: number, r: number, giro = -Math.PI / 2): Punto[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: cx, y: cy }];
  const puntos: Punto[] = [];
  // Hasta 7 en un anillo; si son más, un anillo interior.
  const exterior = n <= 7 ? n : Math.ceil(n * 0.62);
  const interior = n - exterior;
  for (let i = 0; i < exterior; i++) {
    const ang = giro + (2 * Math.PI * i) / exterior;
    puntos.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  if (interior === 1) puntos.push({ x: cx, y: cy });
  else
    for (let i = 0; i < interior; i++) {
      const ang = giro + Math.PI / interior + (2 * Math.PI * i) / interior;
      puntos.push({ x: cx + r * 0.45 * Math.cos(ang), y: cy + r * 0.45 * Math.sin(ang) });
    }
  return puntos;
}

/** Primera capa: cada unidad es un círculo de color con sus temas adentro. */
export function acomodoGeneral(a: Pick<Asignatura, "unidades">): Acomodo {
  const n = a.unidades.length;
  const radios = a.unidades.map((u) => 90 + 26 * Math.sqrt(Math.max(1, u.temas.length)));
  const rMax = Math.max(...radios, 90);
  const celda = rMax * 2 + 70;
  // Tres unidades en triángulo, como el diagrama de agrupamientos; más, en filas alternadas.
  const columnas = n <= 2 ? Math.max(1, n) : n === 3 ? 2 : n <= 8 ? Math.ceil(n / 2) : Math.ceil(Math.sqrt(n * 1.6));
  const filas = Math.ceil(n / columnas);
  const centros: Punto[] = [];
  for (let i = 0; i < n; i++) {
    const fila = Math.floor(i / columnas);
    const col = i % columnas;
    const enFila = Math.min(columnas, n - fila * columnas);
    // Fila incompleta: centrada; filas impares completas: media celda a la derecha.
    const corrimiento = enFila < columnas ? ((columnas - enFila) * celda) / 2 : fila % 2 === 1 ? celda / 2 : 0;
    centros.push({ x: col * celda + celda / 2 + corrimiento, y: fila * celda * 0.88 + celda / 2 });
  }
  const ancho = columnas * celda + (filas > 1 && n !== 3 && n % columnas === 0 ? celda / 2 : 0);
  const alto = (filas - 1) * celda * 0.88 + celda;
  const grupos: Agrupamiento[] = [];
  const posiciones: Record<string, Punto> = {};
  a.unidades.forEach((u, i) => {
    const { x, y } = centros[i];
    grupos.push({ clave: claveUnidad(u.nombre), nombre: u.nombre, unidad: i, x, y, r: radios[i] });
    posiciones[claveUnidad(u.nombre)] = { x, y };
    anillos(u.temas.length, x, y, radios[i] * 0.62, -Math.PI / 2 + i).forEach((p, j) => {
      posiciones[claveTema(u.nombre, u.temas[j].nombre)] = p;
    });
  });
  return { ancho: Math.max(ancho, 300), alto: Math.max(alto, 300), grupos, posiciones };
}

/** Segunda capa: una unidad con sus temas en círculo y los subtemas alrededor de cada tema. */
export function acomodoUnidad(a: Pick<Asignatura, "unidades">, unidad: number): Acomodo {
  const u = a.unidades[unidad];
  const posiciones: Record<string, Punto> = {};
  if (!u) return { ancho: 800, alto: 600, grupos: [], posiciones };
  const nt = u.temas.length;
  const maxSub = Math.max(0, ...u.temas.map((t) => t.subtemas.length));
  const rSub = 70 + 8 * Math.min(maxSub, 8);
  const rTemas = nt <= 1 ? 0 : Math.max(170, ((rSub * 2 + 30) * nt) / (2 * Math.PI));
  const lado = (rTemas + rSub + 90) * 2;
  const c = lado / 2;
  const grupos: Agrupamiento[] = [];
  u.temas.forEach((t, j) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * j) / Math.max(1, nt);
    const x = c + rTemas * Math.cos(ang);
    const y = c + rTemas * Math.sin(ang);
    const ct = claveTema(u.nombre, t.nombre);
    posiciones[ct] = { x, y };
    grupos.push({ clave: ct, nombre: t.nombre, unidad, x, y, r: t.subtemas.length ? rSub : 46 });
    // Subtemas en abanico, del lado de afuera del tema (la etiqueta del tema queda del lado de adentro).
    const ns = t.subtemas.length;
    const medio = nt <= 1 ? Math.PI * 0.8 : ns <= 3 ? Math.PI * 0.39 : Math.PI * 0.5;
    t.subtemas.forEach((s, k) => {
      const a2 = ang + (ns === 1 ? 0 : -medio + (2 * medio * k) / (ns - 1));
      posiciones[claveSubtema(u.nombre, t.nombre, s)] = { x: x + rSub * 0.8 * Math.cos(a2), y: y + rSub * 0.8 * Math.sin(a2) };
    });
  });
  return { ancho: lado, alto: lado, grupos, posiciones };
}

/** Colores de las unidades (relleno claro del agrupamiento y color del nodo). */
export const COLORES_UNIDAD = [
  { fondo: "#bfd7ee", borde: "#5b8bbf", nodo: "#2f6aa3" },
  { fondo: "#d4e3b5", borde: "#86a356", nodo: "#5f7f2e" },
  { fondo: "#f6c9a4", borde: "#d9894a", nodo: "#c8611a" },
  { fondo: "#d9c9ec", borde: "#9677c2", nodo: "#6d48a6" },
  { fondo: "#f5c6d6", borde: "#d17a99", nodo: "#b23f68" },
  { fondo: "#bfe5e0", borde: "#4fa79b", nodo: "#227a6f" },
  { fondo: "#f5e2a8", borde: "#c9a53b", nodo: "#9a7a12" },
  { fondo: "#e0d4c8", borde: "#9c8268", nodo: "#6e5640" },
];
export const colorUnidad = (i: number) => COLORES_UNIDAD[i % COLORES_UNIDAD.length];

/** Color del avance: verde (dominado), ámbar (en proceso), rojo (por reforzar) o gris (sin actividades). */
export function colorAvance(p: number | null | undefined) {
  if (p === null || p === undefined) return "#94a3b8";
  if (p >= 80) return "#16a34a";
  if (p >= 60) return "#d97706";
  return "#dc2626";
}
