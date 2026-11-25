// Previsualización y lectura para la IA de los documentos de Office (Word, Excel, PowerPoint).
// El navegador no los muestra por sí mismo: aquí se saca su texto (párrafos, hojas con sus celdas
// o diapositivas) sin enviar el archivo a servicios externos.
import "server-only";
import { archivoDeZip, textoDeDocx } from "./docx";
import type { ClaseArchivo } from "./tipos";

export type VistaArchivo =
  | { tipo: "texto"; parrafos: string[] }
  | { tipo: "tabla"; hojas: { nombre: string; filas: string[][] }[] }
  | { tipo: "diapositivas"; diapositivas: string[][] };

const MAX_FILAS = 200;
const MAX_COLUMNAS = 30;
const MAX_DIAPOSITIVAS = 150;

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodificar = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTIDADES[e] ?? m;
  });

/** Texto de cada diapositiva de un .pptx (un renglón por párrafo). */
export function diapositivasDePptx(datos: Buffer): string[][] | undefined {
  const salida: string[][] = [];
  for (let n = 1; n <= MAX_DIAPOSITIVAS; n++) {
    const xml = archivoDeZip(datos, `ppt/slides/slide${n}.xml`)?.toString("utf8");
    if (!xml) break;
    const parrafos = (xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p [\s\S]*?<\/a:p>/g) ?? [])
      .map((p) => decodificar((p.match(/<a:t>([\s\S]*?)<\/a:t>/g) ?? []).map((t) => t.replace(/<\/?a:t>/g, "")).join("")).trim())
      .filter(Boolean);
    salida.push(parrafos);
  }
  return salida.length ? salida : undefined;
}

function textoCelda(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[]; formula?: string; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.result !== undefined) return textoCelda(o.result);
    if (typeof o.text === "string") return o.text;
    if (o.formula) return `=${o.formula}`;
    return "";
  }
  return String(v);
}

/** Hojas de un .xlsx con sus celdas como texto (los resultados de las fórmulas, no las fórmulas). */
export async function hojasDeXlsx(datos: Buffer) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  // exceljs espera su propio tipo de Buffer.
  await libro.xlsx.load(datos as unknown as Parameters<typeof libro.xlsx.load>[0]);
  return libro.worksheets.map((h) => {
    const filas: string[][] = [];
    h.eachRow({ includeEmpty: false }, (fila) => {
      if (filas.length >= MAX_FILAS) return;
      const valores = Array.isArray(fila.values) ? fila.values.slice(1, MAX_COLUMNAS + 1) : [];
      filas.push(Array.from(valores, textoCelda));
    });
    const ancho = Math.max(0, ...filas.map((f) => f.length));
    return { nombre: h.name, filas: filas.map((f) => [...f, ...Array(ancho - f.length).fill("")]) };
  });
}

/** Vista de un documento de Office; undefined si no se pudo leer o no es de Office. */
export async function vistaDeArchivo(datos: Buffer, clase: ClaseArchivo): Promise<VistaArchivo | undefined> {
  try {
    if (clase === "word") {
      const texto = textoDeDocx(datos);
      return texto === undefined ? undefined : { tipo: "texto", parrafos: texto.split("\n") };
    }
    if (clase === "ppt") {
      const diapositivas = diapositivasDePptx(datos);
      return diapositivas ? { tipo: "diapositivas", diapositivas } : undefined;
    }
    if (clase === "excel") return { tipo: "tabla", hojas: await hojasDeXlsx(datos) };
  } catch (e) {
    console.error("No se pudo leer el documento", e);
  }
  return undefined;
}

/** La vista como texto plano para la IA (acotado para no gastar de más). */
export function vistaComoTexto(vista: VistaArchivo, max = 30_000): string {
  let t: string;
  if (vista.tipo === "texto") t = vista.parrafos.join("\n");
  else if (vista.tipo === "diapositivas") t = vista.diapositivas.map((d, i) => `Diapositiva ${i + 1}:\n${d.join("\n")}`).join("\n\n");
  else t = vista.hojas.map((h) => `Hoja "${h.nombre}":\n${h.filas.map((f) => f.join(" | ")).join("\n")}`).join("\n\n");
  return t.length > max ? `${t.slice(0, max)}\n[…texto recortado]` : t;
}
