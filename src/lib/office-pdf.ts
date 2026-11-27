// Vista con el formato original de los documentos de Office (Word, Excel, PowerPoint): el
// servidor los convierte a PDF con LibreOffice sin interfaz, dentro del mismo contenedor, sin
// enviarlos a servicios externos. El PDF se guarda junto al original (`<archivo>.vista.pdf`) para
// convertir una sola vez; si LibreOffice no está o falla, el visor usa la vista de solo texto.
import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rutaAbsoluta } from "./almacen";
import type { ClaseArchivo } from "./tipos";

const SOFFICE = process.env.SOFFICE_RUTA || "soffice";
/** Conversiones a la vez (cada una ocupa un núcleo y ~200 MB). */
const MAXIMO = Math.max(1, Number(process.env.OFFICE_CONVERSIONES) || 1);
/** Una conversión que tarda más se cancela (archivos enormes o dañados). */
const LIMITE_MS = Math.max(5_000, Number(process.env.OFFICE_LIMITE_MS) || 90_000);
/** Quien espera turno se rinde después de esto y recibe la vista de solo texto. */
const ESPERA_MAXIMA_MS = 3 * 60_000;

const desactivado = () => process.env.OFFICE_PDF === "0";

/** Filtro de exportación según el tipo. En Excel, cada hoja en una sola página (como en pantalla). */
export function filtroPdf(clase: ClaseArchivo): string {
  if (clase === "excel") return 'pdf:calc_pdf_Export:{"SinglePageSheets":{"type":"boolean","value":"true"}}';
  if (clase === "ppt") return "pdf:impress_pdf_Export";
  return "pdf:writer_pdf_Export";
}

const EXTENSION: Partial<Record<ClaseArchivo, string>> = { word: "docx", excel: "xlsx", ppt: "pptx" };

/** Ruta del PDF de la vista junto al archivo original. */
export const rutaVistaPdf = (relativa: string) => `${relativa}.vista.pdf`;

// Turnos: cada turno usa su propio perfil de LibreOffice, así dos conversiones no se estorban
// y no se crea un perfil nuevo (lento) cada vez.
const libres = Array.from({ length: MAXIMO }, (_, i) => i);
const enEspera: ((turno: number) => void)[] = [];
let sinLibreOffice = false;

function pedirTurno(): Promise<number> {
  const t = libres.pop();
  if (t !== undefined) return Promise.resolve(t);
  return new Promise((resolver, rechazar) => {
    const avisar = (turno: number) => {
      clearTimeout(reloj);
      resolver(turno);
    };
    const reloj = setTimeout(() => {
      enEspera.splice(enEspera.indexOf(avisar), 1);
      rechazar(new Error("Demasiadas conversiones en espera"));
    }, ESPERA_MAXIMA_MS);
    enEspera.push(avisar);
  });
}

function soltarTurno(turno: number) {
  const siguiente = enEspera.shift();
  if (siguiente) siguiente(turno);
  else libres.push(turno);
}

function ejecutar(args: string[]): Promise<void> {
  return new Promise((resolver, rechazar) => {
    // En su propio grupo de procesos para poder terminar también a soffice.bin si se pasa del tiempo.
    const hijo = spawn(/*turbopackIgnore: true*/ SOFFICE, args, { detached: true, stdio: ["ignore", "ignore", "pipe"] });
    let errores = "";
    hijo.stderr?.on("data", (d: Buffer) => (errores = (errores + d.toString()).slice(-2000)));
    const reloj = setTimeout(() => {
      try {
        process.kill(-hijo.pid!, "SIGKILL");
      } catch {}
      rechazar(new Error("LibreOffice tardó demasiado"));
    }, LIMITE_MS);
    hijo.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(reloj);
      if (e.code === "ENOENT") sinLibreOffice = true;
      rechazar(e);
    });
    hijo.on("exit", (codigo) => {
      clearTimeout(reloj);
      if (codigo === 0) resolver();
      else rechazar(new Error(`LibreOffice terminó con ${codigo}: ${errores.trim()}`));
    });
  });
}

/** Convierte un documento de Office a PDF. Lanza un error si no se pudo. */
export async function convertirAPdf(datos: Buffer, clase: ClaseArchivo): Promise<Buffer> {
  const ext = EXTENSION[clase];
  if (!ext) throw new Error("No es un documento de Office");
  if (desactivado() || sinLibreOffice) throw new Error("Conversión a PDF no disponible");
  const turno = await pedirTurno();
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "office-pdf-"));
  try {
    const entrada = path.join(carpeta, `documento.${ext}`);
    fs.writeFileSync(entrada, datos);
    const perfil = path.join(os.tmpdir(), `office-perfil-${process.pid}-${turno}`);
    await ejecutar([
      `-env:UserInstallation=file://${perfil}`,
      "--headless",
      "--invisible",
      "--nologo",
      "--nodefault",
      "--nolockcheck",
      "--norestore",
      "--convert-to",
      filtroPdf(clase),
      "--outdir",
      carpeta,
      entrada,
    ]);
    const salida = path.join(carpeta, "documento.pdf");
    if (!fs.existsSync(salida)) throw new Error("LibreOffice no generó el PDF");
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
    soltarTurno(turno);
  }
}

// Conversiones en curso por archivo: si dos personas abren el mismo anexo a la vez, se convierte una vez.
const enCurso = new Map<string, Promise<Buffer>>();

/**
 * PDF de la vista de un archivo guardado (ruta relativa a la carpeta de datos). Usa el que ya
 * está junto al original si es más reciente que él; si no, convierte y lo guarda.
 */
export function vistaPdfGuardada(relativa: string, clase: ClaseArchivo): Promise<Buffer> {
  const original = rutaAbsoluta(relativa);
  const cache = rutaAbsoluta(rutaVistaPdf(relativa));
  try {
    if (fs.statSync(cache).mtimeMs >= fs.statSync(original).mtimeMs) return Promise.resolve(fs.readFileSync(cache));
  } catch {}
  const previa = enCurso.get(relativa);
  if (previa) return previa;
  const tarea = (async () => {
    const pdf = await convertirAPdf(fs.readFileSync(original), clase);
    fs.writeFileSync(cache, pdf);
    return pdf;
  })().finally(() => enCurso.delete(relativa));
  enCurso.set(relativa, tarea);
  return tarea;
}

/** Al guardar un anexo de Office, deja lista su vista en segundo plano (sin hacer esperar a nadie). */
export function prepararVistaPdf(relativa: string, clase: ClaseArchivo) {
  // En las pruebas no se lanza LibreOffice por cada anexo guardado.
  if (!EXTENSION[clase] || desactivado() || process.env.VITEST) return;
  vistaPdfGuardada(relativa, clase).catch((e) => console.error("No se pudo preparar la vista en PDF", relativa, e));
}
