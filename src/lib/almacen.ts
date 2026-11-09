// Almacenamiento de la demo: un archivo JSON y una carpeta de archivos en disco.
// Es suficiente para validar con un grupo real. En producción se reemplaza por
// PostgreSQL y almacenamiento de objetos sin cambiar las páginas.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { semilla } from "./datos-ejemplo";
import type { Actividad, BaseDeDatos, Entrega, EstadoActividad, Grupo } from "./tipos";

export const CARPETA_DATOS = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data"));
const ARCHIVO_DB = path.join(CARPETA_DATOS, "db.json");

function leerDisco(): BaseDeDatos {
  if (!fs.existsSync(ARCHIVO_DB)) {
    fs.mkdirSync(CARPETA_DATOS, { recursive: true });
    const inicial = semilla();
    escribirDisco(inicial);
    return inicial;
  }
  return JSON.parse(fs.readFileSync(ARCHIVO_DB, "utf8")) as BaseDeDatos;
}

function escribirDisco(db: BaseDeDatos) {
  const temporal = `${ARCHIVO_DB}.${process.pid}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(db, null, 2));
  fs.renameSync(temporal, ARCHIVO_DB);
}

/** Lee la base de datos en una petición (nunca durante el prerender). */
export async function leer(): Promise<BaseDeDatos> {
  await connection();
  return leerDisco();
}

/** Lee, modifica y guarda de forma síncrona, así dos peticiones no se pisan. */
export function modificar<T>(cambio: (db: BaseDeDatos) => T): T {
  const db = leerDisco();
  const resultado = cambio(db);
  escribirDisco(db);
  return resultado;
}

export function rutaAbsoluta(relativa: string) {
  const absoluta = path.resolve(CARPETA_DATOS, relativa);
  if (!absoluta.startsWith(CARPETA_DATOS + path.sep)) throw new Error("Ruta fuera de la carpeta de datos");
  return absoluta;
}

export function guardarArchivo(relativa: string, datos: Buffer | Uint8Array) {
  const absoluta = rutaAbsoluta(relativa);
  fs.mkdirSync(path.dirname(absoluta), { recursive: true });
  fs.writeFileSync(absoluta, datos);
  return relativa;
}

export function leerArchivo(relativa: string) {
  return fs.readFileSync(/*turbopackIgnore: true*/ rutaAbsoluta(relativa));
}

export function borrarCarpeta(relativa: string) {
  fs.rmSync(rutaAbsoluta(relativa), { recursive: true, force: true });
}

// Consultas sobre una copia ya leída de la base de datos.
export function grupoDe(db: BaseDeDatos, id: string): Grupo | undefined {
  return db.grupos.find((g) => g.id === id);
}
export function actividadDe(db: BaseDeDatos, id: string): Actividad | undefined {
  return db.actividades.find((a) => a.id === id);
}
export function entregasDe(db: BaseDeDatos, actividadId: string): Entrega[] {
  const act = actividadDe(db, actividadId);
  const grupo = act && grupoDe(db, act.grupoId);
  if (!act || !grupo) return [];
  // Una fila por alumno del grupo, aunque no haya entregado.
  return grupo.alumnos.map(
    (al) =>
      db.entregas.find((e) => e.actividadId === actividadId && e.matricula === al.matricula) ?? {
        actividadId,
        matricula: al.matricula,
        estado: "sin_entregar",
        paginasRecibidas: 0,
        resultados: [],
        positivos: [],
        mejoras: [],
      },
  );
}
export function saldo(db: BaseDeDatos) {
  return db.movimientos.reduce((s, m) => s + m.cantidad, 0);
}

export function estadoActividad(db: BaseDeDatos, act: Actividad): EstadoActividad {
  const es = db.entregas.filter((e) => e.actividadId === act.id && e.estado !== "sin_entregar");
  if (es.length > 0 && es.every((e) => e.estado === "aprobada")) return "publicada";
  if (es.some((e) => e.estado === "evaluada")) return "en_revision";
  if (es.length > 0 && !act.rubricaConfirmada) return "rubrica_pendiente";
  if (es.some((e) => e.estado === "entregada")) return "evaluando";
  return "esperando_entregas";
}

/** Identificador legible para URLs a partir de un texto. */
export function slug(texto: string) {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "actividad"}-${Date.now().toString(36).slice(-4)}`;
}
