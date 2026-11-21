// Fechas de una actividad para los alumnos: desde cuándo la ven (alta), cuándo abre y cuándo
// cierra la recepción de entregas. Se guardan en ISO (UTC) y se escriben en hora del centro de
// México, igual que la liberación de resultados (resultados.ts).
import { deCampoFechaHora } from "./resultados";
import type { Actividad } from "./tipos";

type ConFechas = Pick<Actividad, "visibleDesde" | "envioDesde" | "envioHasta">;

const ms = (iso?: string) => {
  const n = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** true si el alumno ya ve la actividad en su panel (sin fecha de alta, desde que se crea). */
export function actividadVisible(a: Pick<Actividad, "visibleDesde">, ahora: Date = new Date()): boolean {
  const desde = ms(a.visibleDesde);
  return desde === undefined || ahora.getTime() >= desde;
}

export type EstadoEnvio = "proximo" | "abierto" | "cerrado";

/**
 * Estado de la recepción de entregas: "proximo" antes del inicio (o de la fecha de alta),
 * "cerrado" desde el cierre y "abierto" entre ambos. Sin fechas, siempre abierta.
 */
export function estadoEnvio(a: ConFechas, ahora: Date = new Date()): EstadoEnvio {
  const t = ahora.getTime();
  const cierre = ms(a.envioHasta);
  if (cierre !== undefined && t >= cierre) return "cerrado";
  const inicio = ms(a.envioDesde) ?? ms(a.visibleDesde);
  if (inicio !== undefined && t < inicio) return "proximo";
  return "abierto";
}

/** Momento en que abre la recepción (el inicio de envíos o, si no hay, la fecha de alta). */
export function aperturaEnvio(a: ConFechas): string | undefined {
  return a.envioDesde ?? a.visibleDesde;
}

export interface FechasActividad {
  visibleDesde?: string;
  envioDesde?: string;
  envioHasta?: string;
  resultadosDesde?: string;
}

/**
 * Lee los cuatro campos `datetime-local` (hora del centro de México) y revisa su orden: el alta
 * no puede ser después del inicio de envíos, el inicio debe ser antes del cierre y los
 * resultados no se liberan antes de que cierre la recepción. Lanza un error con el motivo.
 */
export function leerFechas(campos: { visibleDesde?: string; envioDesde?: string; envioHasta?: string; resultadosDesde?: string }): FechasActividad {
  const f: FechasActividad = {
    visibleDesde: deCampoFechaHora(campos.visibleDesde ?? ""),
    envioDesde: deCampoFechaHora(campos.envioDesde ?? ""),
    envioHasta: deCampoFechaHora(campos.envioHasta ?? ""),
    resultadosDesde: deCampoFechaHora(campos.resultadosDesde ?? ""),
  };
  const [alta, inicio, cierre, resultados] = [ms(f.visibleDesde), ms(f.envioDesde), ms(f.envioHasta), ms(f.resultadosDesde)];
  if (alta !== undefined && inicio !== undefined && alta > inicio) {
    throw new Error("El alta de la actividad no puede ser después del inicio de envíos");
  }
  const abre = inicio ?? alta;
  if (abre !== undefined && cierre !== undefined && abre >= cierre) {
    throw new Error("El cierre de envíos debe ser después del inicio de envíos y del alta");
  }
  if (cierre !== undefined && resultados !== undefined && resultados < cierre) {
    throw new Error("La liberación de resultados no puede ser antes del cierre de envíos");
  }
  return f;
}
