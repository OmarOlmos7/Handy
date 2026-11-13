// Fecha y hora a partir de la cual los alumnos pueden ver sus resultados de una actividad.
// Se guarda en ISO (UTC) y se escribe y muestra en hora del centro de México.
import type { Actividad } from "./tipos";

export const ZONA_HORARIA = "America/Mexico_City";
/** El centro de México no cambia de horario desde 2022: siempre UTC−6. */
const DESFASE = "-06:00";

/** true si el alumno ya puede ver sus resultados (sin fecha, en cuanto se aprueben). */
export function resultadosDisponibles(actividad: Pick<Actividad, "resultadosDesde">, ahora: Date = new Date()) {
  if (!actividad.resultadosDesde) return true;
  const desde = Date.parse(actividad.resultadosDesde);
  return !Number.isFinite(desde) || ahora.getTime() >= desde;
}

/**
 * Convierte el valor de un campo `datetime-local` ("2026-11-20T08:00", hora del centro de México)
 * a ISO. Vacío: sin fecha. Lanza un error si el formato no es válido.
 */
export function deCampoFechaHora(valor: string): string | undefined {
  const v = valor.trim();
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new Error("Fecha y hora no válidas");
  const fecha = new Date(`${v}:00${DESFASE}`);
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha y hora no válidas");
  return fecha.toISOString();
}

function partes(iso: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const de = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { a: de("year"), m: de("month"), d: de("day"), h: de("hour"), min: de("minute") };
}

/** Valor para un campo `datetime-local` en hora del centro de México. */
export function aCampoFechaHora(iso?: string) {
  if (!iso) return "";
  const { a, m, d, h, min } = partes(iso);
  return `${a}-${m}-${d}T${h}:${min}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "20 nov 2026, 8:00 h" en hora del centro de México. */
export function fechaHoraLarga(iso: string) {
  const { a, m, d, h, min } = partes(iso);
  return `${Number(d)} ${MESES[Number(m) - 1]} ${a}, ${Number(h)}:${min} h`;
}
