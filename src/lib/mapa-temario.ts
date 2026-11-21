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
  const claves = new Set(nodosTemario(a).map((n) => n.clave));
  const vistas = new Set<string>();
  // Una relación con una unidad completa solo vale entre unidades distintas.
  const conUnidad = (r: RelacionTemario) => !r.a.includes(SEP) || !r.b.includes(SEP);
  const propias = (a.relaciones ?? []).filter((r) => claves.has(r.a) && claves.has(r.b) && r.a !== r.b && (!conUnidad(r) || unidadDe(r.a) !== unidadDe(r.b)));
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

export interface RelacionUnidades {
  /** Índices de las dos unidades (a < b). */
  a: number;
  b: number;
  /** Relaciones entre temas o subtemas de las dos unidades. */
  n: number;
  /**
   * true si la relación es con la unidad completa: la IA la propuso así, o todos los temas de una de
   * las dos unidades (al menos dos) tienen un tema afín en la otra. Se dibuja de centro a centro.
   */
  completa: boolean;
  motivo?: string;
}

/** Relaciones entre pares de unidades, a partir de las relaciones entre temas y unidades. */
export function relacionesDeUnidades(a: Pick<Asignatura, "unidades">, relaciones: RelacionTemario[]): RelacionUnidades[] {
  const indice = new Map(a.unidades.map((u, i) => [u.nombre, i]));
  const pares = new Map<string, RelacionUnidades & { temas: [Set<string>, Set<string>] }>();
  for (const r of relaciones) {
    const ia = indice.get(unidadDe(r.a));
    const ib = indice.get(unidadDe(r.b));
    if (ia === undefined || ib === undefined || ia === ib) continue;
    const [x, y, cx, cy] = ia < ib ? [ia, ib, r.a, r.b] : [ib, ia, r.b, r.a];
    const k = `${x}|${y}`;
    const par = pares.get(k) ?? { a: x, b: y, n: 0, completa: false, temas: [new Set<string>(), new Set<string>()] };
    pares.set(k, par);
    if (!cx.includes(SEP) || !cy.includes(SEP)) {
      par.completa = true;
      par.motivo ??= r.motivo;
      continue;
    }
    par.n++;
    par.temas[0].add(temaDe(cx));
    par.temas[1].add(temaDe(cy));
  }
  return [...pares.values()].map(({ temas, ...par }) => {
    const cubre = (i: number, t: Set<string>) => a.unidades[i].temas.length >= 2 && t.size >= a.unidades[i].temas.length;
    return { ...par, completa: par.completa || cubre(par.a, temas[0]) || cubre(par.b, temas[1]) };
  });
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
  if (n === 1) return [{ x: cx + r * 0.6 * Math.cos(giro), y: cy + r * 0.6 * Math.sin(giro) }];
  const puntos: Punto[] = [];
  // Hasta 7 en un anillo; si son más, un anillo interior. El centro queda libre para el nodo de la unidad.
  let exterior = n <= 7 ? n : Math.ceil(n * 0.62);
  if (n - exterior === 1) exterior = n;
  const interior = n - exterior;
  for (let i = 0; i < exterior; i++) {
    const ang = giro + (2 * Math.PI * i) / exterior;
    puntos.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  for (let i = 0; i < interior; i++) {
    const ang = giro + Math.PI / interior + (2 * Math.PI * i) / interior;
    puntos.push({ x: cx + r * 0.5 * Math.cos(ang), y: cy + r * 0.5 * Math.sin(ang) });
  }
  return puntos;
}

/**
 * Primera capa: cada unidad es un círculo de color con sus temas adentro. Las unidades se acomodan
 * como un sistema de resortes: las que tienen más temas afines quedan más cerca, ninguna se encima,
 * y el conjunto se extiende a lo ancho. Dentro de cada unidad, los temas con afines en otra unidad
 * miran hacia ella. Siempre da el mismo resultado para el mismo temario.
 */
export function acomodoGeneral(
  a: Pick<Asignatura, "unidades">,
  relaciones: RelacionTemario[] = [],
  /** Espacio extra entre unidades y arriba de cada una (p. ej. para el indicador de avance). */
  opciones: { espacio?: number; arriba?: number } = {},
): Acomodo {
  const n = a.unidades.length;
  const radios = a.unidades.map((u) => 80 + 26 * Math.sqrt(Math.max(1, u.temas.length)) + 6 * Math.max(0, u.temas.length - 7));
  const ESPACIO = opciones.espacio ?? 70; // entre círculos, para los nombres de las unidades
  const porUnidades = relacionesDeUnidades(a, relaciones);
  const peso = (x: RelacionUnidades) => x.n + (x.completa ? 4 : 0);

  // Posición inicial: una elipse ancha en el orden del temario.
  const total = radios.reduce((s, r) => s + r, 0);
  const pos = radios.map((_, i) => {
    const ang = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    return { x: total * 0.55 * Math.cos(ang), y: total * 0.28 * Math.sin(ang) };
  });
  const maxPeso = Math.max(1, ...porUnidades.map(peso));
  for (let paso = 0; paso < 500; paso++) {
    const calor = 1 - paso / 500;
    const mov = pos.map(() => ({ x: 0, y: 0 }));
    // Resortes entre unidades relacionadas.
    for (const par of porUnidades) {
      const p = pos[par.a];
      const q = pos[par.b];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const ideal = radios[par.a] + radios[par.b] + ESPACIO;
      const f = (0.04 + (0.1 * peso(par)) / maxPeso) * (d - ideal);
      mov[par.a].x += (f * dx) / d;
      mov[par.a].y += (f * dy) / d;
      mov[par.b].x -= (f * dx) / d;
      mov[par.b].y -= (f * dy) / d;
    }
    // Las unidades sin relación se alejan un poco; gravedad hacia el centro, más fuerte en vertical.
    for (let i = 0; i < n; i++) {
      for (let k = i + 1; k < n; k++) {
        const dx = pos[k].x - pos[i].x;
        const dy = pos[k].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 1;
        const lejos = (radios[i] + radios[k] + ESPACIO) * 1.5;
        if (d < lejos) {
          const f = (0.03 * (lejos - d)) / d;
          mov[i].x -= f * dx;
          mov[i].y -= f * dy;
          mov[k].x += f * dx;
          mov[k].y += f * dy;
        }
      }
      mov[i].x -= pos[i].x * 0.004;
      mov[i].y -= pos[i].y * 0.02;
    }
    pos.forEach((p, i) => {
      p.x += mov[i].x * (0.3 + 0.7 * calor);
      p.y += mov[i].y * (0.3 + 0.7 * calor);
    });
    separar(pos, radios, ESPACIO);
  }
  // Más ancho que alto, para ocupar el ancho de la página.
  const caja = () => {
    const xs = pos.map((p, i) => [p.x - radios[i], p.x + radios[i]]).flat();
    const ys = pos.map((p, i) => [p.y - radios[i], p.y + radios[i]]).flat();
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  let c = caja();
  const proporcion = (c.x1 - c.x0) / Math.max(1, c.y1 - c.y0);
  if (n > 2 && proporcion < 1.8) {
    const f = Math.min(1.6, 1.8 / proporcion);
    const mx = pos.reduce((s, p) => s + p.x, 0) / n;
    pos.forEach((p) => (p.x = mx + (p.x - mx) * f));
    c = caja();
  }
  const MARGEN = 30;
  const ARRIBA = opciones.arriba ?? 34; // nombre de la unidad
  const centros = pos.map((p) => ({ x: p.x - c.x0 + MARGEN, y: p.y - c.y0 + MARGEN + ARRIBA }));
  const ancho = c.x1 - c.x0 + MARGEN * 2;
  const alto = c.y1 - c.y0 + MARGEN * 2 + ARRIBA;

  // Dirección preferida de cada tema: hacia las unidades donde tiene temas afines.
  const indice = new Map(a.unidades.map((u, i) => [u.nombre, i]));
  const hacia = new Map<string, Punto>();
  for (const r of relaciones) {
    const ia = indice.get(unidadDe(r.a));
    const ib = indice.get(unidadDe(r.b));
    if (ia === undefined || ib === undefined || ia === ib || !r.a.includes(SEP) || !r.b.includes(SEP)) continue;
    for (const [clave, de, a2] of [
      [temaDe(r.a), ia, ib],
      [temaDe(r.b), ib, ia],
    ] as const) {
      const v = hacia.get(clave) ?? { x: 0, y: 0 };
      const dx = centros[a2].x - centros[de].x;
      const dy = centros[a2].y - centros[de].y;
      const d = Math.hypot(dx, dy) || 1;
      hacia.set(clave, { x: v.x + dx / d, y: v.y + dy / d });
    }
  }

  const grupos: Agrupamiento[] = [];
  const posiciones: Record<string, Punto> = {};
  a.unidades.forEach((u, i) => {
    const { x, y } = centros[i];
    grupos.push({ clave: claveUnidad(u.nombre), nombre: u.nombre, unidad: i, x, y, r: radios[i] });
    posiciones[claveUnidad(u.nombre)] = { x, y };
    const lugares = anillos(u.temas.length, x, y, radios[i] * (u.temas.length > 7 ? 0.72 : 0.64));
    const libres = lugares.map((_, k) => k);
    const asignado = new Array<number>(u.temas.length).fill(-1);
    // Primero los temas con más afines afuera: cada uno toma el lugar que más mira hacia ellos.
    const conDireccion = u.temas
      .map((t, j) => ({ j, v: hacia.get(claveTema(u.nombre, t.nombre)) }))
      .filter((t): t is { j: number; v: Punto } => Boolean(t.v && Math.hypot(t.v.x, t.v.y) > 0.01))
      .sort((p, q) => Math.hypot(q.v.x, q.v.y) - Math.hypot(p.v.x, p.v.y));
    for (const { j, v } of conDireccion) {
      let mejor = -1;
      let valor = -Infinity;
      for (const k of libres) {
        const dx = lugares[k].x - x;
        const dy = lugares[k].y - y;
        const val = (dx * v.x + dy * v.y) / ((Math.hypot(dx, dy) || 1) * Math.hypot(v.x, v.y)) + Math.hypot(dx, dy) / radios[i];
        if (val > valor) {
          valor = val;
          mejor = k;
        }
      }
      asignado[j] = mejor;
      libres.splice(libres.indexOf(mejor), 1);
    }
    u.temas.forEach((t, j) => {
      if (asignado[j] < 0) asignado[j] = libres.shift()!;
      posiciones[claveTema(u.nombre, t.nombre)] = lugares[asignado[j]];
    });
  });
  return { ancho: Math.max(ancho, 300), alto: Math.max(alto, 300), grupos, posiciones };
}

/** Separa los círculos que se enciman (con un espacio mínimo entre ellos). */
function separar(pos: Punto[], radios: number[], espacio: number) {
  for (let vuelta = 0; vuelta < 4; vuelta++)
    for (let i = 0; i < pos.length; i++)
      for (let k = i + 1; k < pos.length; k++) {
        const dx = pos[k].x - pos[i].x;
        const dy = pos[k].y - pos[i].y;
        const d = Math.hypot(dx, dy);
        const minimo = radios[i] + radios[k] + espacio;
        if (d >= minimo) continue;
        // Si coinciden, se separan en una dirección fija (resultado estable).
        const [ux, uy] = d > 0.001 ? [dx / d, dy / d] : [Math.cos(i + k), Math.sin(i + k)];
        const falta = (minimo - d) / 2;
        pos[i].x -= ux * falta;
        pos[i].y -= uy * falta;
        pos[k].x += ux * falta;
        pos[k].y += uy * falta;
      }
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

export interface UnidadAfin extends Agrupamiento {
  /** Temas de esa unidad que se relacionan con la unidad abierta (y la unidad misma si es completa). */
  nodos: string[];
  /** Relaciones con la unidad abierta (para ordenar: las más relacionadas, más cerca). */
  peso: number;
  /** Relacionada con la unidad abierta por completo (línea sólida de centro a centro). */
  completa: boolean;
}

export interface AcomodoConAfines extends Acomodo {
  afines: UnidadAfin[];
  /**
   * Líneas de un tema (o subtema) de la unidad abierta a un tema de otra unidad, o de centro a
   * centro (completa) cuando las dos unidades se relacionan por completo.
   */
  enlaces: { a: string; b: string; motivo?: string; completa?: boolean }[];
}

/**
 * Segunda capa: los temas de la unidad al centro y, alrededor, las unidades afines con sus temas
 * relacionados. Cada unidad afín se pone del lado de los temas con los que se relaciona, en un
 * óvalo más ancho que alto (para la pantalla); las más relacionadas, más cerca.
 */
export function acomodoUnidadConAfines(a: Pick<Asignatura, "unidades">, unidad: number, relaciones: RelacionTemario[], max = 8): AcomodoConAfines {
  const base = acomodoUnidad(a, unidad);
  const u = a.unidades[unidad];
  if (!u) return { ...base, afines: [], enlaces: [] };
  const indice = new Map(a.unidades.map((x, i) => [x.nombre, i]));
  const c = base.ancho / 2;
  const posiciones: Record<string, Punto> = { ...base.posiciones, [claveUnidad(u.nombre)]: { x: c, y: c } };
  // Radio que ocupa la unidad abierta (hasta el borde del tema más lejano).
  const R =
    Math.max(80, ...base.grupos.map((g) => Math.hypot(g.x - c, g.y - c) + g.r), ...Object.values(base.posiciones).map((p) => Math.hypot(p.x - c, p.y - c) + 20)) + 10;

  const completas = new Map(
    relacionesDeUnidades(a, relaciones)
      .filter((x) => x.completa && (x.a === unidad || x.b === unidad))
      .map((x) => [x.a === unidad ? x.b : x.a, x]),
  );
  const porUnidad = new Map<number, { nodos: string[]; peso: number; dx: number; dy: number }>();
  const grupoDe = (otra: number) => {
    const g = porUnidad.get(otra) ?? { nodos: [], peso: 0, dx: 0, dy: 0 };
    porUnidad.set(otra, g);
    return g;
  };
  const enlaces: AcomodoConAfines["enlaces"] = [];
  for (const r of relaciones) {
    const enA = unidadDe(r.a) === u.nombre;
    const enB = unidadDe(r.b) === u.nombre;
    if (enA === enB) continue;
    const propio = enA ? r.a : r.b;
    const ajenoCrudo = enA ? r.b : r.a;
    const otra = indice.get(unidadDe(ajenoCrudo));
    if (otra === undefined) continue;
    const g = grupoDe(otra);
    g.peso++;
    // Con la unidad completa, la relación se dibuja de centro a centro.
    if (!ajenoCrudo.includes(SEP) || !propio.includes(SEP)) continue;
    const ajeno = temaDe(ajenoCrudo);
    if (!g.nodos.includes(ajeno)) g.nodos.push(ajeno);
    const p = posiciones[propio];
    if (p) {
      const d = Math.hypot(p.x - c, p.y - c) || 1;
      g.dx += (p.x - c) / d;
      g.dy += (p.y - c) / d;
    }
    if (!completas.has(otra)) enlaces.push({ a: propio, b: ajeno, motivo: r.motivo });
  }
  for (const [otra, x] of completas) {
    const g = grupoDe(otra);
    g.peso += 4;
    const clave = claveUnidad(a.unidades[otra].nombre);
    g.nodos.unshift(clave);
    enlaces.push({ a: claveUnidad(u.nombre), b: clave, motivo: x.motivo, completa: true });
  }

  const elegidas = [...porUnidad.entries()].sort((x, y) => y[1].peso - x[1].peso || x[0] - y[0]).slice(0, max);
  const n = elegidas.length;
  const OVALO = 1.7; // más ancho que alto
  // Lugares repartidos alrededor; cada unidad (la más relacionada primero) toma el que más mira
  // hacia sus temas afines.
  const lugares = Array.from({ length: n }, (_, k) => Math.PI + (2 * Math.PI * k) / Math.max(1, n));
  const libres = lugares.map((_, k) => k);
  const items = elegidas.map(([otra, g], rango) => {
    const temas = g.nodos.filter((x) => x.includes(SEP)).slice(0, 6);
    const nodos = g.nodos.filter((x) => !x.includes(SEP)).concat(temas);
    const r = 46 + 20 * Math.sqrt(Math.max(1, temas.length));
    const pref = Math.hypot(g.dx, g.dy) > 0.01 ? Math.atan2(g.dy, g.dx * OVALO) : undefined;
    let mejor = libres[0];
    if (pref !== undefined) {
      let dif = Infinity;
      for (const k of libres) {
        const d = Math.abs(Math.atan2(Math.sin(lugares[k] - pref), Math.cos(lugares[k] - pref)));
        if (d < dif) {
          dif = d;
          mejor = k;
        }
      }
    }
    libres.splice(libres.indexOf(mejor), 1);
    const dist = R + r + 40 + rango * 14;
    return { otra, nodos, temas, peso: g.peso, completa: completas.has(otra), r, x: c + dist * OVALO * Math.cos(lugares[mejor]), y: c + dist * Math.sin(lugares[mejor]) };
  });
  // Sin encimarse entre ellas ni con la unidad abierta.
  for (let vuelta = 0; vuelta < 80; vuelta++) {
    for (let k = 0; k < items.length; k++) {
      for (let m = k + 1; m < items.length; m++) {
        const dx = items[m].x - items[k].x;
        const dy = items[m].y - items[k].y;
        const d = Math.hypot(dx, dy);
        const minimo = items[k].r + items[m].r + 50;
        if (d >= minimo) continue;
        const [ux, uy] = d > 0.001 ? [dx / d, dy / d] : [Math.cos(k + m), Math.sin(k + m)];
        const falta = (minimo - d) / 2;
        items[k].x -= ux * falta;
        items[k].y -= uy * falta;
        items[m].x += ux * falta;
        items[m].y += uy * falta;
      }
      const dx = items[k].x - c;
      const dy = items[k].y - c;
      const d = Math.hypot(dx, dy) || 1;
      const minimo = R + items[k].r + 30;
      if (d < minimo) {
        items[k].x = c + (dx / d) * minimo;
        items[k].y = c + (dy / d) * minimo;
      }
    }
  }
  const afines: UnidadAfin[] = items.map((it) => {
    // Los temas afines del lado que mira a la unidad abierta.
    const giro = Math.atan2(c - it.y, c - it.x);
    anillos(it.temas.length, it.x, it.y, it.r * 0.58, giro).forEach((p, j) => (posiciones[it.temas[j]] = p));
    for (const k of it.nodos) if (!k.includes(SEP)) posiciones[k] = { x: it.x, y: it.y };
    const otra = a.unidades[it.otra];
    return { clave: claveUnidad(otra.nombre), nombre: otra.nombre, unidad: it.otra, x: it.x, y: it.y, r: it.r, nodos: it.nodos, peso: it.peso, completa: it.completa };
  });
  const visibles = new Set(afines.flatMap((g) => g.nodos));
  // Lienzo que abarca todo, con lugar para los nombres.
  const cajas = [{ x: c, y: c, r: R }, ...afines.map((g) => ({ x: g.x, y: g.y - 14, r: g.r + 30 }))];
  const x0 = Math.min(...cajas.map((b) => b.x - b.r)) - 20;
  const y0 = Math.min(...cajas.map((b) => b.y - b.r)) - 10;
  const x1 = Math.max(...cajas.map((b) => b.x + b.r)) + 20;
  const y1 = Math.max(...cajas.map((b) => b.y + b.r)) + 10;
  const mover = (p: Punto) => ({ x: p.x - x0, y: p.y - y0 });
  for (const k of Object.keys(posiciones)) posiciones[k] = mover(posiciones[k]);
  return {
    ancho: x1 - x0,
    alto: y1 - y0,
    grupos: base.grupos.map((g) => ({ ...g, ...mover(g) })),
    posiciones,
    afines: afines.map((g) => ({ ...g, ...mover(g) })),
    enlaces: enlaces.filter((e) => visibles.has(e.b) && posiciones[e.a]),
  };
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
/** Color del avance: rojo hasta 50 %, amarillo hasta 79 %, verde hasta 99 % y azul al 100 %. */
export function colorProgreso(p: number | null | undefined) {
  if (p === null || p === undefined) return "#94a3b8";
  const r = Math.round(p);
  if (r >= 100) return "#2563eb";
  if (r >= 80) return "#16a34a";
  if (r >= 51) return "#eab308";
  return "#dc2626";
}

export function colorAvance(p: number | null | undefined) {
  if (p === null || p === undefined) return "#94a3b8";
  if (p >= 80) return "#16a34a";
  if (p >= 60) return "#d97706";
  return "#dc2626";
}
