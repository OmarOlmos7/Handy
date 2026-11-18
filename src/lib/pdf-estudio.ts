// Página "4. Recomendaciones de estudio" del PDF con fórmulas en LaTeX de calidad tipográfica:
// se arma en HTML con KaTeX y la imprime Chromium (sin interfaz). Los enlaces quedan activos.
// Si el servidor no tiene Chromium, el PDF usa la versión en texto simple.
import "server-only";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import katex from "katex";
import { guardarArchivo, leerArchivo, rutaAbsoluta } from "./almacen";
import { recursosParaTemas } from "./recursos";
import type { Actividad, Entrega } from "./tipos";
import { enlaceVideo } from "./videos";

const ejecutar = promisify(execFile);

// Primero la versión "headless shell" (más ligera y estable para imprimir), luego Chromium completo.
const RUTAS_CHROMIUM = [process.env.CHROMIUM_PATH, "/usr/bin/chromium-headless-shell", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

/** Si Chromium falló o se colgó, no se vuelve a intentar en una hora (el PDF sale en texto). */
let fallaChromium = 0;

function chromium(): string | undefined {
  if (Date.now() - fallaChromium < 3_600_000) return undefined;
  return RUTAS_CHROMIUM.find((r): r is string => Boolean(r && fs.existsSync(r)));
}

function carpetaKatex(): string | undefined {
  const r = path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "katex", "dist");
  return fs.existsSync(path.join(r, "katex.min.css")) ? r : undefined;
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto con fórmulas $…$ y $$…$$ convertido a HTML con KaTeX. */
export function htmlConFormulas(texto: string): string {
  return texto
    .split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g)
    .map((parte) => {
      const bloque = parte.startsWith("$$") && parte.endsWith("$$") && parte.length > 4;
      const linea = !bloque && parte.startsWith("$") && parte.endsWith("$") && parte.length > 2;
      if (bloque || linea) {
        const tex = bloque ? parte.slice(2, -2) : parte.slice(1, -1);
        return katex.renderToString(tex, { displayMode: bloque, throwOnError: false, strict: "ignore", output: "html" });
      }
      return escapar(parte).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    })
    .join("");
}

export function htmlEstudio(actividad: Pick<Actividad, "titulo" | "recursos">, entrega: Pick<Entrega, "estudio">, cssKatex: string): string {
  const e = entrega.estudio!;
  const { videos, lecturas } = recursosParaTemas(actividad, e.temas);
  const listaVideos = videos.length
    ? videos.map((v) => `<li><a href="${escapar(v.url)}">${escapar(v.titulo)}</a><span class="fuente"> · ${escapar(v.fuente)}</span></li>`)
    : e.videos.map((v) => `<li><a href="${escapar(enlaceVideo(v.busqueda))}">${escapar(v.titulo)}</a><span class="fuente"> · búsqueda en YouTube</span></li>`);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${cssKatex}
@page { size: letter; margin: 18mm 17mm; }
body { font-family: "Inter", "DejaVu Sans", "Helvetica", sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.45; }
h1 { font-size: 15pt; margin: 0 0 4pt; }
h2 { font-size: 11.5pt; margin: 14pt 0 4pt; }
.gris { color: #64748b; font-size: 9.5pt; }
a { color: #1d4ed8; text-decoration: none; }
ul { margin: 4pt 0; padding-left: 16pt; } li { margin: 3pt 0; }
.fuente { color: #64748b; font-size: 9pt; }
.ej { border: 1px solid #e2e8f0; border-radius: 6pt; padding: 8pt 10pt; margin: 7pt 0; break-inside: avoid; }
.ej .tema { color: #64748b; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; }
.resp { color: #15803d; font-weight: 600; margin-top: 4pt; }
.katex { font-size: 1.08em; }
</style></head><body>
<h1>4. Recomendaciones de estudio</h1>
<p class="gris">${escapar(actividad.titulo)}${e.temas.length ? ` · Temas a repasar: ${e.temas.map(escapar).join(", ")}` : ""}</p>
<h2>Videos con ejercicios resueltos</h2>
<ul>${listaVideos.join("")}</ul>
${lecturas.length ? `<h2>Lecturas de referencia (OpenStax)</h2><ul>${lecturas.map((l) => `<li><a href="${escapar(l.url)}">${escapar(l.titulo)}</a><span class="fuente"> · ${escapar(l.fuente)}</span></li>`).join("")}</ul>` : ""}
<h2>Ejercicios para practicar en casa</h2>
<p class="gris">Resuélvelos y compara tu resultado con la respuesta. No incluye el procedimiento.</p>
${e.ejercicios
  .map(
    (x, i) =>
      `<div class="ej"><div class="tema">Ejercicio ${i + 1} · ${htmlConFormulas(x.tema)}</div><div>${htmlConFormulas(x.enunciado)}</div><div class="resp">Respuesta: ${htmlConFormulas(x.respuesta)}</div></div>`,
  )
  .join("")}
</body></html>`;
}

/**
 * PDF de la página de recomendaciones, guardado junto a la entrega para no volver a imprimirlo.
 * Devuelve undefined si no hay Chromium o falla la impresión.
 */
export async function pdfEstudio(actividad: Actividad, entrega: Entrega): Promise<Uint8Array | undefined> {
  if (!entrega.estudio) return undefined;
  const navegador = chromium();
  const katexDir = carpetaKatex();
  if (!navegador || !katexDir || /[\\/]|^\.\.?$/.test(entrega.matricula)) return undefined;
  const { videos, lecturas } = recursosParaTemas(actividad, entrega.estudio.temas);
  const huella = crypto.createHash("sha1").update(JSON.stringify([entrega.estudio, videos, lecturas, actividad.titulo])).digest("hex").slice(0, 12);
  const carpeta = `actividades/${actividad.id}/entregas/${entrega.matricula}`;
  const ruta = `${carpeta}/estudio-${huella}.pdf`;
  try {
    return new Uint8Array(leerArchivo(ruta));
  } catch {
    // aún no existe: se imprime
  }
  const css = fs.readFileSync(path.join(katexDir, "katex.min.css"), "utf8").replace(/url\(fonts\//g, `url(file://${katexDir}/fonts/`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "estudio-"));
  try {
    const html = path.join(tmp, "estudio.html");
    const salida = path.join(tmp, "estudio.pdf");
    fs.writeFileSync(html, htmlEstudio(actividad, entrega, css));
    await ejecutar(
      navegador,
      ["--headless", `--user-data-dir=${path.join(tmp, "perfil")}`, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-pdf-header-footer", "--allow-file-access-from-files", `--print-to-pdf=${salida}`, `file://${html}`],
      { timeout: 20_000 },
    );
    const pdf = fs.readFileSync(salida);
    // Borra versiones anteriores de esta página y guarda la nueva.
    try {
      for (const f of fs.readdirSync(rutaAbsoluta(carpeta))) if (/^estudio-.*\.pdf$/.test(f)) fs.rmSync(rutaAbsoluta(`${carpeta}/${f}`), { force: true });
    } catch {
      // la carpeta aún no existe
    }
    guardarArchivo(ruta, pdf);
    return new Uint8Array(pdf);
  } catch (e) {
    fallaChromium = Date.now();
    console.error("No se pudo imprimir la página de recomendaciones con Chromium", e);
    return undefined;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
