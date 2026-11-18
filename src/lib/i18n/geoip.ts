// País de una dirección IPv4 con la base libre "IP to Country Lite" de DB-IP
// (https://db-ip.com, licencia CC BY 4.0). La base se descarga al construir la imagen
// de Docker (scripts/descargar-geoip.mjs) y se consulta en el servidor: la IP del
// visitante nunca sale a otro servicio. Sin base, no hay país y se usa el navegador.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

export interface TablaPaises {
  inicios: Uint32Array;
  finales: Uint32Array;
  /** Dos letras por rango, empacadas en 16 bits. */
  paises: Uint16Array;
}

/** "1.2.3.4" → entero sin signo, o undefined si no es una IPv4. También acepta "::ffff:1.2.3.4". */
export function ipv4ANumero(ip: string): number | undefined {
  const limpia = ip.trim().replace(/^::ffff:/i, "");
  const partes = limpia.split(".");
  if (partes.length !== 4) return undefined;
  let n = 0;
  for (const p of partes) {
    if (!/^\d{1,3}$/.test(p)) return undefined;
    const v = Number(p);
    if (v > 255) return undefined;
    n = n * 256 + v;
  }
  return n;
}

const empacar = (cc: string) => (cc.charCodeAt(0) << 8) | cc.charCodeAt(1);
const desempacar = (n: number) => String.fromCharCode(n >> 8, n & 0xff);

/** Lee el CSV "inicio,fin,país" (solo las filas IPv4) y lo deja ordenado para buscar rápido. */
export function tablaDesdeCsv(csv: string): TablaPaises {
  const inicios: number[] = [];
  const finales: number[] = [];
  const paises: number[] = [];
  for (const linea of csv.split("\n")) {
    if (!linea || linea.includes(":")) continue;
    const [a, b, c] = linea.replace(/"/g, "").split(",");
    const ini = ipv4ANumero(a ?? "");
    const fin = ipv4ANumero(b ?? "");
    const cc = (c ?? "").trim().toUpperCase();
    if (ini === undefined || fin === undefined || !/^[A-Z]{2}$/.test(cc)) continue;
    inicios.push(ini);
    finales.push(fin);
    paises.push(empacar(cc));
  }
  const orden = inicios.map((_, i) => i).sort((x, y) => inicios[x] - inicios[y]);
  return {
    inicios: Uint32Array.from(orden.map((i) => inicios[i])),
    finales: Uint32Array.from(orden.map((i) => finales[i])),
    paises: Uint16Array.from(orden.map((i) => paises[i])),
  };
}

export function buscarPais(tabla: TablaPaises, ip: string): string | undefined {
  const n = ipv4ANumero(ip);
  if (n === undefined) return undefined;
  let lo = 0;
  let hi = tabla.inicios.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (tabla.inicios[m] <= n) lo = m + 1;
    else hi = m - 1;
  }
  if (hi < 0 || n > tabla.finales[hi]) return undefined;
  const cc = desempacar(tabla.paises[hi]);
  return cc === "ZZ" ? undefined : cc;
}

// Se lee una sola vez por ruta (la primera petición sin idioma elegido tarda unos cientos de ms).
const tablas = new Map<string, TablaPaises | null>();

function cargar(): TablaPaises | null {
  const ruta = process.env.GEOIP_CSV ?? path.join(process.cwd(), "geoip", "dbip-country-lite.csv.gz");
  if (tablas.has(ruta)) return tablas.get(ruta)!;
  let tabla: TablaPaises | null = null;
  try {
    if (existsSync(ruta)) {
      const crudo = readFileSync(ruta);
      tabla = tablaDesdeCsv(ruta.endsWith(".gz") ? gunzipSync(crudo).toString("utf8") : crudo.toString("utf8"));
    }
  } catch (e) {
    console.error("No se pudo leer la base de países por IP", e);
  }
  tablas.set(ruta, tabla);
  return tabla;
}

/** País (ISO de dos letras) de la IP, o undefined si no se sabe. */
export function paisDeIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const t = cargar();
  return t ? buscarPais(t, ip) : undefined;
}
