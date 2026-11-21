// Tiempo que cada alumno tiene abierta una actividad. La página manda un pulso cada 30 s con los
// segundos que la pestaña estuvo visible y en uso; aquí se acumulan, con tope por pulso.
import type { BaseDeDatos, TiempoActividad } from "./tipos";

/** Máximo de segundos que cuenta un pulso (la página lo manda cada 30 s). */
export const MAX_PULSO = 60;
/** Un pulso que llega antes de esto después del anterior no suma (evita duplicados). */
export const MIN_ENTRE_PULSOS = 15;

/** Hora (0-23) y día de la semana (0 domingo) en el centro de México (UTC−6, sin horario de verano). */
export function horaYDiaMexico(fecha: Date) {
  const local = new Date(fecha.getTime() - 6 * 3_600_000);
  return { hora: local.getUTCHours(), dia: local.getUTCDay() };
}

/** Suma un pulso al tiempo del alumno en la actividad. Devuelve los segundos que sí contaron. */
export function registrarPulso(db: Pick<BaseDeDatos, "tiempos">, actividadId: string, matricula: string, segundos: unknown, ahora = new Date()): number {
  const s = typeof segundos === "number" && Number.isFinite(segundos) ? Math.round(Math.min(MAX_PULSO, Math.max(0, segundos))) : 0;
  db.tiempos ??= [];
  let t = db.tiempos.find((x) => x.actividadId === actividadId && x.matricula === matricula);
  if (t && ahora.getTime() - Date.parse(t.ultimaVez) < MIN_ENTRE_PULSOS * 1000) return 0;
  if (!t) {
    t = { actividadId, matricula, segundos: 0, porHora: new Array(24).fill(0), porDia: new Array(7).fill(0), primeraVez: ahora.toISOString(), ultimaVez: ahora.toISOString() };
    db.tiempos.push(t);
  }
  t.ultimaVez = ahora.toISOString();
  if (!s) return 0;
  const { hora, dia } = horaYDiaMexico(ahora);
  t.segundos += s;
  t.porHora[hora] += s;
  t.porDia[dia] += s;
  return s;
}

/** Tiempo como texto corto: "45 min", "2 h 10 min". */
export function textoTiempo(segundos: number) {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export type { TiempoActividad };
