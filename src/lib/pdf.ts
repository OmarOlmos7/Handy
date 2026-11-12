// PDF de retroalimentación del alumno: portada con el reporte y sus hojas con
// círculos numerados con paloma verde o tache rojo sobre cada reactivo y los
// comentarios en orden en el margen derecho. El logo va como marca de agua.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import { calificacion, puntosObtenidos, puntosTotales } from "./estadisticas";
import { leerArchivo } from "./almacen";
import type { Actividad, Alumno, Entrega, Grupo } from "./tipos";

const ROJO = rgb(0.86, 0.15, 0.15);
const VERDE = rgb(0.08, 0.5, 0.24);
const TINTA = rgb(0.06, 0.09, 0.16);
const GRIS = rgb(0.4, 0.45, 0.53);
const CARTA = { ancho: 612, alto: 792 };

/** Quita caracteres que la fuente estándar del PDF no puede escribir. */
function seguro(font: PDFFont, texto: string) {
  let salida = "";
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
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of seguro(font, texto).split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, tam) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
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

export async function pdfRetroalimentacion(datos: {
  actividad: Actividad;
  alumno: Alumno;
  entrega: Entrega;
  grupo: Grupo;
}): Promise<Uint8Array> {
  const { actividad, alumno, entrega, grupo } = datos;
  const doc = await PDFDocument.create();
  doc.setTitle(`Retroalimentación · ${actividad.titulo} · ${alumno.nombre}`);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const cal = calificacion(actividad, entrega);

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

  texto("REPORTE DE RETROALIMENTACIÓN", 48, 9, negrita, GRIS);
  nuevaLinea(22);
  texto(actividad.titulo, 48, 18, negrita);
  p.drawCircle({ x: CARTA.ancho - 130, y: y - 2, size: 34, borderColor: ROJO, borderWidth: 2 });
  p.drawText(cal.toFixed(1), { x: CARTA.ancho - 130 - negrita.widthOfTextAtSize(cal.toFixed(1), 22) / 2, y: y - 9, size: 22, font: negrita, color: ROJO });
  nuevaLinea(30);
  texto("1. Datos del alumno", 48, 11, negrita);
  nuevaLinea(18);
  for (const [et, val] of [
    ["Nombre", alumno.nombre],
    ["Matrícula", alumno.matricula],
    ["Grupo", `${grupo.materia} · ${grupo.nombre}`],
    ["Fecha de aplicación", actividad.fechaAplicacion],
    ["Calificación", `${cal.toFixed(1)} / 10  (${puntosObtenidos(entrega)} de ${puntosTotales(actividad)} puntos)`],
  ]) {
    texto(et, 48, 10, normal, GRIS);
    texto(val, 170, 10);
    nuevaLinea(15);
  }
  nuevaLinea(10);
  texto("2. Resumen de la retroalimentación", 48, 11, negrita);
  nuevaLinea(18);
  for (const [titulo, lista, color] of [
    ["Puntos positivos", entrega.positivos, VERDE],
    ["Puntos de mejora", entrega.mejoras, ROJO],
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
  texto("Reactivo", 48, 9, negrita, GRIS);
  texto("Tema", 100, 9, negrita, GRIS);
  texto("Comentario", 210, 9, negrita, GRIS);
  texto("Puntos", 520, 9, negrita, GRIS);
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
  texto("3. Tu actividad con correcciones (páginas siguientes)", 48, 11, negrita);

  // ---- 2. Hojas del alumno con marcas ----
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
      hoja.drawText(cal.toFixed(1), { x: xc - negrita.widthOfTextAtSize(cal.toFixed(1), 17) / 2, y: CARTA.alto - 48, size: 17, font: negrita, color: ROJO });
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
      const lineas = envolver(normal, res.comentario || (completo ? "Correcto." : ""), 8.5, anchoTexto - 4);
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
      hoja.drawText(seguro(negrita, `Reactivo ${r.numero} · ${res.puntosObtenidos}/${r.puntos}`), {
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
