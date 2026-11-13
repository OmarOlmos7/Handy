// Descarga del cuaderno de calificaciones en Excel y PDF. Los números salen de
// `cuadernoCurso` (src/lib/cuaderno.ts); aquí solo se acomodan en la tabla del archivo.
import { ordenarFilas, ORDENES, type Cuaderno, type Orden } from "./cuaderno";
import { formatoCal, nivelDe, type Nivel } from "./estadisticas";
import type { Escala } from "./tipos";

export interface InfoCuaderno {
  materia: string;
  grupo: string;
  ciclo: string;
}

export interface CeldaExportable {
  /** Texto tal como se ve en la tabla. */
  texto: string;
  /** Valor numérico para Excel; null si no hay calificación. */
  valor: number | null;
  /** Color de semáforo; null si la celda va sin color. */
  nivel: Nivel | null;
  /** Aclaración para la celda (no entregó, cambiada a mano, por evaluar). */
  nota?: string;
}

export interface TablaExportable {
  escala: Escala;
  /** Tipos de actividad con cuántas columnas abarca cada uno. */
  grupos: { etiqueta: string; columnas: number }[];
  columnas: { titulo: string; escala: Escala }[];
  filas: {
    nombre: string;
    matricula: string;
    celdas: CeldaExportable[];
    promedio: CeldaExportable;
  }[];
  /** Promedio de cada actividad y, al final, el del grupo. */
  pie: CeldaExportable[];
  orden: string;
}

const vacia: CeldaExportable = { texto: "—", valor: null, nivel: null };

function promedio(valor: number | null, escala: Escala): CeldaExportable {
  if (valor === null) return vacia;
  return {
    texto: formatoCal(valor, escala),
    valor,
    nivel: nivelDe(valor, escala),
  };
}

/** Tabla del cuaderno en el orden elegido, lista para escribirse en Excel o PDF. */
export function tablaExportable(cuaderno: Cuaderno, orden: Orden): TablaExportable {
  const columnas = cuaderno.grupos.flatMap((g) => g.columnas);
  return {
    escala: cuaderno.escala,
    grupos: cuaderno.grupos.map((g) => ({
      etiqueta: g.etiqueta,
      columnas: g.columnas.length,
    })),
    columnas: columnas.map((c) => ({ titulo: c.titulo, escala: c.escala })),
    filas: ordenarFilas(cuaderno.filas, orden).map((f) => ({
      nombre: f.nombre,
      matricula: f.matricula,
      celdas: columnas.map((c): CeldaExportable => {
        const celda = f.celdas[c.id];
        switch (celda.estado) {
          case "calificada":
            return {
              texto: formatoCal(celda.valor!, c.escala),
              valor: celda.valor,
              nivel: nivelDe(celda.valor!, c.escala),
              nota: celda.manual
                ? `Cambiada a mano${celda.calculada !== undefined ? ` (con la rúbrica: ${formatoCal(celda.calculada, c.escala)})` : ""}`
                : undefined,
            };
          case "no_entregada":
            return {
              texto: "0 NE",
              valor: 0,
              nivel: "bajo",
              nota: "No entregó: cuenta como 0",
            };
          case "pendiente":
            return {
              texto: "Por evaluar",
              valor: null,
              nivel: null,
              nota: "Entregada, por evaluar",
            };
          case "sin_resultados":
            return vacia;
        }
      }),
      promedio: promedio(f.promedio, cuaderno.escala),
    })),
    pie: [...columnas.map((c) => promedio(c.promedio, c.escala)), promedio(cuaderno.promedioGrupo, cuaderno.escala)],
    orden: ORDENES.find((o) => o.clave === orden)?.texto ?? "",
  };
}

