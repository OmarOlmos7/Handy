// Dibuja el reporte de analíticas en hojas carta (vertical) con pdf-lib, en el navegador.
// Solo acomoda lo que trae `ReporteAnaliticas`; no calcula números.
import type { PDFFont, PDFPage } from "pdf-lib";
import { colorDesempeno } from "./escala-color";
import { APROBATORIA } from "./analiticas";
import type { BloqueReporte, CeldaTabla, ReporteAnaliticas } from "./reporte-analiticas";

const ANCHO = 612;
const ALTO = 792;
const M = 40;
const UTIL = ANCHO - 2 * M;
const SEP = 18;
const PIE = 30;

/** Las fuentes estándar del PDF solo traen caracteres latinos y algunos signos; el resto se cambia por "?". */
export const latino = (t: string) => t.replace(/[^\x20-\x7e\xa0-\xff–—‘’“”•…]/g, "?");

const hex = (h: string) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

export async function pdfReporteAnaliticas(reporte: ReporteAnaliticas, logoPng?: ArrayBuffer): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(latino(reporte.titulo));
  doc.setCreator("iEureka-Grader");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = logoPng ? await doc.embedPng(logoPng).catch(() => null) : null;
  const color = (h: string) => rgb(...hex(h));
  const TINTA = "#0f172a";
  const GRIS = "#64748b";
  const LINEA = "#e2e8f0";

  const ancho = (t: string, f: PDFFont, s: number) => f.widthOfTextAtSize(latino(t), s);
  const recortar = (t: string, f: PDFFont, s: number, max: number) => {
    let x = latino(t);
    if (f.widthOfTextAtSize(x, s) <= max) return x;
    while (x.length > 1 && f.widthOfTextAtSize(x + "…", s) > max) x = x.slice(0, -1);
    return x.trimEnd() + "…";
  };
  const envolver = (t: string, f: PDFFont, s: number, max: number, maxLineas = 99) => {
    const out: string[] = [];
    let actual = "";
    for (const p of latino(t).split(/\s+/)) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (!actual || f.widthOfTextAtSize(prueba, s) <= max) actual = prueba;
      else {
        out.push(actual);
        actual = p;
      }
    }
    if (actual) out.push(actual);
    if (out.length > maxLineas) {
      out.length = maxLineas;
      out[maxLineas - 1] += "…";
    }
    return out.map((l) => recortar(l, f, s, max));
  };

  let pagina!: PDFPage;
  let y = 0;
  const texto = (t: string, x: number, yy: number, s: number, f: PDFFont = normal, c = TINTA) =>
    pagina.drawText(latino(t), { x, y: yy, size: s, font: f, color: color(c) });
  const derecha = (t: string, xDer: number, yy: number, s: number, f: PDFFont = normal, c = TINTA) => texto(t, xDer - ancho(t, f, s), yy, s, f, c);
  const centro = (t: string, xc: number, yy: number, s: number, f: PDFFont = normal, c = TINTA) => texto(t, xc - ancho(t, f, s) / 2, yy, s, f, c);

  // ---------- Encabezados ----------
  const encabezadoCompleto = () => {
    let x = M;
    if (logo) {
      const h = 46;
      const w = (logo.width / logo.height) * h;
      pagina.drawImage(logo, { x: M, y: ALTO - M - h + 4, width: w, height: h });
      x = M + w + 10;
    }
    texto("iEureka-Grader", x, ALTO - M - 8, 8.5, negrita, "#1d43c9");
    texto(reporte.titulo, x, ALTO - M - 28, 17, negrita);
    y = ALTO - M - 52;
    // Caja con los datos del grupo y de la actividad, en dos columnas.
    const filas = Math.ceil(reporte.datos.length / 2);
    const alto = filas * 15 + 12;
    pagina.drawRectangle({ x: M, y: y - alto, width: UTIL, height: alto, color: color("#f1f5f9") });
    pagina.drawRectangle({ x: M, y: y - alto, width: 3, height: alto, color: color("#2554e8") });
    reporte.datos.forEach((d, i) => {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      const x0 = M + 14 + col * (UTIL / 2);
      const yy = y - 17 - fila * 15;
      texto(`${d.etiqueta}:`, x0, yy, 8.5, negrita, "#334155");
      texto(recortar(d.valor, normal, 8.5, UTIL / 2 - 30 - ancho(`${d.etiqueta}:`, negrita, 8.5)), x0 + ancho(`${d.etiqueta}:`, negrita, 8.5) + 4, yy, 8.5);
    });
    y -= alto + SEP;
  };
  const encabezadoCorto = () => {
    const sub = reporte.datos
      .filter((d) => ["Materia", "Grupo", "Actividad"].includes(d.etiqueta))
      .map((d) => d.valor)
      .join(" · ");
    texto(reporte.titulo, M, ALTO - M - 4, 9, negrita);
    derecha(recortar(sub, normal, 8, UTIL / 2), ANCHO - M, ALTO - M - 4, 8, normal, GRIS);
    pagina.drawLine({ start: { x: M, y: ALTO - M - 10 }, end: { x: ANCHO - M, y: ALTO - M - 10 }, thickness: 0.6, color: color(LINEA) });
    y = ALTO - M - 10 - SEP;
  };
  const nuevaPagina = (primera = false) => {
    pagina = doc.addPage([ANCHO, ALTO]);
    if (primera) encabezadoCompleto();
    else encabezadoCorto();
  };
  const espacio = () => y - (M + PIE);
  const asegurar = (h: number) => {
    if (h > espacio()) nuevaPagina();
  };

  // ---------- Títulos de sección ----------
  const altoTitulo = (b: { titulo: string; nota?: string }, w: number) => 14 + (b.nota ? envolver(b.nota, normal, 7.5, w).length * 9.5 : 0) + 6;
  const dibujarTitulo = (b: { titulo: string; nota?: string }, x: number, top: number, w: number) => {
    texto(recortar(b.titulo, negrita, 11, w), x, top - 10, 11, negrita);
    let yy = top - 14;
    if (b.nota)
      for (const l of envolver(b.nota, normal, 7.5, w)) {
        yy -= 9.5;
        texto(l, x, yy + 2, 7.5, normal, GRIS);
      }
    return top - altoTitulo(b, w);
  };

  // ---------- Medidas y dibujo de cada bloque ----------
  const FILA_BARRA = 17;
  const FILA_TABLA = 15;
  const ALTO_COLUMNAS = 110;

  function alto(b: BloqueReporte, w: number): number {
    switch (b.tipo) {
      case "cifras":
        return 62;
      case "pasteles":
        return Math.max(...b.items.map((p) => altoTitulo(p, w / 3 - 12))) + 92;
      case "lista":
        return altoTitulo(b, w) + b.items.reduce((s, it) => s + envolver(it, normal, 9, w - 12).length * 12 + 3, 0);
      case "barras":
        return altoTitulo(b, w) + Math.max(1, b.filas.length) * FILA_BARRA;
      case "columnas":
        return altoTitulo(b, w) + ALTO_COLUMNAS + 26;
      case "tabla":
        return altoTitulo(b, w) + FILA_TABLA + 4 + Math.max(1, b.filas.length) * FILA_TABLA;
      case "par": {
        const m = (w - 16) / 2;
        return Math.max(alto(b.bloques[0], m), alto(b.bloques[1], m));
      }
    }
  }

  function dibujar(b: BloqueReporte, x: number, top: number, w: number) {
    switch (b.tipo) {
      case "cifras": {
        const n = b.items.length;
        const g = 6;
        const tw = (w - g * (n - 1)) / n;
        b.items.forEach((c, i) => {
          const x0 = x + i * (tw + g);
          pagina.drawRectangle({ x: x0, y: top - 62, width: tw, height: 62, borderColor: color(LINEA), borderWidth: 0.8, color: color("#ffffff") });
          texto(recortar(c.titulo.toUpperCase(), negrita, 6.5, tw - 12), x0 + 7, top - 13, 6.5, negrita, GRIS);
          texto(c.valor, x0 + 7, top - 33, 17, negrita);
          if (c.detalle) envolver(c.detalle, normal, 6.5, tw - 12, 2).forEach((l, k) => texto(l, x0 + 7, top - 45 - k * 8, 6.5, normal, GRIS));
        });
        return;
      }
      case "pasteles": {
        const cw = w / 3;
        const tituloAlto = Math.max(...b.items.map((p) => altoTitulo(p, cw - 12)));
        b.items.forEach((p, i) => {
          const x0 = x + i * cw;
          dibujarTitulo(p, x0, top, cw - 12);
          const cy = top - tituloAlto - 40;
          const cx = x0 + 40;
          const R = 36;
          const r = 24;
          const total = p.rebanadas.reduce((s, z) => s + z.valor, 0);
          if (total <= 0) {
            pagina.drawCircle({ x: cx, y: cy, size: R, color: color(LINEA) });
          } else {
            let a0 = -Math.PI / 2;
            for (const z of p.rebanadas) {
              if (z.valor <= 0) continue;
              const frac = z.valor / total;
              // Un arco de 360° no se puede trazar; se parte en dos mitades.
              const partes = frac >= 0.999 ? [0.5, 0.5] : [frac];
              for (const f of partes) {
                const a1 = a0 + f * 2 * Math.PI;
                const grande = f > 0.5 ? 1 : 0;
                const P = (rad: number, ang: number) => `${(rad * Math.cos(ang)).toFixed(3)} ${(rad * Math.sin(ang)).toFixed(3)}`;
                const d = `M ${P(R, a0)} A ${R} ${R} 0 ${grande} 1 ${P(R, a1)} L ${P(r, a1)} A ${r} ${r} 0 ${grande} 0 ${P(r, a0)} Z`;
                pagina.drawSvgPath(d, { x: cx, y: cy, color: color(z.color) });
                a0 = a1;
              }
            }
          }
          centro(p.centro, cx, cy - 3, 11, negrita);
          centro(p.subcentro, cx, cy - 12, 5.5, normal, GRIS);
          const lx = cx + R + 10;
          const lw = x0 + cw - 8 - lx;
          p.rebanadas.forEach((z, k) => {
            const ly = cy + 16 - k * 14;
            pagina.drawRectangle({ x: lx, y: ly - 1, width: 6, height: 6, color: color(z.color) });
            texto(recortar(z.nombre, normal, 7, lw - 26), lx + 9, ly, 7, normal, "#334155");
            derecha(String(z.valor), lx + lw, ly, 7.5, negrita);
          });
        });
        return;
      }
      case "lista": {
        let yy = dibujarTitulo(b, x, top, w);
        for (const it of b.items) {
          const ls = envolver(it, normal, 9, w - 12);
          pagina.drawCircle({ x: x + 3, y: yy - 6.5, size: 1.4, color: color("#334155") });
          ls.forEach((l, k) => texto(l, x + 10, yy - 9 - k * 12, 9, normal, "#334155"));
          yy -= ls.length * 12 + 3;
        }
        return;
      }
      case "barras": {
        let yy = dibujarTitulo(b, x, top, w);
        if (!b.filas.length) {
          texto("Sin datos.", x, yy - 10, 8, normal, GRIS);
          return;
        }
        const wNombre = Math.min(w * 0.38, 150);
        const wValor = 34;
        const pista = w - wNombre - wValor - 8;
        const x1 = x + wNombre + 4;
        for (const f of b.filas) {
          const nombre = f.detalle ? `${f.nombre} · ${f.detalle}` : f.nombre;
          texto(recortar(nombre, normal, 7.5, wNombre - 4), x, yy - 10, 7.5, normal, "#334155");
          pagina.drawRectangle({ x: x1, y: yy - 12, width: pista, height: 7, color: color("#f1f5f9") });
          const v = Math.max(0, Math.min(100, f.valor));
          if (v > 0) pagina.drawRectangle({ x: x1, y: yy - 12, width: (pista * v) / 100, height: 7, color: color(colorDesempeno(v)) });
          const xa = x1 + (pista * APROBATORIA) / 100;
          pagina.drawLine({ start: { x: xa, y: yy - 14 }, end: { x: xa, y: yy - 3 }, thickness: 0.7, color: color("#64748b") });
          derecha(`${Math.round(f.valor * 10) / 10}${b.sufijo ?? ""}`, x + w, yy - 11, 8, negrita);
          yy -= FILA_BARRA;
        }
        return;
      }
      case "columnas": {
        const yy = dibujarTitulo(b, x, top, w);
        const base = yy - ALTO_COLUMNAS;
        const n = Math.max(1, b.filas.length);
        const paso = w / n;
        const bw = Math.min(46, paso * 0.62);
        pagina.drawLine({ start: { x, y: base }, end: { x: x + w, y: base }, thickness: 0.6, color: color("#cbd5e1") });
        const altoUtil = ALTO_COLUMNAS - 14;
        b.filas.forEach((f, i) => {
          const cx = x + paso * i + paso / 2;
          const h = b.max > 0 ? (altoUtil * Math.max(0, f.valor)) / b.max : 0;
          if (h > 0) pagina.drawRectangle({ x: cx - bw / 2, y: base, width: bw, height: h, color: color(f.color) });
          centro(f.etiqueta, cx, base + h + 3, 7.5, negrita);
          envolver(f.nombre, normal, 6.5, paso - 4, 2).forEach((l, k) => centro(l, cx, base - 9 - k * 8, 6.5, normal, GRIS));
        });
        if (b.linea !== undefined && b.max > 0) {
          const ly = base + (altoUtil * b.linea) / b.max;
          pagina.drawLine({ start: { x, y: ly }, end: { x: x + w, y: ly }, thickness: 0.7, color: color("#64748b"), dashArray: [3, 2] });
        }
        return;
      }
      case "tabla":
        dibujarTabla(b, b.filas, x, top, w, true);
        return;
      case "par": {
        const m = (w - 16) / 2;
        dibujar(b.bloques[0], x, top, m);
        dibujar(b.bloques[1], x + m + 16, top, m);
        return;
      }
    }
  }

  function dibujarTabla(b: Extract<BloqueReporte, { tipo: "tabla" }>, filas: CeldaTabla[][], x: number, top: number, w: number, conTitulo: boolean) {
    let yy = conTitulo ? dibujarTitulo(b, x, top, w) : top;
    const total = b.columnas.reduce((s, c) => s + c.ancho, 0);
    const xs: number[] = [];
    let acc = x;
    for (const c of b.columnas) {
      xs.push(acc);
      acc += (w * c.ancho) / total;
    }
    const anchoCol = (i: number) => (w * b.columnas[i].ancho) / total;
    pagina.drawRectangle({ x, y: yy - FILA_TABLA, width: w, height: FILA_TABLA, color: color("#f1f5f9") });
    b.columnas.forEach((c, i) => {
      // El encabezado se achica para caber completo antes de recortarse.
      const titulo = c.titulo.toUpperCase();
      const tam = Math.max(5, Math.min(6.5, (6.5 * (anchoCol(i) - 8)) / Math.max(1, ancho(titulo, negrita, 6.5))));
      const t = recortar(titulo, negrita, tam, anchoCol(i) - 8);
      if (c.alinear === "der") derecha(t, xs[i] + anchoCol(i) - 4, yy - 10, tam, negrita, GRIS);
      else texto(t, xs[i] + 4, yy - 10, tam, negrita, GRIS);
    });
    yy -= FILA_TABLA + 4;
    if (!filas.length) {
      texto(b.vacio ?? "Sin datos.", x + 4, yy - 10, 8, normal, GRIS);
      return;
    }
    for (const fila of filas) {
      fila.forEach((c, i) => {
        const f = c.negrita ? negrita : normal;
        const t = recortar(c.texto, f, 8, anchoCol(i) - 8);
        if (b.columnas[i].alinear === "der") derecha(t, xs[i] + anchoCol(i) - 4, yy - 10, 8, f, c.color ?? TINTA);
        else texto(t, xs[i] + 4, yy - 10, 8, f, c.color ?? TINTA);
      });
      yy -= FILA_TABLA;
      pagina.drawLine({ start: { x, y: yy + 1 }, end: { x: x + w, y: yy + 1 }, thickness: 0.4, color: color(LINEA) });
    }
  }

  // ---------- Recorrido ----------
  nuevaPagina(true);
  if (!reporte.bloques.length) texto("Aún no hay resultados evaluados para este reporte.", M, y - 10, 10, normal, GRIS);
  for (const b of reporte.bloques) {
    const h = alto(b, UTIL);
    // Una tabla se parte solo si no cabe ni en una página completa; si no, pasa entera a la siguiente.
    const paginaCompleta = ALTO - M - 10 - SEP - (M + PIE);
    if (b.tipo === "tabla" && h > espacio() && h > paginaCompleta) {
      // Las tablas largas siguen en la página siguiente con su encabezado.
      const minimo = altoTitulo(b, UTIL) + FILA_TABLA * 4 + 4;
      if (espacio() < minimo) nuevaPagina();
      let pendientes = b.filas;
      let primera = true;
      while (pendientes.length) {
        const cabe = Math.max(1, Math.floor((espacio() - (primera ? altoTitulo(b, UTIL) : 0) - FILA_TABLA - 4) / FILA_TABLA));
        const tramo = pendientes.slice(0, cabe);
        dibujarTabla(b, tramo, M, y, UTIL, primera);
        y -= (primera ? altoTitulo(b, UTIL) : 0) + FILA_TABLA + 4 + tramo.length * FILA_TABLA + SEP;
        pendientes = pendientes.slice(cabe);
        primera = false;
        if (pendientes.length) nuevaPagina();
      }
      continue;
    }
    asegurar(h);
    dibujar(b, M, y, UTIL);
    y -= h + SEP;
  }

  // Pie de página con número.
  const paginas = doc.getPages();
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 6 }, end: { x: ANCHO - M, y: M + 6 }, thickness: 0.5, color: color(LINEA) });
    p.drawText(latino(`Generado con iEureka-Grader · ${hoy}`), { x: M, y: M - 6, size: 7, font: normal, color: color(GRIS) });
    const t = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(latino(t), { x: ANCHO - M - normal.widthOfTextAtSize(latino(t), 7), y: M - 6, size: 7, font: normal, color: color(GRIS) });
  });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
