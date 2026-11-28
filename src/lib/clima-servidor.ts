// Ciudad por IP y clima actual para el encabezado.
//
// Privacidad: la IP del visitante no sale del servidor. La ciudad se busca en la base libre
// "IP to City Lite" de DB-IP (CC BY 4.0), descargada al construir la imagen de Docker
// (scripts/descargar-geoip.mjs). Al servicio del clima (MET Norway, gratuito, sin llave y con uso
// comercial permitido) solo se mandan las coordenadas de la ciudad con 2 decimales.
//
// Todo tiene caché en memoria y, si algo falla, el encabezado solo muestra la fecha y la hora.
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { open, type CityResponse, type Reader } from "maxmind";
import { claveLugar, climaDeMet, esIpLocal, type Clima } from "./clima";

interface Ubicacion {
  ciudad: string;
  lat: number;
  lon: number;
}

// --- Ciudad por IP -------------------------------------------------------------------------

let lector: Promise<Reader<CityResponse> | null> | undefined;

function abrirBase(): Promise<Reader<CityResponse> | null> {
  lector ??= (async () => {
    const ruta = process.env.GEOIP_CIUDAD ?? path.join(process.cwd(), "geoip", "dbip-city-lite.mmdb");
    if (!existsSync(/*turbopackIgnore: true*/ ruta)) return null;
    try {
      return await open<CityResponse>(/*turbopackIgnore: true*/ ruta, { cache: { max: 5000 } });
    } catch (e) {
      console.error("No se pudo abrir la base de ciudades por IP", e);
      return null;
    }
  })();
  return lector;
}

function nombre(lista: object | undefined, idioma: string): string | undefined {
  if (!lista) return undefined;
  const nombres = lista as Record<string, string | undefined>;
  return nombres[idioma] ?? nombres.es ?? nombres.en ?? Object.values(nombres)[0];
}

/** Ciudad y coordenadas de la IP, o undefined si no se sabe (IP local, sin base, IP desconocida). */
export async function ubicacionDeIp(ip: string | undefined, idioma = "es"): Promise<Ubicacion | undefined> {
  if (!ip || esIpLocal(ip)) return undefined;
  const base = await abrirBase();
  if (!base) return undefined;
  let r: CityResponse | null = null;
  try {
    r = base.get(ip.replace(/^::ffff:/i, ""));
  } catch {
    return undefined; // IP mal formada
  }
  const lat = r?.location?.latitude;
  const lon = r?.location?.longitude;
  const ciudad = nombre(r?.city?.names, idioma) ?? nombre(r?.subdivisions?.[0]?.names, idioma);
  if (typeof lat !== "number" || typeof lon !== "number" || !ciudad) return undefined;
  return { ciudad, lat, lon };
}

/** País (ISO de 2 letras) de la IP, o undefined si no se sabe. Para los asuetos de la agenda. */
export async function paisDeIp(ip: string | undefined): Promise<string | undefined> {
  if (!ip || esIpLocal(ip)) return undefined;
  const base = await abrirBase();
  if (!base) return undefined;
  try {
    return base.get(ip.replace(/^::ffff:/i, ""))?.country?.iso_code ?? undefined;
  } catch {
    return undefined;
  }
}

// --- Clima ---------------------------------------------------------------------------------

/** Al menos 20 minutos entre consultas del mismo lugar (MET Norway pide respetar "Expires"). */
const VIGENCIA_MIN_MS = 20 * 60_000;
/** Si el servicio falla, se espera 10 minutos antes de volver a intentar ese lugar. */
const ESPERA_FALLA_MS = 10 * 60_000;
const MAX_LUGARES = 2000;

type ClimaLugar = Omit<Clima, "ciudad">;
const cache = new Map<string, { hasta: number; valor?: ClimaLugar }>();
const enCurso = new Map<string, Promise<ClimaLugar | undefined>>();

function agenteMet(): string {
  // MET Norway exige identificar la app con un sitio o correo de contacto.
  return `iEureka-Grader/1.0 ${process.env.APP_URL || "https://ieureka-grader.com"}`;
}

async function consultarMet(lat: number, lon: number): Promise<{ valor?: ClimaLugar; hasta: number }> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": agenteMet(), Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`MET Norway respondió ${r.status}`);
  const expira = Date.parse(r.headers.get("expires") ?? "");
  const hasta = Math.max(Date.now() + VIGENCIA_MIN_MS, Number.isFinite(expira) ? expira : 0);
  return { valor: climaDeMet(await r.json()), hasta };
}

/** Clima actual en esas coordenadas (con caché por lugar y una sola consulta a la vez). */
export async function climaEn(lat: number, lon: number): Promise<ClimaLugar | undefined> {
  const clave = claveLugar(lat, lon);
  const guardado = cache.get(clave);
  if (guardado && guardado.hasta > Date.now()) return guardado.valor;
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente;
  const p = consultarMet(lat, lon)
    .then(({ valor, hasta }) => {
      guardar(clave, { valor, hasta: valor ? hasta : Date.now() + ESPERA_FALLA_MS });
      return valor;
    })
    .catch((e) => {
      console.warn("Clima no disponible:", e instanceof Error ? e.message : e);
      // Si había un dato viejo, se sigue mostrando mientras el servicio vuelve.
      guardar(clave, { valor: guardado?.valor, hasta: Date.now() + ESPERA_FALLA_MS });
      return guardado?.valor;
    })
    .finally(() => enCurso.delete(clave));
  enCurso.set(clave, p);
  return p;
}

function guardar(clave: string, v: { hasta: number; valor?: ClimaLugar }) {
  cache.delete(clave);
  cache.set(clave, v);
  // Se descarta el más antiguo si hay demasiados lugares.
  if (cache.size > MAX_LUGARES) cache.delete(cache.keys().next().value!);
}

/** Ciudad y clima del visitante, o undefined si no se pudo saber. */
export async function climaDeIp(ip: string | undefined, idioma?: string): Promise<Clima | undefined> {
  const lugar = await ubicacionDeIp(ip, idioma);
  if (!lugar) return undefined;
  const clima = await climaEn(lugar.lat, lugar.lon);
  return clima && { ciudad: lugar.ciudad, ...clima };
}