/** Nombre de archivo sin acentos ni espacios: "cuaderno-fisica-3-b". */
export function nombreArchivoCuaderno(info: InfoCuaderno) {
  const base = `cuaderno ${info.materia} ${info.grupo}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "cuaderno";
}

const fechaHoy = () =>
  new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const subtitulo = (info: InfoCuaderno) => [info.materia, info.grupo, info.ciclo].filter(Boolean).join(" · ");

// Colores del semáforo (los mismos tokens de globals.css).
const FONDO: Record<Nivel, string> = {
  alto: "dcfce7",
  medio: "fef3c7",
  bajo: "fee2e2",
};
const TINTA: Record<Nivel, string> = {
  alto: "15803d",
  medio: "b45309",
  bajo: "dc2626",
};

export async function excelCuaderno(tabla: TablaExportable, info: InfoCuaderno): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = "iEureka-Grader";
  const hoja = libro.addWorksheet("Cuaderno", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 6 }],
  });
  const n = tabla.columnas.length;
  const ultima = n + 3;

  hoja.addRow(["Cuaderno de calificaciones"]).font = { bold: true, size: 14 };
  hoja.addRow([subtitulo(info)]);
  hoja.addRow([
    `Descargado el ${fechaHoy()} · ${tabla.orden} · NE: no entregó (cuenta 0) · Promedio del alumno sobre ${tabla.escala}`,
  ]).font = {
    color: { argb: "FF64748B" },
    size: 9,
  };
  hoja.addRow([]);

  const fondoEncabezado = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFF1F5F9" },
  };
  const borde = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };

  // Fila 5: tipos de actividad; fila 6: título de cada actividad.
  const r5 = hoja.getRow(5);
  const r6 = hoja.getRow(6);
  r5.getCell(1).value = "Alumno";
  r5.getCell(2).value = "Matrícula";
  hoja.mergeCells(5, 1, 6, 1);
  hoja.mergeCells(5, 2, 6, 2);
  let col = 3;
  for (const g of tabla.grupos) {
    r5.getCell(col).value = g.etiqueta;
    if (g.columnas > 1) hoja.mergeCells(5, col, 5, col + g.columnas - 1);
    col += g.columnas;
  }
  tabla.columnas.forEach((c, i) => (r6.getCell(i + 3).value = `${c.titulo} (/${c.escala})`));
  r5.getCell(ultima).value = `Promedio (sobre ${tabla.escala})`;
  hoja.mergeCells(5, ultima, 6, ultima);
  for (const r of [r5, r6]) {
    for (let c = 1; c <= ultima; c++) {
      const celda = r.getCell(c);
      celda.font = { bold: true };
      celda.fill = fondoEncabezado;
      celda.border = bordes;
      celda.alignment = {
        vertical: "middle",
        horizontal: c <= 2 ? "left" : "center",
        wrapText: true,
      };
    }
  }
  r6.height = 32;

  const escribir = (celda: import("exceljs").Cell, c: CeldaExportable, escala: Escala, fuerte = false) => {
    celda.value = c.valor ?? (c.texto === "—" ? null : c.texto);
    celda.numFmt = escala === 100 ? "0" : "0.0";
    celda.alignment = { horizontal: "center" };
    celda.border = bordes;
    if (c.nivel) {
      celda.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${FONDO[c.nivel]}` },
      };
      celda.font = { color: { argb: `FF${TINTA[c.nivel]}` }, bold: fuerte };
    } else {
      celda.font = { color: { argb: "FF94A3B8" }, bold: fuerte };
    }
    if (c.nota) celda.note = c.nota;
  };

  for (const f of tabla.filas) {
    const r = hoja.addRow([f.nombre, f.matricula]);
    r.getCell(1).border = bordes;
    r.getCell(2).border = bordes;
    f.celdas.forEach((c, i) => escribir(r.getCell(i + 3), c, tabla.columnas[i].escala));
    escribir(r.getCell(ultima), f.promedio, tabla.escala, true);
  }
  const pie = hoja.addRow(["Promedio de la actividad"]);
  hoja.mergeCells(pie.number, 1, pie.number, 2);
  pie.getCell(1).font = { bold: true };
  pie.getCell(1).fill = fondoEncabezado;
  pie.getCell(1).border = bordes;
  tabla.pie.forEach((c, i) => escribir(pie.getCell(i + 3), c, i < n ? tabla.columnas[i].escala : tabla.escala, true));

  hoja.getColumn(1).width = 32;
  hoja.getColumn(2).width = 13;
  for (let c = 3; c <= ultima; c++) hoja.getColumn(c).width = 16;

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const hexRgb = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

/** Las fuentes estándar del PDF solo traen caracteres latinos (y "…"); el resto se cambia por "?". */
const latino = (t: string) => t.replace(/[^\x20-\x7e\xa0-\xff…]/g, "?");

