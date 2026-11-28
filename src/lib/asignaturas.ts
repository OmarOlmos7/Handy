// Asignaturas: el syllabus (unidades, temas y subtemas) de cada curso del profesor. Se carga desde
// un archivo, pegando la lista o generándolo con IA, y en el alta de actividad se eligen los temas.
import type { Asignatura, Grupo, TemarioActividad, UnidadAsignatura } from "./tipos";

export const MAX_UNIDADES = 30;
export const MAX_TEMAS = 40;
export const MAX_SUBTEMAS = 30;
export const LARGO_NOMBRE = 200;
export const LARGO_TEXTO_TEMARIO = 60_000;

const texto = (v: unknown, max = LARGO_NOMBRE) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Deja el temario dentro de los límites, sin nombres vacíos ni repetidos. */
export function limpiarUnidades(crudas: unknown): UnidadAsignatura[] {
  if (!Array.isArray(crudas)) return [];
  const unidades: UnidadAsignatura[] = [];
  for (const u of crudas.slice(0, MAX_UNIDADES)) {
    if (!u || typeof u !== "object") continue;
    const nombre = texto((u as { nombre?: unknown }).nombre);
    const temasCrudos = (u as { temas?: unknown }).temas;
    const temas = (Array.isArray(temasCrudos) ? temasCrudos : [])
      .slice(0, MAX_TEMAS)
      .map((t) => ({
        nombre: texto((t as { nombre?: unknown })?.nombre),
        subtemas: unicos(((t as { subtemas?: unknown })?.subtemas as unknown[]) ?? []).slice(0, MAX_SUBTEMAS),
      }))
      .filter((t) => t.nombre);
    if (!nombre && temas.length === 0) continue;
    unidades.push({ nombre: nombre || `Unidad ${unidades.length + 1}`, temas: unicosPor(temas, (t) => t.nombre) });
  }
  return unidades;
}

function unicos(xs: unknown[]): string[] {
  return unicosPor(
    (Array.isArray(xs) ? xs : []).map((x) => texto(x)).filter(Boolean),
    (x) => x,
  );
}

function unicosPor<T>(xs: T[], clave: (x: T) => string): T[] {
  const vistos = new Set<string>();
  return xs.filter((x) => {
    const k = clave(x).toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// ---------- Lista pegada o archivo de texto: se ordena por código, sin IA ----------

const VINETA = /^([-–—•*·▪▫◦○●►▸>]|o\s)\s*/;
const PALABRA_UNIDAD = /^(unidad|unit|unité|unidade|einheit|bloque|módulo|modulo|module|parcial|eje|bimestre|trimestre|semestre|単元|第.{1,3}単元|单元|第.{1,3}单元)\b/i;
const PALABRA_TEMA = /^(tema|topic|thème|theme|thema)\b/i;
const NUMERO = /^(\d+(?:\.\d+)*)[.)]?\s+/;
const ROMANO = /^([IVXLC]+)[.)-]\s+/;
const LETRA = /^\(?([a-z])[.)]\s+/;

function sangria(linea: string) {
  const m = linea.match(/^[\t ]*/)![0];
  return m.replace(/\t/g, "    ").length;
}

/**
 * Convierte una lista pegada (o un .txt) en unidades, temas y subtemas. Reconoce "Unidad 1",
 * numeración (1, 1.1, 1.1.1), números romanos, incisos, viñetas y sangrías.
 */
export function temarioDeTexto(entrada: string): UnidadAsignatura[] {
  const lineas = entrada
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() && !/^[-=_*\s]+$/.test(l));
  const conPalabra = lineas.some((l) => PALABRA_UNIDAD.test(l.trim()) || ROMANO.test(l.trim()));
  const unidades: UnidadAsignatura[] = [];
  let sangriaTema = -1;

  const unidadActual = () => {
    if (!unidades.length) unidades.push({ nombre: "Unidad 1", temas: [] });
    return unidades[unidades.length - 1];
  };
  const temaActual = () => {
    const u = unidadActual();
    if (!u.temas.length) u.temas.push({ nombre: u.nombre, subtemas: [] });
    return u.temas[u.temas.length - 1];
  };

  for (const original of lineas) {
    const s = sangria(original);
    let l = original.trim();
    let nivel: 1 | 2 | 3;
    const vineta = VINETA.test(l);
    if (vineta) l = l.replace(VINETA, "").trim();
    const numero = l.match(NUMERO);
    if (PALABRA_UNIDAD.test(l) || (!vineta && ROMANO.test(l))) nivel = 1;
    else if (PALABRA_TEMA.test(l)) nivel = 2;
    else if (numero) {
      const d = numero[1].split(".").length;
      // Con "Unidad 1" arriba, 1 y 1.1 son temas; sin ella, 1 es unidad y 1.1 tema. 1.1.1 es subtema.
      nivel = d >= 3 ? 3 : conPalabra ? 2 : d === 1 ? 1 : 2;
    } else if (LETRA.test(l)) nivel = 3;
    else if (vineta || s > 0) {
      // Viñetas y sangrías: más adentro que el último tema, es subtema.
      nivel = sangriaTema >= 0 && s > sangriaTema ? 3 : 2;
    } else nivel = 1;
    const nombre = texto(l);
    if (!nombre) continue;
    if (nivel === 1) {
      unidades.push({ nombre, temas: [] });
      sangriaTema = -1;
    } else if (nivel === 2) {
      unidadActual().temas.push({ nombre, subtemas: [] });
      sangriaTema = s;
    } else {
      temaActual().subtemas.push(nombre);
    }
  }
  return limpiarUnidades(unidades);
}

