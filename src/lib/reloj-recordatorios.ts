// Reloj interno de recordatorios: cada 10 minutos le pide al propio servidor que mande los
// recordatorios de asesoría del día (desde las 6:30, hora del centro de México). Así no hace falta
// un cron aparte en el VPS. Se apaga con RECORDATORIOS=0.
import crypto from "node:crypto";

const CADA_MS = 10 * 60_000;
const PRIMERA_MS = 60_000;

let iniciado = false;

export function iniciarRelojRecordatorios() {
  if (iniciado || process.env.RECORDATORIOS === "0" || process.env.NEXT_PHASE === "phase-production-build") return;
  iniciado = true;
  // La clave solo vive en este proceso, salvo que la fijen para un cron externo.
  process.env.RECORDATORIOS_TOKEN ||= crypto.randomBytes(24).toString("hex");
  const url = `http://127.0.0.1:${process.env.PORT || 3000}/api/asesorias/recordatorios`;
  const correr = async () => {
    try {
      const r = await fetch(url, { method: "POST", headers: { "x-recordatorios": process.env.RECORDATORIOS_TOKEN ?? "" }, signal: AbortSignal.timeout(110_000) });
      if (!r.ok) console.error("Recordatorios de asesoría:", r.status);
    } catch (e) {
      console.error("Recordatorios de asesoría:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(correr, PRIMERA_MS).unref();
  setInterval(correr, CADA_MS).unref();
}
