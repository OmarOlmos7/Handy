// Descarga la base libre "IP to Country Lite" de DB-IP (CC BY 4.0) para detectar el país
// del visitante y elegir el idioma. Se corre al construir la imagen de Docker. Si falla,
// la app funciona igual y elige el idioma con el del navegador.
import { mkdirSync, writeFileSync } from "node:fs";

const destino = process.argv[2] ?? "geoip";
mkdirSync(destino, { recursive: true });

const mes = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const hoy = new Date();
const anterior = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));

for (const m of [mes(hoy), mes(anterior)]) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${m}.csv.gz`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const datos = Buffer.from(await r.arrayBuffer());
    writeFileSync(`${destino}/dbip-country-lite.csv.gz`, datos);
    console.log(`Base de países por IP descargada (${m}, ${(datos.length / 1e6).toFixed(1)} MB).`);
    process.exit(0);
  } catch (e) {
    console.warn(`No se pudo descargar ${url}: ${e.message}`);
  }
}
console.warn("Sin base de países por IP: el idioma se elegirá con el del navegador.");
