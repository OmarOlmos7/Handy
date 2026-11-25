// Material de una actividad de contenido (anexos del profesor o evidencia del alumno) listo
// para la IA: las imágenes y los PDF van como tales; Word, Excel y PowerPoint, como su texto;
// el audio y el video no los lee la IA (solo se mencionan para que el profesor los revise).
import "server-only";
import { leerArchivo } from "./almacen";
import { claseDeArchivo, laIALee } from "./contenido";
import { normalizarFoto } from "./imagenes";
import type { ImagenParaIA } from "./ia";
import type { ClaseArchivo } from "./tipos";
import { vistaComoTexto, vistaDeArchivo } from "./vista-archivo";

export interface MaterialParaIA {
  imagenes: ImagenParaIA[];
  textos: { nombre: string; texto: string }[];
  /** Archivos que la IA no lee (audio y video). */
  sinLeer: { nombre: string; clase: ClaseArchivo }[];
}

export async function materialParaIA(archivos: { ruta: string; nombre?: string }[], maxTexto = 30_000): Promise<MaterialParaIA> {
  const salida: MaterialParaIA = { imagenes: [], textos: [], sinLeer: [] };
  for (const a of archivos) {
    const nombre = a.nombre ?? a.ruta.split("/").at(-1) ?? "archivo";
    const clase = claseDeArchivo(a.ruta);
    if (!clase) continue;
    if (!laIALee(clase)) {
      salida.sinLeer.push({ nombre, clase });
      continue;
    }
    let datos: Buffer;
    try {
      datos = leerArchivo(a.ruta);
    } catch {
      continue;
    }
    if (clase === "pdf") salida.imagenes.push({ base64: datos.toString("base64"), mediaType: "application/pdf" });
    else if (clase === "imagen") salida.imagenes.push({ base64: datos.toString("base64"), mediaType: a.ruta.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg" });
    else {
      const vista = await vistaDeArchivo(datos, clase);
      if (vista) salida.textos.push({ nombre, texto: vistaComoTexto(vista, maxTexto) });
      else salida.sinLeer.push({ nombre, clase });
    }
  }
  return salida;
}

/** true si la IA tiene algo que leer en el material. */
export function hayQueLeer(m: MaterialParaIA): boolean {
  return m.imagenes.length > 0 || m.textos.length > 0;
}

/**
 * Material recién elegido en el alta (aún sin guardar), para redactar las instrucciones. Del
 * audio y el video solo llega el nombre.
 */
export async function materialDeSubidos(archivos: File[], otros: string[]): Promise<MaterialParaIA> {
  const salida: MaterialParaIA = { imagenes: [], textos: [], sinLeer: [] };
  for (const f of archivos) {
    const clase = claseDeArchivo(f.name, f.type);
    if (!clase) continue;
    if (!laIALee(clase)) {
      salida.sinLeer.push({ nombre: f.name, clase });
      continue;
    }
    const datos = Buffer.from(await f.arrayBuffer());
    try {
      if (clase === "pdf") salida.imagenes.push({ base64: datos.toString("base64"), mediaType: "application/pdf" });
      else if (clase === "imagen") salida.imagenes.push({ base64: (await normalizarFoto(datos)).toString("base64"), mediaType: "image/jpeg" });
      else {
        const vista = await vistaDeArchivo(datos, clase);
        if (vista) salida.textos.push({ nombre: f.name, texto: vistaComoTexto(vista, 20_000) });
      }
    } catch {
      // Un archivo que no se puede leer no impide redactar con lo demás.
    }
  }
  for (const nombre of otros.slice(0, 20)) {
    const clase = claseDeArchivo(nombre);
    if (clase && !laIALee(clase)) salida.sinLeer.push({ nombre: nombre.slice(0, 120), clase });
  }
  return salida;
}
