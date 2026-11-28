// Reconocimiento de rostros para la asistencia con foto. El navegador del profesor detecta los
// rostros y calcula una huella numérica (descriptor de 128 números) de cada uno; la foto no sale
// del teléfono. Aquí van las reglas que no dependen del modelo: revisar descriptores, compararlos
// y asignar cada rostro de la foto a un alumno. No usa nada del servidor para poder probarlo.
import type { RostroAlumno } from "./tipos";

export const LARGO_DESCRIPTOR = 128;
/** Descriptores que se guardan por alumno (los más recientes); varias fotos mejoran el reconocimiento. */
export const MAX_DESCRIPTORES = 6;
/**
 * Distancia euclidiana máxima para decir que dos rostros son de la misma persona. 0.6 es el valor
 * habitual del modelo; se usa 0.5 para equivocarse menos (mejor un "no reconocido" que un nombre
 * equivocado: el profesor revisa la lista antes de guardarla).
 */
export const UMBRAL_RECONOCIMIENTO = 0.5;

/** Descriptor válido (128 números finitos, redondeados a 5 decimales para guardar menos) o undefined. */
export function leerDescriptor(v: unknown): number[] | undefined {
  if (!Array.isArray(v) || v.length !== LARGO_DESCRIPTOR) return undefined;
  const d = v.map(Number);
  if (!d.every((x) => Number.isFinite(x) && Math.abs(x) < 10)) return undefined;
  return d.map((x) => Math.round(x * 1e5) / 1e5);
}

export function distancia(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** Agrega un descriptor al alumno y conserva solo los más recientes. */
export function agregarDescriptor(rostro: Pick<RostroAlumno, "descriptores">, descriptor: number[]) {
  rostro.descriptores = [...rostro.descriptores, descriptor].slice(-MAX_DESCRIPTORES);
}

export interface Conocido {
  matricula: string;
  descriptores: number[][];
}

export interface Coincidencia {
  /** Alumno reconocido, o undefined si ningún alumno se parece lo suficiente. */
  matricula?: string;
  distancia?: number;
}

/**
 * Asigna cada rostro de la foto a lo más un alumno, y cada alumno a lo más un rostro: primero las
 * parejas más parecidas. La distancia a un alumno es la menor contra cualquiera de sus descriptores.
 */
export function reconocer(rostros: ArrayLike<number>[], conocidos: Conocido[], umbral = UMBRAL_RECONOCIMIENTO): Coincidencia[] {
  const parejas: { r: number; matricula: string; d: number }[] = [];
  rostros.forEach((rostro, r) => {
    for (const c of conocidos) {
      if (!c.descriptores.length) continue;
      const d = Math.min(...c.descriptores.map((x) => distancia(rostro, x)));
      if (d < umbral) parejas.push({ r, matricula: c.matricula, d });
    }
  });
  parejas.sort((a, b) => a.d - b.d);
  const resultado: Coincidencia[] = rostros.map(() => ({}));
  const usados = new Set<string>();
  for (const p of parejas) {
    if (resultado[p.r].matricula || usados.has(p.matricula)) continue;
    resultado[p.r] = { matricula: p.matricula, distancia: Math.round(p.d * 1000) / 1000 };
    usados.add(p.matricula);
  }
  return resultado;
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Cuánto se enciman dos cajas (intersección entre unión, de 0 a 1). */
export function encimado(a: Caja, b: Caja): number {
  const x = Math.max(0, Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y));
  const inter = x * y;
  const union = a.ancho * a.alto + b.ancho * b.alto - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Quita rostros repetidos (la foto se revisa por partes que se enciman, así un rostro puede salir
 * dos veces): de los que se enciman, se queda el de mayor certeza.
 */
export function sinRepetidos<T extends { caja: Caja; certeza: number }>(rostros: T[], maximo = 0.3): T[] {
  const orden = [...rostros].sort((a, b) => b.certeza - a.certeza);
  const quedan: T[] = [];
  for (const r of orden) {
    // También si uno queda casi dentro de otro (un rostro cortado en el borde de una parte).
    const dentro = (a: Caja, b: Caja) => {
      const x = Math.max(0, Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x));
      const y = Math.max(0, Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y));
      return (x * y) / Math.min(a.ancho * a.alto, b.ancho * b.alto);
    };
    if (!quedan.some((q) => encimado(q.caja, r.caja) > maximo || dentro(q.caja, r.caja) > 0.6)) quedan.push(r);
  }
  // En orden de lectura: de arriba abajo por renglones y de izquierda a derecha.
  return ordenLectura(quedan);
}

/** Ordena los rostros como se leen: renglones de arriba abajo y, en cada uno, de izquierda a derecha. */
export function ordenLectura<T extends { caja: Caja }>(rostros: T[]): T[] {
  const porY = [...rostros].sort((a, b) => a.caja.y - b.caja.y);
  const renglones: T[][] = [];
  for (const r of porY) {
    const ultimo = renglones.at(-1);
    const ref = ultimo?.[0];
    if (ref && r.caja.y < ref.caja.y + ref.caja.alto * 0.6) ultimo!.push(r);
    else renglones.push([r]);
  }
  return renglones.flatMap((f) => f.sort((a, b) => a.caja.x - b.caja.x));
}

/**
 * Partes en que se revisa una foto grande: el detector trabaja a baja resolución, así que en una
 * foto del salón los rostros del fondo se verían muy pequeños. Se revisa la foto entera y, si es
 * grande, también en partes que se enciman un 25 %.
 */
export function partesDeFoto(ancho: number, alto: number, lado = 900): Caja[] {
  const partes: Caja[] = [{ x: 0, y: 0, ancho, alto }];
  if (Math.max(ancho, alto) <= lado * 1.3) return partes;
  const paso = lado * 0.75;
  const xs = posiciones(ancho, lado, paso);
  const ys = posiciones(alto, lado, paso);
  for (const y of ys) for (const x of xs) partes.push({ x, y, ancho: Math.min(lado, ancho - x), alto: Math.min(lado, alto - y) });
  return partes;
}

function posiciones(total: number, lado: number, paso: number): number[] {
  if (total <= lado) return [0];
  const p: number[] = [];
  for (let v = 0; v + lado < total; v += paso) p.push(Math.round(v));
  p.push(Math.max(0, Math.round(total - lado)));
  return [...new Set(p)];
}

/** Alumnos del curso con consentimiento vigente y al menos un rostro registrado. */
export function conocidosDelCurso(rostros: RostroAlumno[], grupoId: string, matriculas: Set<string>): Conocido[] {
  return rostros
    .filter((r) => r.grupoId === grupoId && r.consentimiento && r.descriptores.length && matriculas.has(r.matricula))
    .map((r) => ({ matricula: r.matricula, descriptores: r.descriptores }));
}
