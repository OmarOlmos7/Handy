// Línea de tiempo del curso: reparte las unidades del temario entre la fecha de inicio y la de
// término del curso, en tramos iguales, y dice cuáles ya debieron cubrirse según la fecha de hoy.

export type EstadoUnidadTiempo = "cubierta" | "en_curso" | "pendiente";

export interface UnidadEnTiempo {
  indice: number;
  nombre: string;
  /** Fechas AAAA-MM-DD (ambas incluidas). */
  desde: string;
  hasta: string;
  estado: EstadoUnidadTiempo;
}

const DIA_MS = 86_400_000;

function aDia(fecha: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : Math.round(t / DIA_MS);
}

function aFecha(dia: number): string {
  return new Date(dia * DIA_MS).toISOString().slice(0, 10);
}

/**
 * Reparte las unidades en el periodo del curso. Devuelve null si faltan las fechas, si están al
 * revés o si no hay unidades. Si hay más unidades que días, varias comparten el mismo día.
 * `hoy` es la fecha AAAA-MM-DD del lugar del curso (centro de México por omisión).
 */
export function lineaTiempoCurso(unidades: string[], inicio: string | undefined, fin: string | undefined, hoy: string): UnidadEnTiempo[] | null {
  const a = inicio ? aDia(inicio) : null;
  const b = fin ? aDia(fin) : null;
  const h = aDia(hoy);
  if (a === null || b === null || h === null || b < a || unidades.length === 0) return null;
  const dias = b - a + 1;
  const n = unidades.length;
  return unidades.map((nombre, i) => {
    const desde = a + Math.floor((i * dias) / n);
    const hasta = Math.max(desde, a + Math.floor(((i + 1) * dias) / n) - 1);
    const estado: EstadoUnidadTiempo = h > hasta ? "cubierta" : h >= desde ? "en_curso" : "pendiente";
    return { indice: i, nombre, desde: aFecha(desde), hasta: aFecha(hasta), estado };
  });
}

/** Porcentaje (0 a 100) del periodo del curso que ya transcurrió; null sin fechas válidas. */
export function avanceDelPeriodo(inicio: string | undefined, fin: string | undefined, hoy: string): number | null {
  const a = inicio ? aDia(inicio) : null;
  const b = fin ? aDia(fin) : null;
  const h = aDia(hoy);
  if (a === null || b === null || h === null || b < a) return null;
  if (h < a) return 0;
  if (h > b) return 100;
  return Math.round(((h - a + 1) / (b - a + 1)) * 100);
}

export type IconoUnidad =
  | "regla"
  | "movimiento"
  | "fuerza"
  | "energia"
  | "termometro"
  | "iman"
  | "onda"
  | "luz"
  | "atomo"
  | "funcion"
  | "grafica"
  | "triangulo"
  | "hoja"
  | "reloj"
  | "libro"
  | "globo"
  | "codigo"
  | "matraz";

// Palabras (sin acentos, en minúsculas) que deciden el ícono de una unidad, en orden de prioridad.
const REGLAS_ICONO: [RegExp, IconoUnidad][] = [
  [/medic|unidad(es)? de medida|magnitud|escala|vector/, "regla"],
  [/cinemat|movimiento|velocidad|aceleracion|caida libre|proyectil/, "movimiento"],
  [/termo|calor|temperatura|gases/, "termometro"],
  [/dinamica|fuerza|newton|equilibrio|estatica|momento|impulso|conservacion/, "fuerza"],
  [/energia|trabajo|potencia/, "energia"],
  [/electr|magnet|circuito|corriente/, "iman"],
  [/onda|sonido|oscila|vibra/, "onda"],
  [/optica|luz|refrac|reflex/, "luz"],
  [/quimic|atomo|molecul|materia|enlace|reaccion|nuclear|cuantic/, "atomo"],
  [/laboratorio|experiment|solucion(es)? quimic/, "matraz"],
  [/funcion|algebra|ecuacion|polinom|derivad|integral|calculo|limite|matriz/, "funcion"],
  [/estadist|probabil|datos|grafic|analisis/, "grafica"],
  [/geometr|trigonom|triangulo|angulo|area|volumen/, "triangulo"],
  [/biolog|celula|ecolog|organismo|genetic|vida|planta/, "hoja"],
  [/historia|epoca|siglo|revolucion|antigu/, "reloj"],
  [/geograf|mundo|planeta|tierra|ambiente/, "globo"],
  [/program|algoritm|computa|codigo|software|digital/, "codigo"],
  [/lectura|escritura|texto|lengua|literatura|redaccion|gramatica|comunicacion/, "libro"],
];

const RESPALDO: IconoUnidad[] = ["libro", "grafica", "funcion", "atomo", "regla", "globo", "energia", "hoja"];

/** Ícono para una unidad según palabras de su nombre; si no hay pista, uno distinto por número. */
export function iconoUnidad(nombre: string, indice: number): IconoUnidad {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  for (const [re, icono] of REGLAS_ICONO) if (re.test(limpio)) return icono;
  return RESPALDO[indice % RESPALDO.length];
}