/** Cuenta temas y subtemas para mostrar un resumen. */
export function resumenTemario(unidades: UnidadAsignatura[]) {
  const temas = unidades.reduce((s, u) => s + u.temas.length, 0);
  const subtemas = unidades.reduce((s, u) => s + u.temas.reduce((k, t) => k + t.subtemas.length, 0), 0);
  return { unidades: unidades.length, temas, subtemas };
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Asignatura que corresponde al curso (misma materia), si hay. */
export function asignaturaDeGrupo<A extends Pick<Asignatura, "nombre">>(asignaturas: A[], grupo: Pick<Grupo, "materia"> | undefined): A | undefined {
  if (!grupo) return undefined;
  return asignaturas.find((a) => normal(a.nombre) === normal(grupo.materia));
}

/** Valida lo que manda el alta de actividad: la unidad y los temas deben existir en la asignatura. */
export function leerTemarioActividad(crudo: unknown, asignaturas: Asignatura[]): TemarioActividad | undefined {
  let dato: unknown = crudo;
  if (typeof crudo === "string") {
    if (!crudo.trim()) return undefined;
    try {
      dato = JSON.parse(crudo);
    } catch {
      return undefined;
    }
  }
  if (!dato || typeof dato !== "object") return undefined;
  const { asignaturaId, unidad, temas, certificacion } = dato as Record<string, unknown>;
  const a = asignaturas.find((x) => x.id === asignaturaId);
  const u = a?.unidades.find((x) => x.nombre === unidad);
  if (!a || !u) return undefined;
  const validos = new Set(u.temas.flatMap((t) => [t.nombre, ...t.subtemas]));
  const elegidos = (Array.isArray(temas) ? temas : []).filter((t): t is string => typeof t === "string" && validos.has(t));
  const minimo = certificacion && typeof certificacion === "object" ? minimoCertificacion((certificacion as { minimo?: unknown }).minimo) : undefined;
  return { asignaturaId: a.id, unidad: u.nombre, temas: [...new Set(elegidos)], ...(minimo !== undefined ? { certificacion: { minimo } } : {}) };
}

/** Calificación mínima predeterminada (en %) para certificar una unidad. */
export const MINIMO_CERTIFICACION = 70;

/** Mínimo para certificar, entre 1 y 100 %; si no es número, el predeterminado. */
export function minimoCertificacion(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(100, n) : MINIMO_CERTIFICACION;
}

/** Texto para la IA al generar la actividad: la unidad y los temas que debe cubrir. */
export function temarioComoTexto(t: TemarioActividad | undefined) {
  if (!t) return "";
  return `Unidad del temario: ${t.unidad}.${t.temas.length ? ` Temas que debe cubrir la actividad: ${t.temas.join("; ")}.` : ""}`;
}

/**
 * Asignatura del curso: la que el profesor enlazó al crear o editar el curso. Si no eligió ninguna
 * (cursos anteriores), la que usan sus actividades; si ninguna tiene temas, la del profesor con el
 * mismo nombre que la materia. "Sin asignatura" ("") no enlaza ninguna.
 */
export function asignaturaDelCurso(
  db: { asignaturas?: Asignatura[]; actividades: { grupoId: string; temario?: TemarioActividad }[] },
  grupo: Pick<Grupo, "id" | "materia" | "profesorId" | "asignaturaId">,
): Asignatura | undefined {
  if (grupo.asignaturaId === "") return undefined;
  const delProfesor = (db.asignaturas ?? []).filter((a) => a.profesorId === grupo.profesorId);
  const enlazada = delProfesor.find((a) => a.id === grupo.asignaturaId);
  if (enlazada) return enlazada;
  const usadas = db.actividades.filter((a) => a.grupoId === grupo.id && a.temario).map((a) => a.temario!.asignaturaId);
  const masUsada = [...new Set(usadas)].sort((x, y) => usadas.filter((u) => u === y).length - usadas.filter((u) => u === x).length)[0];
  return delProfesor.find((a) => a.id === masUsada) ?? asignaturaDeGrupo(delProfesor, grupo);
}

/** Valor del selector de asignatura del curso que pide crear una asignatura nueva. */
export const NUEVA_ASIGNATURA = "__nueva";

/**
 * Lee la asignatura elegida para un curso: el id de una asignatura del profesor, "" (sin asignatura)
 * o NUEVA_ASIGNATURA. Cualquier otro valor se ignora (undefined: no cambia nada).
 */
export function leerAsignaturaCurso(crudo: unknown, asignaturas: Pick<Asignatura, "id" | "profesorId">[], profesorId: string): string | undefined {
  if (typeof crudo !== "string") return undefined;
  if (crudo === "" || crudo === NUEVA_ASIGNATURA) return crudo;
  return asignaturas.some((a) => a.id === crudo && a.profesorId === profesorId) ? crudo : undefined;
}
