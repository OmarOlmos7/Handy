// Espacio en disco y estado del servidor para el panel de administración.
import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CARPETA_DATOS } from "./almacen";

export interface UsoCarpeta {
  nombre: string;
  bytes: number;
  archivos: number;
}

function medir(carpeta: string): { bytes: number; archivos: number } {
  let bytes = 0;
  let archivos = 0;
  const pendientes = [carpeta];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(actual, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entradas) {
      const ruta = path.join(actual, e.name);
      if (e.isDirectory()) pendientes.push(ruta);
      else if (e.isFile()) {
        try {
          bytes += fs.statSync(ruta).size;
          archivos++;
        } catch {
          // El archivo desapareció mientras se medía.
        }
      }
    }
  }
  return { bytes, archivos };
}

export interface EstadoServidor {
  disco?: { total: number; libre: number; usado: number };
  datos: { bytes: number; archivos: number; baseDeDatos: number; carpetas: UsoCarpeta[] };
  memoria: { proceso: number; total: number; libre: number };
  encendidoDesde: string;
  node: string;
}

/** Mide la carpeta de datos (fotos, PDF y base) y el disco donde vive. */
export function estadoServidor(): EstadoServidor {
  let disco: EstadoServidor["disco"];
  try {
    const s = fs.statfsSync(CARPETA_DATOS);
    const total = s.blocks * s.bsize;
    const libre = s.bavail * s.bsize;
    disco = { total, libre, usado: total - libre };
  } catch {
    disco = undefined;
  }
  let carpetas: UsoCarpeta[] = [];
  try {
    carpetas = fs
      .readdirSync(CARPETA_DATOS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ nombre: e.name, ...medir(path.join(CARPETA_DATOS, e.name)) }))
      .sort((a, b) => b.bytes - a.bytes);
  } catch {
    carpetas = [];
  }
  const todo = medir(CARPETA_DATOS);
  let baseDeDatos = 0;
  try {
    baseDeDatos = fs.statSync(path.join(CARPETA_DATOS, "db.json")).size;
  } catch {
    baseDeDatos = 0;
  }
  return {
    disco,
    datos: { ...todo, baseDeDatos, carpetas },
    memoria: { proceso: process.memoryUsage().rss, total: os.totalmem(), libre: os.freemem() },
    encendidoDesde: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    node: process.version,
  };
}
