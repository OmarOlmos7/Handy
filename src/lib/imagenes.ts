import "server-only";
import sharp from "sharp";
import type { ImagenParaIA } from "./ia";
import { leerArchivo } from "./almacen";

/**
 * Normaliza una foto subida: respeta la orientación del celular, la reduce a
 * 1568 px por lado (lo que la IA aprovecha) y la guarda como JPEG.
 */
export async function normalizarFoto(datos: Buffer): Promise<Buffer> {
  return sharp(datos)
    .rotate()
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

export function imagenesParaIA(rutas: string[]): ImagenParaIA[] {
  return rutas.map((r) => ({ base64: leerArchivo(r).toString("base64"), mediaType: "image/jpeg" }));
}

export async function medidas(datos: Buffer) {
  const m = await sharp(datos).metadata();
  return { ancho: m.width ?? 1000, alto: m.height ?? 1300 };
}
