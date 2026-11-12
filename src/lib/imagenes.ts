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
  return rutas.map((r) => ({
    base64: leerArchivo(r).toString("base64"),
    mediaType: r.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
  }));
}

/** Guarda archivos subidos (fotos o PDF) en una carpeta y los devuelve listos para la IA. */
export async function guardarSubidos(
  archivos: File[],
  carpeta: string,
  guardar: (ruta: string, datos: Buffer) => string,
): Promise<{ rutas: string[]; paraIA: ImagenParaIA[] }> {
  const rutas: string[] = [];
  const paraIA: ImagenParaIA[] = [];
  for (const [i, f] of archivos.entries()) {
    const datos = Buffer.from(await f.arrayBuffer());
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      rutas.push(guardar(`${carpeta}/${i + 1}.pdf`, datos));
      paraIA.push({ base64: datos.toString("base64"), mediaType: "application/pdf" });
    } else {
      const jpg = await normalizarFoto(datos);
      rutas.push(guardar(`${carpeta}/${i + 1}.jpg`, jpg));
      paraIA.push({ base64: jpg.toString("base64"), mediaType: "image/jpeg" });
    }
  }
  return { rutas, paraIA };
}

export async function medidas(datos: Buffer) {
  const m = await sharp(datos).metadata();
  return { ancho: m.width ?? 1000, alto: m.height ?? 1300 };
}
