// Guarda los archivos de una actividad de contenido (anexos del profesor o evidencia del alumno).
// Las fotos se normalizan a JPG como en las entregas; lo demás se guarda tal cual.
import "server-only";
import { PDFDocument } from "pdf-lib";
import { guardarArchivo } from "./almacen";
import { claseDeArchivo, extensionParaGuardar, laIALee, revisarArchivos } from "./contenido";
import { normalizarFoto } from "./imagenes";
import type { AnexoContenido } from "./tipos";

export class ErrorArchivos extends Error {
  constructor(
    readonly clave: "cantidad" | "tipo" | "tamano" | "total" | "invalido",
    readonly nombre?: string,
  ) {
    super(clave);
  }
}

/**
 * Guarda los archivos en la carpeta y devuelve su ficha y cuántas páginas leerá la IA (un PDF
 * cuenta sus páginas; un Word, Excel, PowerPoint o imagen, uno; el audio y el video, ninguno).
 */
export async function guardarArchivosContenido(
  archivos: File[],
  carpeta: string,
  max: number,
  prefijo = "",
): Promise<{ anexos: AnexoContenido[]; paginasIA: number }> {
  const problema = revisarArchivos(archivos, max);
  if (problema) throw new ErrorArchivos(problema.error, problema.nombre);
  const anexos: AnexoContenido[] = [];
  let paginasIA = 0;
  for (const [i, f] of archivos.entries()) {
    const clase = claseDeArchivo(f.name, f.type)!;
    let datos: Buffer = Buffer.from(await f.arrayBuffer());
    let ext = extensionParaGuardar(f.name, clase);
    try {
      if (clase === "imagen") {
        datos = await normalizarFoto(datos);
        ext = "jpg";
      } else if (clase === "pdf") {
        paginasIA += (await PDFDocument.load(datos, { ignoreEncryption: true })).getPageCount();
      }
    } catch {
      throw new ErrorArchivos("invalido", f.name);
    }
    if (clase !== "pdf" && laIALee(clase)) paginasIA += 1;
    const nombre = f.name.replace(/[\\/]/g, "_").slice(0, 120) || `archivo-${i + 1}.${ext}`;
    const ruta = guardarArchivo(`${carpeta}/${prefijo}${i + 1}.${ext}`, datos);
    anexos.push({ ruta, nombre, clase, bytes: datos.length });
  }
  return { anexos, paginasIA };
}
