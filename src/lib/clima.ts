// Clima del encabezado: convierte la respuesta del servicio meteorológico en uno de cinco estados
// (soleado, medio nublado, nublado, lluvia, tormenta) y la temperatura actual. Sin E/S: lo usan
// la ruta /api/clima (servidor) y las pruebas.

export type EstadoClima = "soleado" | "medio-nublado" | "nublado" | "lluvia" | "tormenta";

export interface Clima {
  /** Nombre de la ciudad según la IP del visitante. */
  ciudad: string;
  /** Grados Celsius, redondeados. */
  temperatura: number;
  estado: EstadoClima;
  /** De noche, el sol se dibuja como luna. */
  noche: boolean;
}

/**
 * Estado a partir del código de símbolo de MET Norway (p. ej. "partlycloudy_day",
 * "lightrainshowersandthunder_night", "heavysnow"). La nieve y el aguanieve cuentan como lluvia
 * y la niebla como nublado.
 */
export function estadoDeSimbolo(simbolo: string): { estado: EstadoClima; noche: boolean } {
  const s = simbolo.toLowerCase();
  const noche = /_(night|polartwilight)$/.test(s);
  const base = s.replace(/_(day|night|polartwilight)$/, "");
  let estado: EstadoClima;
  if (base.includes("thunder")) estado = "tormenta";
  else if (/rain|sleet|snow|shower/.test(base)) estado = "lluvia";
  else if (base === "partlycloudy" || base === "fair") estado = base === "fair" ? "soleado" : "medio-nublado";
  else if (base === "clearsky") estado = "soleado";
  else estado = "nublado"; // cloudy, fog y cualquier código nuevo
  return { estado, noche };
}

interface PasoMet {
  time?: string;
  data?: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string } };
    next_6_hours?: { summary?: { symbol_code?: string } };
  };
}

/**
 * Temperatura y estado actuales de una respuesta de MET Norway (locationforecast 2.0 compact):
 * se toma la última hora que ya empezó; si todas son futuras, la primera.
 */
export function climaDeMet(json: unknown, ahora = Date.now()): Omit<Clima, "ciudad"> | undefined {
  const serie = (json as { properties?: { timeseries?: PasoMet[] } })?.properties?.timeseries;
  if (!Array.isArray(serie) || serie.length === 0) return undefined;
  let paso = serie[0];
  for (const p of serie) {
    const t = Date.parse(p.time ?? "");
    if (Number.isFinite(t) && t <= ahora) paso = p;
    else break;
  }
  const temp = paso.data?.instant?.details?.air_temperature;
  const simbolo = paso.data?.next_1_hours?.summary?.symbol_code ?? paso.data?.next_6_hours?.summary?.symbol_code;
  if (typeof temp !== "number" || !Number.isFinite(temp) || !simbolo) return undefined;
  // Math.round(-0.4) da -0: se limpia para no mostrar "-0 °C".
  return { temperatura: Math.round(temp) || 0, ...estadoDeSimbolo(simbolo) };
}

/** MET Norway pide como máximo 4 decimales; con 2 (~1 km) los visitantes de una ciudad comparten caché. */
export function claveLugar(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/** IP privada, local o de documentación: no tiene ciudad (pasa en desarrollo o detrás de una red interna). */
export function esIpLocal(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, "");
  if (/^(10|127)\./.test(v4) || /^192\.168\./.test(v4) || /^169\.254\./.test(v4)) return true;
  const m = /^172\.(\d+)\./.exec(v4);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  const s = ip.toLowerCase();
  return s === "::1" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80:");
}
