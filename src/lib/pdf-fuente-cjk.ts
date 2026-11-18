// Fuente japonesa y china del servidor para los PDF. En Docker la instala el paquete
// fonts-wqy-microhei; FUENTE_CJK permite indicar otra (.ttf, .otf o .ttc).
import "server-only";
import fs from "node:fs";

const RUTAS = [
  process.env.FUENTE_CJK,
  "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
  "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
];

let ruta: string | null | undefined;

/** Ruta de la fuente CJK, o null si el servidor no tiene ninguna. */
export function rutaFuenteCjk(): string | null {
  if (ruta === undefined) ruta = RUTAS.find((r): r is string => Boolean(r && fs.existsSync(r))) ?? null;
  return ruta;
}

/** Bytes de la fuente CJK (se leen solo cuando un PDF la necesita). */
export async function leerFuenteCjk(): Promise<Uint8Array | null> {
  const r = rutaFuenteCjk();
  return r ? new Uint8Array(await fs.promises.readFile(r)) : null;
}
