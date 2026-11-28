// Prueba de Stroop de lectura de colores: se muestra el nombre de un color escrito con tinta de su
// mismo color (congruente) o de otro (incongruente) y el alumno elige el color de la tinta. Se aplica
// al inicio y al final de cada semestre, una sola vez para todos sus cursos. Es un indicador
// educativo de atención, no una evaluación clínica. Los números los calcula este código.
import type { AplicacionStroop, ColorStroop, EnsayoStroop, MomentoStroop, ResumenStroop } from "../tipos";

export const COLORES_STROOP: readonly ColorStroop[] = ["rojo", "azul", "verde", "amarillo"];

/** Tinta de cada color, pensada para verse sobre fondo oscuro. */
export const TINTA_STROOP: Record<ColorStroop, string> = {
  rojo: "#f87171",
  azul: "#60a5fa",
  verde: "#4ade80",
  amarillo: "#facc15",
};

/** Ensayos de la prueba (la mitad congruentes) y de la práctica previa, que no se guarda. */
export const ENSAYOS_PRUEBA = 24;
export const ENSAYOS_PRACTICA = 4;

/** Tiempos válidos de respuesta: más rápido es una anticipación; más lento, una distracción. */
export const MS_MINIMO = 150;
export const MS_MAXIMO = 10_000;

/** Días antes del fin del curso en que se abre la prueba de cierre del semestre. */
export const DIAS_VENTANA_FIN = 21;

export const esColorStroop = (v: unknown): v is ColorStroop => typeof v === "string" && (COLORES_STROOP as readonly string[]).includes(v);

/** Generador pseudoaleatorio con semilla (mulberry32), para poder probar la secuencia. */
function aleatorio(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Secuencia de ensayos: la mitad congruentes y la mitad incongruentes, mezclados, sin repetir la
 * misma palabra dos veces seguidas.
 */
export function generarEnsayos(n = ENSAYOS_PRUEBA, semilla = Date.now()): { palabra: ColorStroop; tinta: ColorStroop }[] {
  const azar = aleatorio(semilla);
  const elige = <T,>(xs: readonly T[]) => xs[Math.floor(azar() * xs.length)];
  const tipos = Array.from({ length: n }, (_, i) => i < Math.ceil(n / 2));
  for (let i = tipos.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
  }
  const lista: { palabra: ColorStroop; tinta: ColorStroop }[] = [];
  for (const congruente of tipos) {
    const anterior = lista[lista.length - 1]?.palabra;
    const palabra = elige(COLORES_STROOP.filter((c) => c !== anterior));
    const tinta = congruente ? palabra : elige(COLORES_STROOP.filter((c) => c !== palabra));
    lista.push({ palabra, tinta });
  }
  return lista;
}

export const esCongruente = (e: Pick<EnsayoStroop, "palabra" | "tinta">) => e.palabra === e.tinta;

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return Math.round(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2);
}

const porcentaje = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

/** Resumen de una aplicación: medianas de los aciertos, efecto Stroop y porcentaje de errores. */
export function resumirStroop(ensayos: EnsayoStroop[]): ResumenStroop {
  const cong = ensayos.filter(esCongruente);
  const inc = ensayos.filter((e) => !esCongruente(e));
  const aciertos = (xs: EnsayoStroop[]) => xs.filter((e) => e.respuesta === e.tinta).map((e) => e.ms);
  const msCongruente = mediana(aciertos(cong));
  const msIncongruente = mediana(aciertos(inc));
  return {
    ensayos: ensayos.length,
    msCongruente,
    msIncongruente,
    efectoMs: msCongruente !== null && msIncongruente !== null ? msIncongruente - msCongruente : null,
    erroresCongruente: porcentaje(cong.filter((e) => e.respuesta !== e.tinta).length, cong.length),
    erroresIncongruente: porcentaje(inc.filter((e) => e.respuesta !== e.tinta).length, inc.length),
  };
}

/**
 * Ensayos válidos de lo que manda el navegador: colores conocidos y tiempo redondeado dentro del
 * rango. undefined si no completó la prueba.
 */
