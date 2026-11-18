// PDF de retroalimentación del alumno: portada con el reporte y sus hojas con
// círculos numerados con paloma verde o tache rojo sobre cada reactivo y los
// comentarios en orden en el margen derecho. El logo va como marca de agua.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { calificacion, escalaDe, formatoCal, puntosObtenidos, puntosTotales } from "./estadisticas";
import { leerArchivo } from "./almacen";
import alumnoEs from "./i18n/diccionarios/alumno/es";
import { formato } from "./i18n/idiomas";
import { leerFuenteCjk } from "./pdf-fuente-cjk";
import { fuentesPdf, renglones } from "./pdf-fuentes";
import { pdfEstudio } from "./pdf-estudio";
import { recursosParaTemas } from "./recursos";
import { texAPlano } from "./tex-plano";
import type { Actividad, Alumno, Entrega, Grupo, RecomendacionesEstudio } from "./tipos";

const ROJO = rgb(0.86, 0.15, 0.15);
const VERDE = rgb(0.08, 0.5, 0.24);
const TINTA = rgb(0.06, 0.09, 0.16);
const GRIS = rgb(0.4, 0.45, 0.53);
const CARTA = { ancho: 612, alto: 792 };

/** Textos fijos del PDF (alumno.pdf del diccionario del idioma). */
export type TextosPdf = typeof alumnoEs.pdf;

/** Quita caracteres que la fuente del PDF no puede escribir (con la fuente CJK pasan todos). */
function seguro(font: PDFFont, texto: string) {
  let salida = "";
  // La fuente CJK no trae la viñeta "•": se usa el punto medio.
  if (!font.name.startsWith("Helvetica")) texto = texto.replace(/•/g, "·");
  for (const ch of texto.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/√/g, "raiz")) {
    try {
      font.widthOfTextAtSize(ch, 10);
      salida += ch;
    } catch {
      salida += "?";
    }
  }
  return salida;
}

function envolver(font: PDFFont, texto: string, tam: number, ancho: number) {
  return renglones(font, seguro(font, texto), tam, ancho);
}

function paloma(p: PDFPage, x: number, y: number, s = 1) {
  p.drawLine({ start: { x, y: y + 6 * s }, end: { x: x + 6 * s, y }, thickness: 2.5 * s, color: VERDE });
  p.drawLine({ start: { x: x + 6 * s, y }, end: { x: x + 18 * s, y: y + 16 * s }, thickness: 2.5 * s, color: VERDE });
}

/** Círculo relleno con el número de comentario en blanco. */
function circuloNumero(p: PDFPage, f: PDFFont, n: number, x: number, y: number, color: ReturnType<typeof rgb>) {
  p.drawCircle({ x, y, size: 7.5, color });
  const t = String(n);
  const tam = n > 9 ? 7.5 : 9;
  p.drawText(t, { x: x - f.widthOfTextAtSize(t, tam) / 2, y: y - tam * 0.35, size: tam, font: f, color: rgb(1, 1, 1) });
}

export function leerLogo() {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "logo.png"));
}

function tache(p: PDFPage, x: number, y: number, s = 1) {
  const d = 8 * s;
  p.drawLine({ start: { x: x - d, y: y - d }, end: { x: x + d, y: y + d }, thickness: 2.5 * s, color: ROJO });
  p.drawLine({ start: { x: x - d, y: y + d }, end: { x: x + d, y: y - d }, thickness: 2.5 * s, color: ROJO });
}

