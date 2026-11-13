// Hoja imprimible de una actividad cargada escaneada: a cada página del profesor se le
// agrega un encabezado con logo, título, nombre, matrícula, calificación y el QR de entrega.
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { leerArchivo } from "./almacen";
import { leerLogo } from "./pdf";
import { escalaDe } from "./estadisticas";
import type { Actividad } from "./tipos";

const CARTA = { ancho: 612, alto: 792 };
const MARGEN = 28;
const ALTO_ENCABEZADO = 134;
const AZUL = rgb(0.145, 0.329, 0.91);
const GRIS = rgb(0.4, 0.45, 0.52);

export async function pdfHojaEscaneada(actividad: Actividad, datos: { curso: string; enlace: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(actividad.titulo);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(leerLogo());
  const qr = await doc.embedPng(await QRCode.toBuffer(datos.enlace, { margin: 1, width: 300, errorCorrectionLevel: "M" }));

  // Páginas originales del profesor, en orden.
  const originales: { dibujar: (p: import("pdf-lib").PDFPage, x: number, y: number, w: number, h: number) => void; ancho: number; alto: number }[] = [];
  for (const ruta of actividad.archivos ?? []) {
    const bytes = leerArchivo(ruta);
    if (ruta.endsWith(".pdf")) {
      const fuente = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const incrustadas = await doc.embedPdf(fuente, fuente.getPageIndices());
      for (const e of incrustadas) originales.push({ ancho: e.width, alto: e.height, dibujar: (p, x, y, width, height) => p.drawPage(e, { x, y, width, height }) });
    } else {
      const img = await doc.embedJpg(bytes);
      originales.push({ ancho: img.width, alto: img.height, dibujar: (p, x, y, width, height) => p.drawImage(img, { x, y, width, height }) });
    }
  }

  originales.forEach((o, i) => {
    const p = doc.addPage([CARTA.ancho, CARTA.alto]);
    const arriba = CARTA.alto - MARGEN;

    // Encabezado: franja azul con logo y título.
    p.drawRectangle({ x: MARGEN, y: arriba - 40, width: CARTA.ancho - 2 * MARGEN, height: 40, color: AZUL });
    const altoLogo = 30;
    const anchoLogo = (logo.width / logo.height) * altoLogo;
    p.drawRectangle({ x: MARGEN + 6, y: arriba - 36, width: anchoLogo + 6, height: 32, color: rgb(1, 1, 1) });
    p.drawImage(logo, { x: MARGEN + 9, y: arriba - 35, width: anchoLogo, height: altoLogo });
    let titulo = actividad.titulo;
    while (negrita.widthOfTextAtSize(titulo, 17) > 330 && titulo.length > 4) titulo = `${titulo.slice(0, -2)}…`;
    p.drawText(titulo, { x: MARGEN + anchoLogo + 22, y: arriba - 22, size: 17, font: negrita, color: rgb(1, 1, 1) });
    p.drawText(`${datos.curso} · Página ${i + 1} de ${originales.length}`, { x: MARGEN + anchoLogo + 22, y: arriba - 35, size: 8.5, font: normal, color: rgb(0.86, 0.9, 1) });

    // QR de entrega a la derecha.
    const lado = 64;
    const xQr = CARTA.ancho - MARGEN - lado;
    p.drawRectangle({ x: xQr - 4, y: arriba - 126, width: lado + 8, height: 82, color: rgb(1, 1, 1), borderColor: AZUL, borderWidth: 1.2 });
    p.drawImage(qr, { x: xQr, y: arriba - 48 - lado, width: lado, height: lado });
    p.drawText("Escanea para entregar", { x: xQr + (lado - negrita.widthOfTextAtSize("Escanea para entregar", 6)) / 2, y: arriba - 121, size: 6, font: negrita, color: AZUL });

    // Nombre, matrícula y calificación.
    const yDatos = arriba - 68;
    const etiqueta = (texto: string, x: number, ancho: number) => {
      p.drawText(texto, { x, y: yDatos, size: 9, font: negrita, color: GRIS });
      const w = negrita.widthOfTextAtSize(texto, 9);
      p.drawLine({ start: { x: x + w + 4, y: yDatos - 2 }, end: { x: x + ancho, y: yDatos - 2 }, thickness: 0.8, color: GRIS });
    };
    etiqueta("Nombre:", MARGEN, 250);
    etiqueta("Matrícula:", MARGEN + 262, 130);
    const xCal = xQr - 92;
    p.drawRectangle({ x: xCal, y: yDatos - 30, width: 80, height: 46, borderColor: rgb(0.86, 0.15, 0.15), borderWidth: 1.5 });
    p.drawText("Calificación", { x: xCal + 14, y: yDatos + 6, size: 8, font: negrita, color: rgb(0.86, 0.15, 0.15) });
    p.drawText(`/ ${escalaDe(actividad)}`, { x: xCal + (escalaDe(actividad) === 100 ? 46 : 52), y: yDatos - 24, size: 9, font: normal, color: GRIS });
    p.drawText("Escribe tu nombre y tu matrícula en cada hoja.", { x: MARGEN, y: yDatos - 22, size: 7.5, font: normal, color: GRIS });

    // Página original, ajustada al espacio restante.
    const disponible = { ancho: CARTA.ancho - 2 * MARGEN, alto: CARTA.alto - 2 * MARGEN - ALTO_ENCABEZADO };
    const escala = Math.min(disponible.ancho / o.ancho, disponible.alto / o.alto);
    const w = o.ancho * escala;
    const h = o.alto * escala;
    o.dibujar(p, (CARTA.ancho - w) / 2, MARGEN + (disponible.alto - h), w, h);
  });

  return doc.save();
}
