// Descarga las bases libres de DB-IP (CC BY 4.0) que se consultan en el servidor, sin mandar la IP
// del visitante a ningún servicio. Se corre al construir la imagen de Docker. Si alguna falla,
// la app funciona igual:
// - "IP to Country Lite": país del visitante para elegir el idioma y la divisa
//   (sin ella, se usa el idioma del navegador).
// - "IP to City Lite" (formato MMDB): ciudad y coordenadas para el clima del encabezado
//   (sin ella, el encabezado muestra solo la fecha y la hora).
import { createWriteStream, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

const destino = process.argv[2] ?? "geoip";
mkdirSync(destino, { recursive: true });

const mes = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const hoy = new Date();
const anterior = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));
const meses = [mes(hoy), mes(anterior)];

async function paises() {
  for (const m of meses) {
    const url = `https://download.db-ip.com/free/dbip-country-lite-${m}.csv.gz`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const datos = Buffer.from(await r.arrayBuffer());
      writeFileSync(`${destino}/dbip-country-lite.csv.gz`, datos);
      console.log(`Base de países por IP descargada (${m}, ${(datos.length / 1e6).toFixed(1)} MB).`);
      return;
    } catch (e) {
      console.warn(`No se pudo descargar ${url}: ${e.message}`);
    }
  }
  console.warn("Sin base de países por IP: el idioma se elegirá con el del navegador.");
}

async function ciudades() {
  const final = `${destino}/dbip-city-lite.mmdb`;
  const temporal = `${final}.parcial`;
  for (const m of meses) {
    const url = `https://download.db-ip.com/free/dbip-city-lite-${m}.mmdb.gz`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      // Se descomprime al vuelo (son ~130 MB): no se carga todo en memoria.
      await pipeline(Readable.fromWeb(r.body), createGunzip(), createWriteStream(temporal));
      renameSync(temporal, final);
      console.log(`Base de ciudades por IP descargada (${m}, ${(statSync(final).size / 1e6).toFixed(0)} MB).`);
      return;
    } catch (e) {
      rmSync(temporal, { force: true });
      console.warn(`No se pudo descargar ${url}: ${e.message}`);
    }
  }
  console.warn("Sin base de ciudades por IP: el encabezado mostrará solo la fecha y la hora.");
}

await paises();
if (process.env.GEOIP_SIN_CIUDADES !== "1") await ciudades();