/** Dibuja las fotos del alumno con los círculos numerados, palomas, taches y comentarios. */
async function dibujarHojas(doc: PDFDocument, actividad: Actividad, entrega: Entrega, normal: PDFFont, negrita: PDFFont, calTexto: string, tx: TextosPdf) {
  // Cada reactivo lleva sobre la hoja un círculo relleno con su número de comentario y,
  // a un lado, la paloma (verde) o el tache (rojo). Los comentarios van numerados en
  // orden en el margen derecho, a la misma altura que su marca.
  let numero = 0;
  for (const [i, ruta] of (entrega.imagenes ?? []).entries()) {
    const img = await doc.embedJpg(leerArchivo(ruta));
    const MARGEN = 170;
    const escala = Math.min((CARTA.ancho - MARGEN - 12) / img.width, (CARTA.alto - 24) / img.height);
    const ancho = img.width * escala;
    const alto = img.height * escala;
    const x0 = 12;
    const y0 = (CARTA.alto - alto) / 2;
    const xMargen = x0 + ancho + 10;
    const anchoTexto = CARTA.ancho - xMargen - 12;
    const hoja = doc.addPage([CARTA.ancho, CARTA.alto]);
    hoja.drawImage(img, { x: x0, y: y0, width: ancho, height: alto });
    hoja.drawLine({ start: { x: xMargen - 4, y: 12 }, end: { x: xMargen - 4, y: CARTA.alto - 12 }, thickness: 0.6, color: GRIS, opacity: 0.4 });

    let limite = CARTA.alto - 70; // deja libre la marca de agua
    if (i === 0) {
      const xc = xMargen + 30;
      hoja.drawCircle({ x: xc, y: CARTA.alto - 42, size: 26, borderColor: ROJO, borderWidth: 2 });
      hoja.drawText(calTexto, { x: xc - negrita.widthOfTextAtSize(calTexto, 17) / 2, y: CARTA.alto - 48, size: 17, font: negrita, color: ROJO });
    }

    const marcas = entrega.resultados
      .filter((r) => (r.ubicacion?.pagina ?? 1) === i + 1)
      .sort((a, b) => (a.ubicacion?.y ?? 0.5) - (b.ubicacion?.y ?? 0.5) || (a.ubicacion?.x ?? 0.9) - (b.ubicacion?.x ?? 0.9));
    for (const res of marcas) {
      const r = actividad.reactivos.find((x) => x.numero === res.numero);
      if (!r) continue;
      numero += 1;
      const completo = res.puntosObtenidos >= r.puntos;
      const color = completo ? VERDE : ROJO;

      // Marca sobre la hoja del alumno, donde está su respuesta.
      const xc = x0 + Math.min(ancho - 34, Math.max(10, ancho * (res.ubicacion?.x ?? 0.9) + 10)); // justo después de la respuesta
      const yc = y0 + alto * (1 - Math.min(0.98, Math.max(0.02, res.ubicacion?.y ?? 0.5)));
      circuloNumero(hoja, negrita, numero, xc, yc, color);
      if (completo) paloma(hoja, xc + 11, yc - 4, 0.6);
      else tache(hoja, xc + 17, yc, 0.6);

      // Comentario numerado en el margen, a la misma altura (baja si se enciman).
      const yEntrada = Math.min(yc, limite - 8);
      const lineas = envolver(normal, res.comentario || (completo ? tx.correcto : ""), 8.5, anchoTexto - 4);
      hoja.drawLine({
        start: { x: xc + 27, y: yc },
        end: { x: xMargen + 2, y: yEntrada },
        thickness: 0.6,
        color,
        opacity: 0.45,
        dashArray: [2, 2],
      });
      circuloNumero(hoja, negrita, numero, xMargen + 10, yEntrada, color);
      if (completo) paloma(hoja, xMargen + 22, yEntrada - 4, 0.6);
      else tache(hoja, xMargen + 28, yEntrada, 0.6);
      hoja.drawText(seguro(negrita, formato(tx.reactivoPuntos, { n: r.numero, p: res.puntosObtenidos, t: r.puntos })), {
        x: xMargen + 40,
        y: yEntrada - 3.5,
        size: 9,
        font: negrita,
        color,
      });
      let yTexto = yEntrada - 17;
      for (const l of lineas) {
        hoja.drawText(l, { x: xMargen + 4, y: yTexto, size: 8.5, font: normal, color });
        yTexto -= 10.5;
      }
      limite = yTexto + 2;
    }
  }

}

/** Hojas corregidas solas (sin portada ni marca de agua): es lo que se guarda al archivar la entrega. */
export async function pdfHojasCorregidas(actividad: Actividad, entrega: Entrega, tx: TextosPdf = alumnoEs.pdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { normal, negrita } = await fuentesPdf(doc, [tx.reactivoPuntos, tx.correcto, ...entrega.resultados.map((r) => r.comentario)], leerFuenteCjk);
  await dibujarHojas(doc, actividad, entrega, normal, negrita, formatoCal(calificacion(actividad, entrega), escalaDe(actividad)), tx);
  return doc.save({ useObjectStreams: true });
}


