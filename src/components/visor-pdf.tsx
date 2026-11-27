"use client";

// Dibuja un PDF página por página con pdf.js, en el navegador. Se usa para la vista con formato
// original de Word, Excel y PowerPoint: a diferencia de un <iframe>, también funciona en los
// celulares Android (cuyo navegador no muestra PDF incrustados). Las páginas se dibujan al
// acercarse a la pantalla, para que los documentos largos no tarden en abrir.
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Pdfjs = typeof import("pdfjs-dist");
let cargaPdfjs: Promise<Pdfjs> | undefined;

/** pdf.js se descarga solo la primera vez que se abre una vista (no pesa en las demás páginas). */
function pdfjs() {
  cargaPdfjs ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
    const lib = m as unknown as Pdfjs;
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    return lib;
  });
  return cargaPdfjs;
}

function Pagina({ documento, numero, ancho }: { documento: PDFDocumentProxy; numero: number; ancho: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(numero <= 2);
  const [proporcion, setProporcion] = useState(1.294);
  // Ancho en pantalla: el del contenedor, sin agrandar una página chica (p. ej. una hoja de Excel
  // de pocas celdas) más allá de 1.6 veces su tamaño real.
  const [anchoPagina, setAnchoPagina] = useState<number>();

  useEffect(() => {
    const el = lienzo.current;
    if (!el || visible) return;
    const observador = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "600px 0px" });
    observador.observe(el);
    return () => observador.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !ancho) return;
    let tarea: { cancel: () => void; promise: Promise<void> } | undefined;
    let vigente = true;
    documento.getPage(numero).then((pagina) => {
      if (!vigente || !lienzo.current) return;
      const base = pagina.getViewport({ scale: 1 });
      setProporcion(base.height / base.width);
      const enPantalla = Math.min(ancho, base.width * 1.6);
      setAnchoPagina(enPantalla);
      // Nitidez de pantalla (hasta 2×) sin pasarse de memoria en hojas de Excel muy grandes.
      const escala = Math.min((enPantalla / base.width) * Math.min(window.devicePixelRatio || 1, 2), 4000 / Math.max(base.width, base.height));
      const vista = pagina.getViewport({ scale: escala });
      const c = lienzo.current;
      c.width = Math.floor(vista.width);
      c.height = Math.floor(vista.height);
      tarea = pagina.render({ canvas: c, viewport: vista });
      tarea.promise.catch(() => {});
    });
    return () => {
      vigente = false;
      tarea?.cancel();
    };
  }, [documento, numero, ancho, visible]);

  return (
    <canvas
      ref={lienzo}
      aria-label={`${numero}`}
      className="mx-auto block w-full bg-white shadow-sm ring-1 ring-slate-200"
      style={{ aspectRatio: `1 / ${proporcion}`, maxWidth: anchoPagina }}
    />
  );
}

/** PDF (como Blob) dibujado a lo ancho del contenedor; `onError` si pdf.js no puede abrirlo. */
export function VisorPdf({ datos, titulo, onError }: { datos: Blob; titulo: string; onError: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const [documento, setDocumento] = useState<PDFDocumentProxy | null>(null);
  const [ancho, setAncho] = useState(0);
  const avisarError = useRef(onError);
  useEffect(() => {
    avisarError.current = onError;
  }, [onError]);

  useEffect(() => {
    let vigente = true;
    let carga: ReturnType<Pdfjs["getDocument"]> | undefined;
    (async () => {
      const lib = await pdfjs();
      const bytes = new Uint8Array(await datos.arrayBuffer());
      if (!vigente) return;
      carga = lib.getDocument({ data: bytes });
      const abierto = await carga.promise;
      if (vigente) setDocumento(abierto);
    })().catch(() => vigente && avisarError.current());
    return () => {
      vigente = false;
      void carga?.destroy();
    };
  }, [datos]);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(Math.min(el.clientWidth - 24, 1100));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={caja} role="document" aria-label={titulo} className="max-h-[70vh] overflow-auto bg-slate-100 p-3">
      {documento ? (
        <div className="mx-auto space-y-3" style={{ maxWidth: ancho || undefined }}>
          {Array.from({ length: documento.numPages }, (_, i) => (
            <Pagina key={i} documento={documento} numero={i + 1} ancho={ancho} />
          ))}
        </div>
      ) : (
        <div className="h-[40vh]" />
      )}
    </div>
  );
}