export function limpiarEnsayos(entrada: unknown): EnsayoStroop[] | undefined {
  if (!Array.isArray(entrada) || entrada.length !== ENSAYOS_PRUEBA) return undefined;
  const lista: EnsayoStroop[] = [];
  for (const x of entrada) {
    const e = (x ?? {}) as Record<string, unknown>;
    if (!esColorStroop(e.palabra) || !esColorStroop(e.tinta) || !esColorStroop(e.respuesta)) return undefined;
    const ms = Number(e.ms);
    if (!Number.isFinite(ms)) return undefined;
    lista.push({ palabra: e.palabra, tinta: e.tinta, respuesta: e.respuesta, ms: Math.round(Math.max(MS_MINIMO, Math.min(MS_MAXIMO, ms))) });
  }
  const congruentes = lista.filter(esCongruente).length;
  // Una secuencia que no salió de generarEnsayos (por ejemplo, todo congruente) no se acepta.
  if (Math.abs(congruentes - ENSAYOS_PRUEBA / 2) > 1) return undefined;
  return lista;
}

/** Semestre de una fecha (hora del centro de México): enero a junio "AAAA-1", julio a diciembre "AAAA-2". */
export function semestreDe(fecha: Date): string {
  const local = new Date(fecha.getTime() - 6 * 3_600_000);
  return `${local.getUTCFullYear()}-${local.getUTCMonth() < 6 ? 1 : 2}`;
}

/** Último día del semestre (AAAA-MM-DD). */
function finDeSemestre(semestre: string): string {
  const [anio, mitad] = semestre.split("-");
  return mitad === "1" ? `${anio}-06-30` : `${anio}-12-31`;
}

/**
 * Desde qué fecha (AAAA-MM-DD) se abre la prueba de cierre: DIAS_VENTANA_FIN días antes del primer
 * fin de curso del alumno que cae en el semestre; sin fechas de fin, antes del fin del semestre.
 */
export function aperturaFin(semestre: string, finesCursos: (string | undefined)[]): string {
  const limite = finDeSemestre(semestre);
  const inicio = semestre.endsWith("-1") ? `${semestre.slice(0, 4)}-01-01` : `${semestre.slice(0, 4)}-07-01`;
  const enSemestre = finesCursos.filter((f): f is string => Boolean(f && f >= inicio && f <= limite)).sort();
  const fin = enSemestre[0] ?? limite;
  const d = new Date(`${fin}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - DIAS_VENTANA_FIN);
  return d.toISOString().slice(0, 10);
}

/** Aplicaciones del alumno en el semestre. */
export function aplicacionesDelSemestre(lista: AplicacionStroop[] | undefined, alumnoId: string, semestre: string): Partial<Record<MomentoStroop, AplicacionStroop>> {
  const propias = (lista ?? []).filter((a) => a.alumnoId === alumnoId && a.semestre === semestre);
  return { inicio: propias.find((a) => a.momento === "inicio"), fin: propias.find((a) => a.momento === "fin") };
}

/**
 * Qué prueba le toca al alumno ahora: la de inicio si no la ha hecho este semestre; la de cierre si
 * ya hizo la de inicio antes de la ventana de cierre, no la de cierre y la ventana ya se abrió; o ninguna.
 */
export function momentoPendiente(lista: AplicacionStroop[] | undefined, alumnoId: string, ahora: Date, finesCursos: (string | undefined)[] = []): MomentoStroop | null {
  const semestre = semestreDe(ahora);
  const hechas = aplicacionesDelSemestre(lista, alumnoId, semestre);
  if (!hechas.inicio) return "inicio";
  if (hechas.fin) return null;
  const hoy = new Date(ahora.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
  const apertura = aperturaFin(semestre, finesCursos);
  // Si la de inicio ya fue dentro de la ventana de cierre (entró tarde), esa sola vale por el semestre.
  const inicioEn = new Date(Date.parse(hechas.inicio.fecha) - 6 * 3_600_000).toISOString().slice(0, 10);
  if (inicioEn >= apertura) return null;
  return hoy >= apertura ? "fin" : null;
}