function paginaEstudio(doc: PDFDocument, actividad: Actividad, estudio: RecomendacionesEstudio, normal: PDFFont, negrita: PDFFont, tx: TextosPdf) {
  const { videos, lecturas } = recursosParaTemas(actividad, estudio.temas);
  let p = doc.addPage([CARTA.ancho, CARTA.alto]);
  let y = CARTA.alto - 56;
  const linea = (t: string, x: number, tam = 10, f = normal, color = TINTA, ancho = 500) => {
    for (const l of envolver(f, texAPlano(t), tam, ancho)) {
      if (y < 60) {
        p = doc.addPage([CARTA.ancho, CARTA.alto]);
        y = CARTA.alto - 56;
      }
      p.drawText(l, { x, y, size: tam, font: f, color });
      y -= tam + 4;
    }
  };
  linea(tx.recomendaciones, 48, 13, negrita);
  y -= 4;
  if (estudio.temas.length) linea(formato(tx.temasRepasar, { temas: estudio.temas.join(", ") }), 48, 10, normal, GRIS);
  y -= 8;
  linea(tx.videos, 48, 11, negrita);
  if (videos.length) {
    for (const v of videos) {
      linea(`•  ${v.titulo} (${v.fuente})`, 56, 10);
      linea(v.url, 68, 9, normal, GRIS);
    }
  } else {
    for (const v of estudio.videos) {
      linea(`•  ${v.titulo}`, 56, 10);
      linea(formato(tx.buscarYoutube, { q: v.busqueda }), 68, 9, normal, GRIS);
    }
  }
  if (lecturas.length) {
    y -= 8;
    linea(tx.lecturas, 48, 11, negrita);
    for (const l of lecturas) {
      linea(`•  ${l.titulo} (${l.fuente})`, 56, 10);
      linea(l.url, 68, 9, normal, GRIS);
    }
  }
  y -= 8;
  linea(tx.ejercicios, 48, 11, negrita);
  for (const [i, e] of estudio.ejercicios.entries()) {
    linea(`${i + 1}. ${e.enunciado}`, 56, 10);
    linea(formato(tx.temaRespuesta, { tema: e.tema, r: e.respuesta }), 68, 9, negrita, VERDE);
    y -= 4;
  }
}

