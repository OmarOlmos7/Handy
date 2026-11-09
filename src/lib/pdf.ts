// PDF de retroalimentación del alumno: portada con el reporte y sus hojas con
// palomas verdes, taches rojos y comentarios en rojo sobre cada reactivo.
import "server-only";
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
  p.drawCircle({ x: CARTA.ancho - 90, y: y - 2, size: 34, borderColor: ROJO, borderWidth: 2 });
  p.drawText(cal.toFixed(1), { x: CARTA.ancho - 90 - negrita.widthOfTextAtSize(cal.toFixed(1), 22) / 2, y: y - 9, size: 22, font: negrita, color: ROJO });
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
  for (const [i, ruta] of (entrega.imagenes ?? []).entries()) {
    const img = await doc.embedJpg(leerArchivo(ruta));
    // La foto ocupa la parte izquierda de una hoja carta y las marcas van en un margen
    // a la derecha, para no tapar lo que escribió el alumno ni el texto impreso.
    const MARGEN = 160;
    const escala = Math.min((CARTA.ancho - MARGEN - 12) / img.width, (CARTA.alto - 24) / img.height);
    const ancho = img.width * escala;
    const alto = img.height * escala;
    const x0 = 12;
    const y0 = (CARTA.alto - alto) / 2;
    const xMargen = x0 + ancho + 10;
    const anchoTexto = CARTA.ancho - xMargen - 12;
    const hoja = doc.addPage([CARTA.ancho, CARTA.alto]);
    hoja.drawImage(img, { x: x0, y: y0, width: ancho, height: alto });
    hoja.drawLine({ start: { x: xMargen - 4, y: 12 }, end: { x: xMargen - 4, y: CARTA.alto - 12 }, thickness: 0.6, color: ROJO, opacity: 0.4 });

    let limite = CARTA.alto - 12;
    if (i === 0) {
      const xc = xMargen + anchoTexto / 2;
      hoja.drawCircle({ x: xc, y: CARTA.alto - 46, size: 28, borderColor: ROJO, borderWidth: 2 });
      hoja.drawText(cal.toFixed(1), { x: xc - negrita.widthOfTextAtSize(cal.toFixed(1), 18) / 2, y: CARTA.alto - 52, size: 18, font: negrita, color: ROJO });
      limite = CARTA.alto - 84;
    }

    const marcas = entrega.resultados
      .filter((r) => (r.ubicacion?.pagina ?? 1) === i + 1)
      .sort((a, b) => (a.ubicacion?.y ?? 0.5) - (b.ubicacion?.y ?? 0.5));
    for (const res of marcas) {
      const r = actividad.reactivos.find((x) => x.numero === res.numero);
      if (!r) continue;
      const completo = res.puntosObtenidos >= r.puntos;
      const color = completo ? VERDE : ROJO;
      const yHoja = y0 + alto * (1 - (res.ubicacion?.y ?? 0.5));
      // Si dos reactivos quedan muy juntos, el segundo baja para no encimarse.
      const yMarca = Math.min(yHoja, limite - 14);
      hoja.drawLine({ start: { x: xMargen - 14, y: yHoja }, end: { x: xMargen - 4, y: yHoja }, thickness: 1.5, color });
      if (completo) paloma(hoja, xMargen + 4, yMarca - 6);
      else tache(hoja, xMargen + 12, yMarca);
      hoja.drawText(`${res.numero}.  ${res.puntosObtenidos}/${r.puntos}`, { x: xMargen + 30, y: yMarca - 4, size: 10, font: negrita, color });
      let yTexto = yMarca - 18;
      if (!completo && res.comentario) {
        for (const l of envolver(normal, res.comentario, 8.5, anchoTexto)) {
          hoja.drawText(l, { x: xMargen, y: yTexto, size: 8.5, font: normal, color: ROJO });
          yTexto -= 10.5;
        }
      }
      limite = yTexto + 2;
    }
  }
  return doc.save();
}
