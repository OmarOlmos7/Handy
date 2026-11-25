// Logo personalizado del profesor: reemplaza la imagen de iEureka-Grader en su barra superior
// y en las hojas que imprime. Se guarda como PNG en la carpeta de datos y se puede restaurar.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { leerArchivo } from "./almacen";
import type { ConfiguracionProfesor } from "./tipos";

export const LOGO_ORIGINAL = "/logo.png";
/** Peso máximo de la imagen que sube el profesor. */
export const MAX_BYTES_LOGO = 5 * 1024 * 1024;
/** Lado mayor del PNG guardado: suficiente para la barra y la hoja impresa. */
const LADO_LOGO = 600;

export function rutaLogo(profesorId: string) {
  return `profesores/${profesorId}/logo.png`;
}

/** Dirección de la imagen que se muestra: la del profesor (con versión para no usar la caché vieja) o la original. */
export function srcLogo(config?: ConfiguracionProfesor) {
  return config?.logo ? `/api/logo?v=${encodeURIComponent(config.logo)}` : LOGO_ORIGINAL;
}

/** Convierte la imagen subida en un PNG de tamaño moderado; conserva la transparencia. Falla si no es imagen. */
export async function normalizarLogo(datos: Buffer): Promise<Buffer> {
  const meta = await sharp(datos).metadata();
  if (!meta.width || !meta.height) throw new Error("Imagen sin medidas");
  return sharp(datos, { animated: false })
    .rotate()
    .resize({ width: LADO_LOGO, height: LADO_LOGO, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
}

/** PNG del logo para los PDF: el del profesor si lo tiene, si no el original. */
export function bytesLogo(profesor?: { id: string; config?: ConfiguracionProfesor }): Buffer {
  if (profesor?.config?.logo) {
    try {
      return leerArchivo(rutaLogo(profesor.id));
    } catch {
      // Si el archivo se perdió, se usa el original.
    }
  }
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "logo.png"));
}
