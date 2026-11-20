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
import { fechaHoraLarga } from "./resultados";
import { esCerrado, incisosCerrado } from "./calificar";
import { anotacionesNumeradas, centroEjercicio, fraccionEjercicio, puntosTexto } from "./elementos";
import { conPuntaje } from "./modalidad";
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

/** Radio del número de un ejercicio con varios reactivos (1.5 veces el normal). */
const RADIO_PASTEL = 7.5 * 1.5;

/**
 * Número de un ejercicio con varios reactivos dentro de un mini pastel: en verde la parte
 * correcta (desde arriba, en el sentido del reloj) y en rojo el resto.
 */
function circuloPastel(p: PDFPage, f: PDFFont, n: number, x: number, y: number, fraccion: number) {
  const r = RADIO_PASTEL;
  p.drawCircle({ x, y, size: r + 1.2, color: rgb(1, 1, 1) });
  if (fraccion >= 0.999) p.drawCircle({ x, y, size: r, color: VERDE });
  else {
    p.drawCircle({ x, y, size: r, color: ROJO });
    if (fraccion > 0.001) {
      const t = 2 * Math.PI * fraccion;
      const ex = r * Math.sin(t);
      const ey = -r * Math.cos(t);
      // drawSvgPath usa coordenadas SVG (y hacia abajo) a partir del punto dado.
      p.drawSvgPath(`M 0 0 L 0 ${-r} A ${r} ${r} 0 ${t > Math.PI ? 1 : 0} 1 ${ex.toFixed(3)} ${ey.toFixed(3)} Z`, { x, y, color: VERDE });
    }
  }
  const txt = String(n);
  const tam = n > 9 ? 11 : 13;
  p.drawText(txt, { x: x - f.widthOfTextAtSize(txt, tam) / 2, y: y - tam * 0.35, size: tam, font: f, color: rgb(1, 1, 1) });
}

/** Ancho de una columna de comentarios en el margen del PDF corregido. */
const COLUMNA = 165;

/** Ancho que ocupa el óvalo de un numeral de elemento a tamaño normal. */
function anchoNumeral(f: PDFFont, texto: string) {
  return 2 * Math.max(5, f.widthOfTextAtSize(texto, 5.5) / 2 + 2.5);
}