export async function pdfCuaderno(tabla: TablaExportable, info: InfoCuaderno): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(latino(`Cuaderno de calificaciones · ${subtitulo(info)}`));
  doc.setCreator("iEureka-Grader");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = (hex: string) => rgb(...hexRgb(hex));

  // Carta horizontal.
  const ANCHO = 792;
  const ALTO = 612;
  const M = 32;
  const util = ANCHO - 2 * M;
  const n = tabla.columnas.length;

  // Anchos base; si no caben, todo se reduce en proporción.
  const base = {
    nombre: 170,
    matricula: 62,
    actividad: Math.max(48, Math.min(80, (util - 170 - 62 - 58) / Math.max(n, 1))),
    promedio: 58,
  };
  const necesario = base.nombre + base.matricula + base.actividad * n + base.promedio;
  const k = Math.min(1, util / necesario);
  const w = {
    nombre: base.nombre * k,
    matricula: base.matricula * k,
    actividad: base.actividad * k,
    promedio: base.promedio * k,
  };
  const fs = Math.max(6, 9 * k);
  const fila = Math.max(13, 18 * k);

  const xs: number[] = [M, M + w.nombre];
  for (let i = 0; i <= n; i++) xs.push(M + w.nombre + w.matricula + w.actividad * i);
  const finTabla = xs[xs.length - 1] + w.promedio;

  const recortar = (t: string, f: typeof normal, size: number, max: number) => {
    let s = latino(t);
    if (f.widthOfTextAtSize(s, size) <= max) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + "…", size) > max) s = s.slice(0, -1);
    return s.trimEnd() + "…";
  };
  const lineas = (t: string, f: typeof normal, size: number, max: number, maxLineas: number) => {
    const palabras = latino(t).split(/\s+/);
    const out: string[] = [];
    let actual = "";
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (f.widthOfTextAtSize(prueba, size) <= max || !actual) actual = prueba;
      else {
        out.push(actual);
        actual = p;
      }
    }
    if (actual) out.push(actual);
    if (out.length > maxLineas) {
      out.length = maxLineas;
      out[maxLineas - 1] = recortar(out[maxLineas - 1] + "…", f, size, max);
    }
    return out.map((l) => recortar(l, f, size, max));
  };

  let pagina = doc.addPage([ANCHO, ALTO]);
  let y = ALTO - M;
  const gris = color("64748b");
  const linea = color("e2e8f0");

  const centrado = (t: string, f: typeof normal, size: number, x0: number, ancho: number, yy: number, c = color("0f172a")) => {
    const s = recortar(t, f, size, ancho - 4);
    pagina.drawText(s, {
      x: x0 + (ancho - f.widthOfTextAtSize(s, size)) / 2,
      y: yy,
      size,
      font: f,
      color: c,
    });
  };

  const encabezadoPagina = (primera: boolean) => {
    if (primera) {
      pagina.drawText("Cuaderno de calificaciones", {
        x: M,
        y: y - 14,
        size: 16,
        font: negrita,
        color: color("0f172a"),
      });
      y -= 30;
      pagina.drawText(latino(subtitulo(info)), {
        x: M,
        y,
        size: 10,
        font: normal,
        color: color("334155"),
      });
      y -= 14;
      pagina.drawText(
        latino(
          `Descargado el ${fechaHoy()} · ${tabla.orden} · NE: no entregó (cuenta 0) · Promedio del alumno sobre ${tabla.escala}`,
        ),
        { x: M, y, size: 8, font: normal, color: gris },
      );
      y -= 16;
    }
    // Encabezado de la tabla: tipos arriba y actividades abajo.
    const alto1 = fila;
    const alto2 = fs * 3 + 8;
    const top = y;
    pagina.drawRectangle({
      x: M,
      y: top - alto1 - alto2,
      width: finTabla - M,
      height: alto1 + alto2,
      color: color("f1f5f9"),
    });
    pagina.drawText("ALUMNO", {
      x: M + 5,
      y: top - alto1 - alto2 / 2,
      size: fs * 0.9,
      font: negrita,
      color: gris,
    });
    pagina.drawText("MATRÍCULA", {
      x: xs[1] + 4,
      y: top - alto1 - alto2 / 2,
      size: fs * 0.9,
      font: negrita,
      color: gris,
    });
    let i = 0;
    for (const g of tabla.grupos) {
      const x0 = xs[2 + i];
      const ancho = w.actividad * g.columnas;
      centrado(g.etiqueta.toUpperCase(), negrita, fs * 0.9, x0, ancho, top - alto1 + (alto1 - fs) / 2, color("334155"));
      pagina.drawLine({
        start: { x: x0, y: top },
        end: { x: x0, y: top - alto1 - alto2 },
        thickness: 0.6,
        color: color("cbd5e1"),
      });
      i += g.columnas;
    }
    tabla.columnas.forEach((c, j) => {
      const ls = lineas(c.titulo, normal, fs * 0.85, w.actividad - 6, 2);
      ls.push(`/ ${c.escala}`);
      ls.forEach((l, li) =>
        centrado(
          l,
          normal,
          fs * 0.85,
          xs[2 + j],
          w.actividad,
          top - alto1 - 4 - fs * 0.95 * (li + 1),
          li === ls.length - 1 ? gris : color("334155"),
        ),
      );
    });
    const xp = xs[xs.length - 1];
    pagina.drawLine({
      start: { x: xp, y: top },
      end: { x: xp, y: top - alto1 - alto2 },
      thickness: 0.6,
      color: color("cbd5e1"),
    });
    centrado("PROMEDIO", negrita, fs * 0.9, xp, w.promedio, top - alto1 - alto2 / 2 + 2, color("334155"));
    centrado(`sobre ${tabla.escala}`, normal, fs * 0.75, xp, w.promedio, top - alto1 - alto2 / 2 - fs, gris);
    pagina.drawLine({
      start: { x: xs[2], y: top - alto1 },
      end: { x: xp, y: top - alto1 },
      thickness: 0.6,
      color: linea,
    });
    y = top - alto1 - alto2;
  };

  const celda = (c: CeldaExportable, x0: number, ancho: number, yy: number, fuerte: boolean) => {
    const f = fuerte ? negrita : normal;
    if (c.nivel) {
      const anchoChip = Math.min(ancho - 8, Math.max(28 * k, f.widthOfTextAtSize(latino(c.texto), fs) + 10));
      pagina.drawRectangle({
        x: x0 + (ancho - anchoChip) / 2,
        y: yy - fila + 2.5,
        width: anchoChip,
        height: fila - 5,
        color: color(FONDO[c.nivel]),
      });
      centrado(c.texto, f, fs, x0, ancho, yy - fila / 2 - fs * 0.35, color(TINTA[c.nivel]));
    } else {
      centrado(c.texto, f, fs * (c.texto === "—" ? 1 : 0.85), x0, ancho, yy - fila / 2 - fs * 0.35, color("94a3b8"));
    }
  };

  encabezadoPagina(true);
  const pieAlto = fila + 4;
  for (const f of tabla.filas) {
    if (y - fila < M + pieAlto) {
      pagina = doc.addPage([ANCHO, ALTO]);
      y = ALTO - M;
      encabezadoPagina(false);
    }
    pagina.drawText(recortar(f.nombre, normal, fs, w.nombre - 8), {
      x: M + 5,
      y: y - fila / 2 - fs * 0.35,
      size: fs,
      font: normal,
      color: color("0f172a"),
    });
    pagina.drawText(recortar(f.matricula, normal, fs * 0.9, w.matricula - 6), {
      x: xs[1] + 4,
      y: y - fila / 2 - fs * 0.35,
      size: fs * 0.9,
      font: normal,
      color: color("475569"),
    });
    f.celdas.forEach((c, j) => celda(c, xs[2 + j], w.actividad, y, false));
    celda(f.promedio, xs[xs.length - 1], w.promedio, y, true);
    y -= fila;
    pagina.drawLine({
      start: { x: M, y },
      end: { x: finTabla, y },
      thickness: 0.4,
      color: linea,
    });
  }

  // Pie: promedio de cada actividad y del grupo.
  pagina.drawRectangle({
    x: M,
    y: y - fila - 4,
    width: finTabla - M,
    height: fila + 4,
    color: color("f8fafc"),
  });
  pagina.drawText("PROMEDIO DE LA ACTIVIDAD", {
    x: M + 5,
    y: y - (fila + 4) / 2 - fs * 0.35,
    size: fs * 0.85,
    font: negrita,
    color: gris,
  });
  tabla.pie.forEach((c, j) => celda(c, j < n ? xs[2 + j] : xs[xs.length - 1], j < n ? w.actividad : w.promedio, y - 2, true));

  // Número de página.
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    const t = `iEureka-Grader · Página ${i + 1} de ${paginas.length}`;
    p.drawText(latino(t), {
      x: ANCHO - M - normal.widthOfTextAtSize(latino(t), 7),
      y: M / 2,
      size: 7,
      font: normal,
      color: gris,
    });
  });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
