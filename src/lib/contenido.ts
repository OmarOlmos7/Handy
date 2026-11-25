// Actividades de contenido: el profesor anexa material (PDF, Word, Excel, PowerPoint, audio o
// video) con instrucciones, y el alumno entrega a mano (fotos) o con evidencia digital.
// Este módulo no usa nada del servidor: lo comparten el alta, el previsualizador y las rutas.
import type { Actividad, ClaseArchivo, EntregaContenido, Escala, Reactivo } from "./tipos";

/** Máximo de archivos anexos por actividad y de archivos de evidencia por entrega. */
export const MAX_ANEXOS = 10;
export const MAX_EVIDENCIAS = 5;
/** Tamaño máximo de cada archivo (los videos son los más pesados). */
export const MAX_BYTES_ARCHIVO = 50 * 1024 * 1024;
/** Tamaño máximo de todo lo que se sube de una vez (el servidor acepta 60 MB por petición). */
export const MAX_BYTES_TOTAL = 55 * 1024 * 1024;

const EXTENSIONES: Record<ClaseArchivo, string[]> = {
  pdf: ["pdf"],
  word: ["docx"],
  excel: ["xlsx"],
  ppt: ["pptx"],
  audio: ["mp3", "m4a", "wav", "ogg", "oga", "aac", "weba"],
  video: ["mp4", "m4v", "webm", "mov", "ogv"],
  imagen: ["jpg", "jpeg", "png", "webp", "gif"],
};

/** Tipo MIME de cada extensión que se sirve (para mostrarlo en el navegador). */
export const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  weba: "audio/webm",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Valor del atributo accept de los campos de archivo (anexos y evidencia digital). */
export const ACEPTA_ARCHIVOS = [
  ...Object.values(EXTENSIONES)
    .flat()
    .map((e) => `.${e}`),
  "audio/*",
  "video/*",
  "image/*",
].join(",");

export function extension(nombre: string): string {
  const m = nombre.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/** Clase del archivo por su extensión (o su tipo MIME); undefined si no se acepta. */
export function claseDeArchivo(nombre: string, mime = ""): ClaseArchivo | undefined {
  const ext = extension(nombre);
  for (const [clase, exts] of Object.entries(EXTENSIONES) as [ClaseArchivo, string[]][]) if (exts.includes(ext)) return clase;
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "imagen";
  return undefined;
}

/** Extensión con la que se guarda un archivo (la suya si se reconoce; si no, la típica de su clase). */
export function extensionParaGuardar(nombre: string, clase: ClaseArchivo): string {
  const ext = extension(nombre);
  return EXTENSIONES[clase].includes(ext) ? ext : EXTENSIONES[clase][0];
}

export const ICONO_CLASE: Record<ClaseArchivo, string> = {
  pdf: "📕",
  word: "📘",
  excel: "📗",
  ppt: "📙",
  audio: "🎧",
  video: "🎬",
  imagen: "🖼️",
};

/** true si la IA puede leer el archivo (el audio y el video los revisa el profesor). */
export function laIALee(clase: ClaseArchivo): boolean {
  return clase !== "audio" && clase !== "video";
}

/** Tamaño legible: "850 KB", "12.4 MB". */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Revisa la lista de archivos antes de subirla: cantidad, clase y tamaño. Devuelve la clave del error. */
export function revisarArchivos(
  archivos: { name: string; type?: string; size: number }[],
  max: number,
): { error: "cantidad" | "tipo" | "tamano" | "total"; nombre?: string } | undefined {
  if (archivos.length > max) return { error: "cantidad" };
  for (const f of archivos) {
    if (!claseDeArchivo(f.name, f.type)) return { error: "tipo", nombre: f.name };
    if (f.size > MAX_BYTES_ARCHIVO) return { error: "tamano", nombre: f.name };
  }
  if (archivos.reduce((s, f) => s + f.size, 0) > MAX_BYTES_TOTAL) return { error: "total" };
  return undefined;
}

export function leerEntregaContenido(v: unknown): EntregaContenido {
  return v === "digital" ? "digital" : "manuscrita";
}

/** true si la actividad es de contenido. */
export function esContenido(act: Pick<Actividad, "contenido">): boolean {
  return Boolean(act.contenido);
}

/** true si la actividad de contenido se entrega con evidencia digital (en la app). */
export function esEvidenciaDigital(act: Pick<Actividad, "contenido">): boolean {
  return act.contenido?.entrega === "digital";
}

/** Separa las instrucciones escritas por el profesor en renglones (sin viñetas ni renglones vacíos). */
export function renglonesInstrucciones(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^([-•*]|\d+[.)])\s+/, ""))
    .filter(Boolean)
    .slice(0, 30);
}

/**
 * El único reactivo de una actividad de contenido: la tarea completa. Con solución es un
 * desarrollo (la solución del profesor da los pasos); sin solución, una producción abierta que
 * se valora con los criterios.
 */
export function reactivoContenido(titulo: string, instrucciones: string[], escala: Escala, sinSolucion: boolean): Reactivo {
  return {
    numero: 1,
    tipo: sinSolucion ? "abierto" : "desarrollo",
    enunciado: [titulo, ...instrucciones].join("\n").slice(0, 4000),
    respuesta: "",
    puntos: escala === 10 ? 10 : 100,
    tema: titulo.slice(0, 60),
    habilidad: "Aplicación del contenido",
    pagina: 1,
    y: 0,
    lineas: 12,
  };
}

/**
 * La rúbrica que sale de la solución del profesor puede traer varios reactivos; en una actividad
 * de contenido todo se califica como una sola tarea: sus pasos se unen (con peso según los puntos
 * de cada reactivo) y el enunciado, los puntos y el tipo se conservan.
 */
export function unirEnUnReactivo(base: Reactivo, nuevos: Reactivo[]): Reactivo {
  if (!nuevos.length) return base;
  const total = nuevos.reduce((s, r) => s + (r.puntos > 0 ? r.puntos : 1), 0);
  const pasos = nuevos.flatMap((r) => {
    const peso = (r.puntos > 0 ? r.puntos : 1) / total;
    if (r.pasos?.length) return r.pasos.map((p) => ({ nombre: p.nombre, peso: p.peso * peso }));
    return [{ nombre: (r.enunciado || r.tema || `Parte ${r.numero}`).slice(0, 80), peso }];
  });
  const varios = nuevos.length > 1;
  return {
    ...base,
    respuesta: nuevos.map((r) => (varios ? `${r.numero}) ${r.respuesta}` : r.respuesta)).join("\n").trim(),
    pasos: base.tipo === "desarrollo" ? pasos : base.pasos,
    solucionPasos: nuevos.flatMap((r) => r.solucionPasos ?? []).slice(0, 40),
    tema: base.tema || nuevos[0].tema,
    habilidad: nuevos[0].habilidad || base.habilidad,
  };
}
