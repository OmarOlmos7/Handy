import "server-only";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
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

/** Máximo de páginas que se aceptan en una entrega. */
export const MAX_PAGINAS_ENTREGA = 20;

/**
 * Convierte un PDF (por ejemplo, la hoja escrita a mano en una tableta) en una imagen JPG
 * por página, igual que si el alumno hubiera tomado una foto de cada hoja. Usa pdftoppm
 * (poppler-utils, instalado en la imagen de Docker).
 */
export async function pdfAImagenes(datos: Buffer): Promise<Buffer[]> {
  const paginas = (await PDFDocument.load(datos, { ignoreEncryption: true })).getPageCount();
  if (paginas < 1) throw new Error("El PDF no tiene páginas");
  if (paginas > MAX_PAGINAS_ENTREGA) throw new RangeError(`El PDF tiene ${paginas} páginas; el máximo es ${MAX_PAGINAS_ENTREGA}`);
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), "entrega-pdf-"));
  try {
    const entrada = path.join(carpeta, "hoja.pdf");
    await fs.writeFile(entrada, datos);
    // 150 dpi en carta da ~1650 px de alto: suficiente para leer la letra; luego se ajusta a 1568 px.
    await promisify(execFile)("pdftoppm", ["-r", "150", "-jpeg", "-jpegopt", "quality=90", entrada, path.join(carpeta, "p")], {
      timeout: 120_000,
    });
    const archivos = (await fs.readdir(carpeta))
      .filter((f) => /^p-\d+\.jpg$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    if (archivos.length === 0) throw new Error("No se pudo leer el PDF");
    const jpgs: Buffer[] = [];
    for (const f of archivos) jpgs.push(await normalizarFoto(await fs.readFile(path.join(carpeta, f))));
    return jpgs;
  } finally {
    await fs.rm(carpeta, { recursive: true, force: true });
  }
}