export async function pdfRetroalimentacion(
  datos: {
    actividad: Actividad;
    alumno: Alumno;
    entrega: Entrega;
    grupo: Grupo;
  },
  tx: TextosPdf = alumnoEs.pdf,
): Promise<Uint8Array> {
  const { actividad, alumno, entrega, grupo } = datos;
  const doc = await PDFDocument.create();
  doc.setTitle(`${tx.tituloDoc} · ${actividad.titulo} · ${alumno.nombre}`);
  const e = entrega.estudio;
  const { normal, negrita } = await fuentesPdf(
    doc,
    [
      ...Object.values(tx),
      actividad.titulo,
      alumno.nombre,
      grupo.materia,
      grupo.nombre,
      ...actividad.reactivos.map((r) => r.tema),
      ...entrega.positivos,
      ...entrega.mejoras,
      ...entrega.resultados.map((r) => r.comentario),
      ...(e ? [...e.temas, ...e.videos.flatMap((v) => [v.titulo, v.busqueda]), ...e.ejercicios.flatMap((x) => [x.tema, x.enunciado, x.respuesta])] : []),
    ],
    leerFuenteCjk,
  );
  const cal = calificacion(actividad, entrega);
  const escala = escalaDe(actividad);
  const calTexto = formatoCal(cal, escala);

  // ---- 1. Portada con identificación y resumen ----
  let p = doc.addPage([CARTA.ancho, CARTA.alto]);
  let y = CARTA.alto - 56;
  const texto = (t: string, x: number, tam = 10, f = normal, color = TINTA) => p.drawText(seguro(f, t), { x, y, size: tam, font: f, color });
  const nuevaLinea = (alto: number) => {
    y -= alto;
    if (y < 60) {
      p = doc.addPage([CARTA.ancho, CARTA.alto]);
      y = CARTA.alto - 56;
    }
  };

  texto(tx.encabezado.toLocaleUpperCase(), 48, 9, negrita, GRIS);
  nuevaLinea(22);
  texto(actividad.titulo, 48, 18, negrita);
  p.drawCircle({ x: CARTA.ancho - 130, y: y - 2, size: 34, borderColor: ROJO, borderWidth: 2 });
  p.drawText(calTexto, { x: CARTA.ancho - 130 - negrita.widthOfTextAtSize(calTexto, 22) / 2, y: y - 9, size: 22, font: negrita, color: ROJO });
  nuevaLinea(30);
  texto(tx.identificacion, 48, 11, negrita);
  nuevaLinea(18);
  for (const [et, val] of [
    [tx.nombre, alumno.nombre],
    [tx.matricula, alumno.matricula],
    [tx.grupo, `${grupo.materia} · ${grupo.nombre}`],
    [tx.actividad, actividad.titulo],
    [tx.temas, [...new Set(actividad.reactivos.map((r) => r.tema).filter(Boolean))].join(", ") || "-"],
    [tx.fechaAplicacion, actividad.fechaAplicacion],
    [tx.calificacion, `${calTexto} / ${escala}  ${formato(tx.puntosDe, { p: puntosObtenidos(entrega), t: puntosTotales(actividad) })}`],
  ]) {
    texto(et, 48, 10, normal, GRIS);
    for (const [i, l] of envolver(normal, val, 10, 380).entries()) {
      if (i > 0) nuevaLinea(13);
      texto(l, 170, 10);
    }
    nuevaLinea(15);
  }
  nuevaLinea(10);
  texto(tx.retroRubrica, 48, 11, negrita);
  nuevaLinea(18);
  for (const [titulo, lista, color] of [
    [tx.positivos, entrega.positivos, VERDE],
    [tx.mejoras, entrega.mejoras, ROJO],
  ] as const) {
    texto(titulo, 48, 10, negrita, color);
    nuevaLinea(14);
    for (const item of lista) {
      for (const [i, l] of envolver(normal, item, 10, 480).entries()) {
        texto(i === 0 ? `•  ${l}` : `   ${l}`, 56, 10);
        nuevaLinea(13);
      }
    }
    nuevaLinea(6);
  }
  nuevaLinea(4);
  texto(tx.reactivo, 48, 9, negrita, GRIS);
  texto(tx.tema, 100, 9, negrita, GRIS);
  texto(tx.comentario, 210, 9, negrita, GRIS);
  texto(tx.puntos, 520, 9, negrita, GRIS);
  nuevaLinea(14);
  for (const r of actividad.reactivos) {
    const res = entrega.resultados.find((x) => x.numero === r.numero);
    if (!res) continue;
    const lineas = envolver(normal, res.comentario, 9, 300);
    texto(String(r.numero), 48, 9);
    texto(envolver(normal, r.tema, 9, 100)[0] ?? "", 100, 9);
    texto(`${res.puntosObtenidos}/${r.puntos}`, 520, 9, negrita, res.puntosObtenidos === r.puntos ? VERDE : ROJO);
    for (const l of lineas) {
      texto(l, 210, 9);
      nuevaLinea(12);
    }
    nuevaLinea(4);
  }
  nuevaLinea(8);
  texto(tx.corregida, 48, 11, negrita);
  nuevaLinea(14);
  for (const [i, l] of envolver(normal, tx.leyenda, 9, 500).entries()) {
    if (i > 0) nuevaLinea(12);
    texto(l, 48, 9, normal, GRIS);
  }
  if (entrega.estudio) {
    nuevaLinea(18);
    for (const [i, l] of envolver(negrita, tx.recomendacionesFinal, 11, 500).entries()) {
      if (i > 0) nuevaLinea(14);
      texto(l, 48, 11, negrita);
    }
  }

  // ---- 2. Hojas del alumno con marcas (guardadas en el PDF archivado o dibujadas sobre las fotos) ----
  if (entrega.pdf) {
    const archivado = await PDFDocument.load(leerArchivo(entrega.pdf));
    for (const pag of await doc.copyPages(archivado, archivado.getPageIndices())) doc.addPage(pag);
  } else {
    await dibujarHojas(doc, actividad, entrega, normal, negrita, calTexto, tx);
  }

  // ---- 4. Recomendaciones de estudio (con fórmulas de KaTeX si hay Chromium; si no, en texto) ----
  if (entrega.estudio) {
    const conFormulas = await pdfEstudio(actividad, entrega, tx);
    if (conFormulas) {
      const estudio = await PDFDocument.load(conFormulas);
      for (const pag of await doc.copyPages(estudio, estudio.getPageIndices())) doc.addPage(pag);
    } else {
      paginaEstudio(doc, actividad, entrega.estudio, normal, negrita, tx);
    }
  }

  // ---- Marca de agua con el logo en la esquina superior derecha de cada página ----
  const logo = await doc.embedPng(leerLogo());
  const anchoLogo = 40;
  const altoLogo = (logo.height / logo.width) * anchoLogo;
  for (const pagina of doc.getPages()) {
    const { width, height } = pagina.getSize();
    pagina.drawImage(logo, { x: width - anchoLogo - 14, y: height - altoLogo - 12, width: anchoLogo, height: altoLogo, opacity: 0.35 });
  }
  return doc.save();
}

/** Parte del nombre del archivo a partir del título (sin acentos ni espacios). */
export function nombreArchivo(titulo: string) {
  return (
    titulo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "actividad"
  );
}