/** Numeral de un elemento ("1.1") en blanco dentro de un óvalo relleno del color dado. */
function etiquetaNumeral(p: PDFPage, f: PDFFont, texto: string, x: number, y: number, color: ReturnType<typeof rgb>, s = 1) {
  const tam = 5.5 * s;
  const ancho = f.widthOfTextAtSize(texto, tam);
  const rx = Math.max(5 * s, ancho / 2 + 2.5 * s);
  if (s > 1) p.drawEllipse({ x: x + rx, y, xScale: rx + 1, yScale: 5 * s + 1, color: rgb(1, 1, 1) });
  p.drawEllipse({ x: x + rx, y, xScale: rx, yScale: 5 * s, color });
  p.drawText(texto, { x: x + rx - ancho / 2, y: y - tam * 0.35, size: tam, font: f, color: rgb(1, 1, 1) });
  return 2 * rx;
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
/** Textos que se escriben sobre las hojas (para elegir la fuente CJK si hace falta). */
function textosDeHojas(actividad: Actividad, entrega: Entrega) {
  return [
    ...entrega.resultados.flatMap((r) => [r.comentario, ...(r.subrayados ?? []).map((s) => s.comentario)]),
    ...(actividad.criterios ?? []).map((c) => c.nombre),
    ...actividad.reactivos.flatMap((r) => (r.pasos ?? []).map((p) => p.nombre)),
  ];
}

async function dibujarHojas(doc: PDFDocument, actividad: Actividad, entrega: Entrega, normal: PDFFont, negrita: PDFFont, calTexto: string, tx: TextosPdf) {
  // Cada reactivo lleva sobre la hoja un círculo relleno con su número y, a un lado, la paloma
  // (verde) o el tache (rojo). Los comentarios van en el margen derecho, de arriba hacia abajo;
  // si no caben en una columna, siguen en otra columna a su derecha (la hoja se reduce).
  const puntaje = conPuntaje(actividad);
  for (const [i, ruta] of (entrega.imagenes ?? []).entries()) {
    const img = await doc.embedJpg(leerArchivo(ruta));
    const marcas = entrega.resultados
      .filter((r) => (r.ubicacion?.pagina ?? 1) === i + 1)
      .sort((a, b) => (a.ubicacion?.y ?? 0.5) - (b.ubicacion?.y ?? 0.5) || (a.ubicacion?.x ?? 0.9) - (b.ubicacion?.x ?? 0.9));

    // Bloques de comentario medidos con el ancho de una columna.
    const bloques = marcas.flatMap((res) => {
      const r = actividad.reactivos.find((x) => x.numero === res.numero);
      if (!r) return [];
      const completo = res.puntosObtenidos >= r.puntos;
      const lineas = envolver(normal, res.comentario || (completo ? tx.correcto : ""), 8.5, COLUMNA - 10);
      const elementos = anotacionesNumeradas(actividad, r, res).map((el) => {
        const etiqueta = el.numeral;
        const sangria = 12 + Math.max(anchoNumeral(negrita, etiqueta), 18) + 3;
        const texto = `${el.nombre}${puntaje && el.puntos ? `  ${puntosTexto(el.puntos.obtenidos)}/${puntosTexto(el.puntos.total)}` : ""}`;
        return { ok: el.ok, etiqueta, sangria, lineas: envolver(normal, texto, 7.5, COLUMNA - 6 - sangria) };
      });
      const altura = 17 + lineas.length * 10.5 + elementos.reduce((h, e) => h + 1.5 + e.lineas.length * 9.5, 0) + 8;
      return [{ res, r, completo, lineas, elementos, altura }];
    });

    // De arriba hacia abajo; al llegar al pie de la hoja, nueva columna a la derecha.
    const arriba = CARTA.alto - 70; // deja libre la calificación y la marca de agua
    const abajo = 14;
    let columna = 0;
    let y = arriba;
    const lugares = bloques.map((bl) => {
      if (y - bl.altura < abajo && y < arriba) {
        columna += 1;
        y = arriba;
      }
      const lugar = { columna, y };
      y -= bl.altura;
      return lugar;
    });
    const columnas = bloques.length ? columna + 1 : 1;

    const escala = Math.min((CARTA.ancho - 12 - 10 - columnas * COLUMNA) / img.width, (CARTA.alto - 24) / img.height);
    const ancho = img.width * escala;
    const alto = img.height * escala;
    const x0 = 12;
    const y0 = (CARTA.alto - alto) / 2;
    const xMargen = x0 + ancho + 10;
    const hoja = doc.addPage([CARTA.ancho, CARTA.alto]);
    hoja.drawImage(img, { x: x0, y: y0, width: ancho, height: alto });
    for (let k = 0; k < columnas; k++) {
      const xl = xMargen - 4 + k * COLUMNA;
      hoja.drawLine({ start: { x: xl, y: 12 }, end: { x: xl, y: CARTA.alto - 12 }, thickness: 0.6, color: GRIS, opacity: 0.4 });
    }

    if (i === 0 && puntaje) {
      const xc = xMargen + 30;
      hoja.drawCircle({ x: xc, y: CARTA.alto - 42, size: 26, borderColor: ROJO, borderWidth: 2 });
      hoja.drawText(calTexto, { x: xc - negrita.widthOfTextAtSize(calTexto, 17) / 2, y: CARTA.alto - 48, size: 17, font: negrita, color: ROJO });
    }

    // Sobre la hoja solo van los numerales (1.1, 1.2…); la descripción queda en el margen.
    // - Estilo "subrayado": línea roja bajo el error y su numeral a la izquierda.
    // - Elementos con ubicación: el numeral en el punto que señala, verde si se cumple, rojo si no.
    for (const res of entrega.resultados) {
      const r = actividad.reactivos.find((x) => x.numero === res.numero);
      if (!r) continue;
      for (const el of anotacionesNumeradas(actividad, r, res)) {
        const s = el.subrayado;
        if (s) {
          if (s.pagina !== i + 1) continue;
          const ys = y0 + alto * (1 - s.y) - 2;
          const xa = x0 + ancho * s.x0;
          const xb = x0 + ancho * Math.max(s.x1, s.x0 + 0.02);
          hoja.drawLine({ start: { x: xa, y: ys }, end: { x: xb, y: ys }, thickness: 1.4, color: ROJO, opacity: 0.85 });
          const anchoEt = anchoNumeral(negrita, el.numeral) * 1.4 + 2;
          etiquetaNumeral(hoja, negrita, el.numeral, Math.max(x0 + 1, xa - anchoEt - 1), ys + 5, ROJO, 1.4);
          continue;
        }
        const u = el.ubicacion;
        if (!u || u.pagina !== i + 1) continue;
        const xe = x0 + Math.min(ancho - 30, Math.max(4, ancho * u.x));
        const ye = y0 + alto * (1 - Math.min(0.98, Math.max(0.02, u.y)));
        etiquetaNumeral(hoja, negrita, el.numeral, xe, ye, el.ok ? VERDE : ROJO, 1.4);
      }
    }

    // Cerrados con varios renglones: paloma verde a la derecha de cada respuesta correcta; tache
    // rojo y la letra correcta en rojo junto a cada incorrecta.
    for (const res of entrega.resultados) {
      const r = actividad.reactivos.find((x) => x.numero === res.numero);
      if (!r || !esCerrado(r) || !res.ubicacionesIncisos?.length) continue;
      for (const [j, inc] of incisosCerrado(r, res.respuestaLeida).entries()) {
        const u = res.ubicacionesIncisos[j];
        if (!u || u.pagina !== i + 1) continue;
        if (inc.palabra) {
          // Palabra elegida de un conjunto: paloma sobre la elegida si acertó; si no, tache sobre la
          // opción correcta que no se eligió.
          const ux = inc.correcto ? u.x : (u.xCorrecta ?? u.x);
          const uy = inc.correcto ? u.y : (u.yCorrecta ?? u.y);
          const xp = x0 + Math.min(ancho - 10, Math.max(6, ancho * ux));
          const yp = y0 + alto * (1 - Math.min(0.98, Math.max(0.02, uy))) + 9;
          if (inc.correcto) paloma(hoja, xp - 5, yp - 3, 0.55);
          else tache(hoja, xp, yp, 0.5);
          continue;
        }
        const xi = x0 + Math.min(ancho - 30, Math.max(4, ancho * u.x + 3));
        const yi = y0 + alto * (1 - Math.min(0.98, Math.max(0.02, u.y)));
        if (inc.correcto) paloma(hoja, xi, yi - 4, 0.55);
        else {
          tache(hoja, xi + 5, yi, 0.5);
          hoja.drawText(seguro(negrita, inc.correcta), { x: xi + 12, y: yi - 4, size: 11, font: negrita, color: ROJO });
        }
      }
    }

    for (const [k, { res, r, completo, lineas, elementos }] of bloques.entries()) {
      const color = completo ? VERDE : ROJO;

      // Marca sobre la hoja del alumno, donde está su respuesta.
      // Con varios incisos, el pastel va a media altura de todos ellos.
      const fraccion = fraccionEjercicio(actividad, r, res);
      const centro = fraccion === undefined ? undefined : centroEjercicio(actividad, r, res);
      const xc = x0 + Math.min(ancho - 34, Math.max(10, ancho * (centro?.x ?? res.ubicacion?.x ?? 0.9) + 10)); // justo después de la respuesta
      const yc = y0 + alto * (1 - Math.min(0.98, Math.max(0.02, centro?.y ?? res.ubicacion?.y ?? 0.5)));
      const d = fraccion === undefined ? 0 : RADIO_PASTEL - 7.5; // espacio extra del pastel
      if (fraccion === undefined) circuloNumero(hoja, negrita, r.numero, xc, yc, color);
      else circuloPastel(hoja, negrita, r.numero, xc + d, yc, fraccion);
      if (completo) paloma(hoja, xc + 11 + 2 * d, yc - 4, 0.6);
      else {
        tache(hoja, xc + 17 + 2 * d, yc, 0.6);
        // Opción múltiple o V/F mal contestada: la respuesta correcta junto al tache.
        const unico = esCerrado(r) ? incisosCerrado(r, res.respuestaLeida) : [];
        if (unico.length === 1 && !unico[0].correcto) {
          hoja.drawText(seguro(negrita, unico[0].correcta), { x: xc + 27 + 2 * d, y: yc - 4, size: 11, font: negrita, color: ROJO });
        }
      }

      // Comentario en su columna, en orden de arriba hacia abajo.
      const xCol = xMargen + lugares[k].columna * COLUMNA;
      const yEntrada = lugares[k].y - 8;
      if (fraccion === undefined) circuloNumero(hoja, negrita, r.numero, xCol + 10, yEntrada, color);
      else circuloPastel(hoja, negrita, r.numero, xCol + 10 + d, yEntrada, fraccion);
      if (completo) paloma(hoja, xCol + 22 + 2 * d, yEntrada - 4, 0.6);
      else tache(hoja, xCol + 28 + 2 * d, yEntrada, 0.6);
      hoja.drawText(seguro(negrita, puntaje ? formato(tx.reactivoPuntos, { n: r.numero, p: puntosTexto(res.puntosObtenidos), t: puntosTexto(r.puntos) }) : formato(tx.reactivoSolo, { n: r.numero })), {
        x: xCol + 40 + 2 * d,
        y: yEntrada - 3.5,
        size: 9,
        font: negrita,
        color,
      });
      let yTexto = yEntrada - 17;
      for (const l of lineas) {
        hoja.drawText(l, { x: xCol + 4, y: yTexto, size: 8.5, font: normal, color });
        yTexto -= 10.5;
      }
      // Puntos por elemento de la rúbrica (pasos o criterios), numerados a partir del reactivo:
      // paloma verde + "1.1" en círculo verde si se cumple; tache rojo + "1.2" en rojo si no.
      for (const e of elementos) {
        const tono = e.ok ? VERDE : ROJO;
        yTexto -= 1.5;
        if (e.ok) paloma(hoja, xCol + 3, yTexto - 0.5, 0.35);
        else tache(hoja, xCol + 6, yTexto + 2.5, 0.35);
        etiquetaNumeral(hoja, negrita, e.etiqueta, xCol + 12, yTexto + 2.5, tono);
        for (const l of e.lineas) {
          hoja.drawText(l, { x: xCol + e.sangria, y: yTexto, size: 7.5, font: normal, color: tono });
          yTexto -= 9.5;
        }
      }
    }
  }
}

/** Hojas corregidas solas (sin portada ni marca de agua): es lo que se guarda al archivar la entrega. */
export async function pdfHojasCorregidas(actividad: Actividad, entrega: Entrega, tx: TextosPdf = alumnoEs.pdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { normal, negrita } = await fuentesPdf(doc, [tx.reactivoPuntos, tx.correcto, ...textosDeHojas(actividad, entrega)], leerFuenteCjk);
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
    for (const v of estudio.videos.slice(0, 3)) {
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
  locale?: string,
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
      ...textosDeHojas(actividad, entrega),
      ...actividad.reactivos.flatMap((r) => [r.enunciado, r.respuesta, ...(r.solucionPasos ?? [])]),
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
  const puntaje = conPuntaje(actividad);
  if (puntaje) {
    p.drawCircle({ x: CARTA.ancho - 130, y: y - 2, size: 34, borderColor: ROJO, borderWidth: 2 });
    p.drawText(calTexto, { x: CARTA.ancho - 130 - negrita.widthOfTextAtSize(calTexto, 22) / 2, y: y - 9, size: 22, font: negrita, color: ROJO });
  }
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
    [tx.entregada, entrega.entregadaEn ? fechaHoraLarga(entrega.entregadaEn, locale) : "-"],
    [tx.calificacion, puntaje ? `${calTexto} / ${escala}  ${formato(tx.puntosDe, { p: puntosObtenidos(entrega), t: puntosTotales(actividad) })}` : tx.sinPuntaje],
  ]) {
    texto(et, 48, 10, normal, GRIS);
    for (const [i, l] of envolver(normal, val, 10, 380).entries()) {
      if (i > 0) nuevaLinea(13);
      texto(l, 170, 10);
    }
    nuevaLinea(15);
  }
  nuevaLinea(10);
  texto(tx.corregida, 48, 11, negrita);
  nuevaLinea(14);
  for (const [i, l] of envolver(normal, tx.leyenda, 9, 500).entries()) {
    if (i > 0) nuevaLinea(12);
    texto(l, 48, 9, normal, GRIS);
  }

  // ---- 2. Hojas del alumno con marcas (guardadas en el PDF archivado o dibujadas sobre las fotos) ----
  if (entrega.pdf) {
    const archivado = await PDFDocument.load(leerArchivo(entrega.pdf));
    for (const pag of await doc.copyPages(archivado, archivado.getPageIndices())) doc.addPage(pag);
  } else {
    await dibujarHojas(doc, actividad, entrega, normal, negrita, calTexto, tx);
  }

  // ---- 3. Resumen del desempeño: aspectos positivos y de mejora, y puntos por reactivo ----
  p = doc.addPage([CARTA.ancho, CARTA.alto]);
  y = CARTA.alto - 56;
  texto(tx.retroRubrica, 48, 13, negrita);
  nuevaLinea(22);
  for (const [titulo, lista, color] of [
    [tx.positivos, entrega.positivos, VERDE],
    [tx.mejoras, entrega.mejoras, ROJO],
  ] as const) {
    texto(titulo, 48, 10, negrita, color);
    nuevaLinea(14);
    for (const item of lista) {
      for (const [i, l] of envolver(normal, texAPlano(item), 10, 480).entries()) {
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
  if (puntaje) texto(tx.puntos, 520, 9, negrita, GRIS);
  nuevaLinea(14);
  for (const r of actividad.reactivos) {
    const res = entrega.resultados.find((x) => x.numero === r.numero);
    if (!res) continue;
    const lineas = envolver(normal, texAPlano(res.comentario), 9, 300);
    texto(String(r.numero), 48, 9);
    texto(envolver(normal, r.tema, 9, 100)[0] ?? "", 100, 9);
    texto(puntaje ? `${res.puntosObtenidos}/${r.puntos}` : res.puntosObtenidos >= r.puntos ? "OK" : "X", 520, 9, negrita, res.puntosObtenidos >= r.puntos ? VERDE : ROJO);
    for (const l of lineas) {
      texto(l, 210, 9);
      nuevaLinea(12);
    }
    nuevaLinea(4);
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

  // ---- 5. Solución de cada reactivo, al final ----
  if (actividad.reactivos.some((r) => r.respuesta.trim() || r.solucionPasos?.length)) {
    p = doc.addPage([CARTA.ancho, CARTA.alto]);
    y = CARTA.alto - 56;
    texto(tx.solucion, 48, 13, negrita);
    nuevaLinea(22);
    const parrafo = (t: string, x: number, tam: number, f: PDFFont, color = TINTA) => {
      for (const l of envolver(f, texAPlano(t), tam, CARTA.ancho - x - 48)) {
        texto(l, x, tam, f, color);
        nuevaLinea(tam + 4);
      }
    };
    for (const r of actividad.reactivos) {
      parrafo(`${tx.reactivo} ${r.numero}${r.tema ? ` · ${r.tema}` : ""}`, 48, 10, negrita, GRIS);
      if (r.enunciado) parrafo(r.enunciado, 48, 10, normal);
      if (r.solucionPasos?.length) {
        parrafo(tx.procedimiento, 56, 9, negrita, GRIS);
        for (const [i, paso] of r.solucionPasos.entries()) parrafo(`${i + 1}. ${paso}`, 64, 9, normal);
      }
      if (r.respuesta.trim()) parrafo(`${tx.respuesta} ${r.respuesta}`, 56, 10, negrita, VERDE);
      nuevaLinea(8);
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
