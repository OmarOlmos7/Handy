// Cuánto tiempo se guardan los archivos en el servidor. Funciones puras para poder probarlas.
// - Fotos de las entregas: 7 días después de liberar los resultados; luego se archivan en el
//   PDF corregido y se borran (queda tiempo para que el profesor o el alumno hagan ajustes).
// - Actividades con sus reportes: 1 año desde que se generó el último reporte; después se borran.
import type { Actividad, Entrega } from "./tipos";

export const DIAS_FOTOS = 7;
export const DIAS_CONSERVACION = 365;
/** Días antes del borrado en que se avisa al profesor. */
export const DIAS_AVISO = 30;

const DIA = 86_400_000;

/** Cuándo vio (o puede ver) el alumno sus resultados, o undefined si aún no se liberan. */
export function liberadaEn(actividad: Pick<Actividad, "resultadosDesde">, entrega: Pick<Entrega, "estado" | "evaluadaEn">): Date | undefined {
  if (entrega.estado !== "aprobada" || !entrega.evaluadaEn) return undefined;
  const evaluada = Date.parse(entrega.evaluadaEn);
  const desde = actividad.resultadosDesde ? Date.parse(actividad.resultadosDesde) : 0;
  return new Date(Math.max(evaluada, Number.isFinite(desde) ? desde : 0));
}

/** Desde cuándo se pueden archivar las fotos de la entrega. */
export function archivarFotosDesde(actividad: Pick<Actividad, "resultadosDesde">, entrega: Pick<Entrega, "estado" | "evaluadaEn">): Date | undefined {
  const l = liberadaEn(actividad, entrega);
  return l && new Date(l.getTime() + DIAS_FOTOS * DIA);
}

export function debeArchivarse(actividad: Pick<Actividad, "resultadosDesde" | "demo">, entrega: Entrega, ahora = new Date()): boolean {
  if (actividad.demo || entrega.pdf || !entrega.imagenes?.length || entrega.resultados.length === 0) return false;
  const desde = archivarFotosDesde(actividad, entrega);
  return Boolean(desde && ahora >= desde);
}

/** Fecha en que se borra la actividad: 1 año después del último reporte (o de su aplicación si no tiene). */
export function fechaBorrado(actividad: Pick<Actividad, "fechaAplicacion">, entregas: Pick<Entrega, "evaluadaEn">[]): Date {
  const fechas = entregas.map((e) => (e.evaluadaEn ? Date.parse(e.evaluadaEn) : NaN)).filter(Number.isFinite);
  const base = fechas.length ? Math.max(...fechas) : Date.parse(`${actividad.fechaAplicacion}T12:00:00-06:00`);
  return new Date(base + DIAS_CONSERVACION * DIA);
}

export function diasRestantes(fecha: Date, ahora = new Date()): number {
  return Math.ceil((fecha.getTime() - ahora.getTime()) / DIA);
}

export function porBorrarse(fecha: Date, ahora = new Date()): boolean {
  return diasRestantes(fecha, ahora) <= DIAS_AVISO;
}

/**
 * Agrupa por curso las filas de "Conservación de la información" (cada una con su fecha de borrado).
 * Dentro de cada curso, de la que se borra antes a la última; los cursos, por su borrado más próximo.
 */
export function agruparPorCurso<T extends { grupoId?: string; borrado: Date }>(filas: T[]): { grupoId?: string; filas: T[]; proximo: Date }[] {
  const mapa = new Map<string | undefined, T[]>();
  for (const f of filas) mapa.set(f.grupoId, [...(mapa.get(f.grupoId) ?? []), f]);
  return [...mapa.entries()]
    .map(([grupoId, lista]) => {
      const ordenadas = [...lista].sort((x, y) => x.borrado.getTime() - y.borrado.getTime());
      return { grupoId, filas: ordenadas, proximo: ordenadas[0].borrado };
    })
    .sort((x, y) => x.proximo.getTime() - y.proximo.getTime());
}
