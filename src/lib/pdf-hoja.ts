// Hoja imprimible de una actividad cargada escaneada: cada página del profesor ocupa la hoja
// completa y lleva encima el QR de entrega (esquina) y una franja con nombre, matrícula y calificación.
import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { leerArchivo } from "./almacen";
import { bytesLogo } from "./logo";
import { escalaDe } from "./estadisticas";
import { conPuntaje } from "./modalidad";
import profesorEs from "./i18n/diccionarios/profesor/es";
import { formato } from "./i18n/idiomas";
import { leerFuenteCjk } from "./pdf-fuente-cjk";
import { fuentesPdf } from "./pdf-fuentes";
import type { Actividad } from "./tipos";

const CARTA = { ancho: 612, alto: 792 };
/** Separación de los recuadros de entrega respecto al borde de la hoja. */
const MARGEN_ESQUINA = 14;
const AZUL = rgb(0.145, 0.329, 0.91);
const GRIS = rgb(0.4, 0.45, 0.52);

export async function pdfHojaEscaneada(
  actividad: Actividad,
  datos: { curso: string; enlace: string },
  tx: typeof profesorEs.hojaImpresa = profesorEs.hojaImpresa,
  /** PNG del encabezado; por omisión, el logo de iEureka-Grader. */
  logoPng: Buffer = bytesLogo(),
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(actividad.titulo);
  const { normal, negrita, limpiar } = await fuentesPdf(doc, [actividad.titulo, datos.curso, ...Object.values(tx)], leerFuenteCjk);
  const logo = await doc.embedPng(logoPng);
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

    // La página del profesor ocupa la hoja completa (100 %), centrada y sin reducirla para el
    // encabezado: los datos de entrega van encima, en las esquinas, sobre recuadros blancos.
    const escala = Math.min(CARTA.ancho / o.ancho, CARTA.alto / o.alto);
    const w = o.ancho * escala;
    const h = o.alto * escala;
    o.dibujar(p, (CARTA.ancho - w) / 2, (CARTA.alto - h) / 2, w, h);

    // QR de entrega en la esquina superior derecha.
    const lado = 54;
    const xQr = CARTA.ancho - MARGEN_ESQUINA - lado;
    const yQr = CARTA.alto - MARGEN_ESQUINA - lado;
    p.drawRectangle({ x: xQr - 4, y: yQr - 12, width: lado + 8, height: lado + 16, color: rgb(1, 1, 1), borderColor: AZUL, borderWidth: 1 });
    p.drawImage(qr, { x: xQr, y: yQr, width: lado, height: lado });
    const escanea = limpiar(tx.escanea);
    const tamEscanea = Math.min(5.5, (5.5 * (lado + 4)) / Math.max(1, negrita.widthOfTextAtSize(escanea, 5.5)));
    p.drawText(escanea, { x: xQr + (lado - negrita.widthOfTextAtSize(escanea, tamEscanea)) / 2, y: yQr - 8, size: tamEscanea, font: negrita, color: AZUL });

    // Franja inferior: nombre, matrícula, calificación (si la rúbrica lleva puntaje) y página.
    const alto = 22;
    const y = MARGEN_ESQUINA;
    p.drawRectangle({ x: MARGEN_ESQUINA, y, width: CARTA.ancho - 2 * MARGEN_ESQUINA, height: alto, color: rgb(1, 1, 1), borderColor: AZUL, borderWidth: 0.8 });
    const altoLogo = 14;
    const anchoLogo = (logo.width / logo.height) * altoLogo;
    p.drawImage(logo, { x: MARGEN_ESQUINA + 5, y: y + 4, width: anchoLogo, height: altoLogo });
    let x = MARGEN_ESQUINA + anchoLogo + 12;
    const campo = (bruto: string, ancho: number, despues = "") => {
      const texto = limpiar(bruto);
      p.drawText(texto, { x, y: y + 8, size: 8, font: negrita, color: GRIS });
      const t = negrita.widthOfTextAtSize(texto, 8);
      const d = despues ? normal.widthOfTextAtSize(despues, 8) + 3 : 0;
      p.drawLine({ start: { x: x + t + 3, y: y + 7 }, end: { x: x + ancho - d, y: y + 7 }, thickness: 0.7, color: GRIS });
      if (despues) p.drawText(despues, { x: x + ancho - d + 3, y: y + 8, size: 8, font: normal, color: GRIS });
      x += ancho + 12;
    };
    campo(`${tx.nombre}:`, 190);
    campo(`${tx.matricula}:`, 110);
    if (conPuntaje(actividad)) campo(`${tx.calificacion}:`, 110, `/ ${escalaDe(actividad)}`);
    const pie = limpiar(formato(tx.paginaDe, { i: i + 1, n: originales.length }));
    p.drawText(pie, { x: CARTA.ancho - MARGEN_ESQUINA - 6 - normal.widthOfTextAtSize(pie, 7), y: y + 8, size: 7, font: normal, color: GRIS });
  });

  return doc.save();
}
