// Sombreado de cada tipo de actividad en el cuaderno (profesor y alumno): un tono suave distinto por
// tipo para que sus columnas y su promedio se distingan de un vistazo.

export interface TonoTipo {
  /** Encabezado del tipo y de sus actividades. */
  cabeza: string;
  /** Celdas de las actividades del tipo. */
  celda: string;
  /** Columna de promedio del tipo (un poco más intensa). */
  promedio: string;
}

const TONOS: TonoTipo[] = [
  { cabeza: "bg-sky-100/70", celda: "bg-sky-50/60", promedio: "bg-sky-100/70" },
  { cabeza: "bg-amber-100/70", celda: "bg-amber-50/60", promedio: "bg-amber-100/70" },
  { cabeza: "bg-violet-100/70", celda: "bg-violet-50/60", promedio: "bg-violet-100/70" },
  { cabeza: "bg-emerald-100/70", celda: "bg-emerald-50/60", promedio: "bg-emerald-100/70" },
  { cabeza: "bg-rose-100/70", celda: "bg-rose-50/60", promedio: "bg-rose-100/70" },
  { cabeza: "bg-teal-100/70", celda: "bg-teal-50/60", promedio: "bg-teal-100/70" },
  { cabeza: "bg-orange-100/70", celda: "bg-orange-50/60", promedio: "bg-orange-100/70" },
  { cabeza: "bg-indigo-100/70", celda: "bg-indigo-50/60", promedio: "bg-indigo-100/70" },
];

/** Tono del i-ésimo tipo del cuaderno (se repiten si hay más tipos que tonos). */
export const tonoTipo = (i: number): TonoTipo => TONOS[i % TONOS.length];
