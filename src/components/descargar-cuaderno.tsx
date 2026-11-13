"use client";

import { useEffect, useRef, useState } from "react";
import type { Cuaderno, Orden } from "@/lib/cuaderno";
import { descargar } from "@/lib/exportar";
import { excelCuaderno, nombreArchivoCuaderno, pdfCuaderno, tablaExportable, type InfoCuaderno } from "@/lib/exportar-cuaderno";

type Formato = "excel" | "pdf";

/** Botón "Descargar" con menú para bajar el cuaderno en Excel o PDF, en el orden elegido. */
export function DescargarCuaderno({ cuaderno, orden, info }: { cuaderno: Cuaderno; orden: Orden; info: InfoCuaderno }) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState<Formato | null>(null);
  const [error, setError] = useState("");
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [abierto]);

  async function bajar(formato: Formato) {
    setAbierto(false);
    setError("");
    setGenerando(formato);
    try {
      const tabla = tablaExportable(cuaderno, orden);
      const nombre = nombreArchivoCuaderno(info);
      if (formato === "excel") descargar(await excelCuaderno(tabla, info), `${nombre}.xlsx`);
      else descargar(await pdfCuaderno(tabla, info), `${nombre}.pdf`);
    } catch {
      setError("No se pudo generar el archivo. Intenta de nuevo.");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div ref={caja} className="relative flex flex-col items-end">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        disabled={generando !== null}
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex items-center gap-2 rounded-lg bg-tinta-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-tinta-700 disabled:opacity-60"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
          <path d="M10 3v10m0 0-4-4m4 4 4-4M4 15v2h12v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {generando ? "Generando…" : "Descargar cuaderno"}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-80" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => bajar("excel")}
            className="flex w-full flex-col px-3.5 py-2 text-left hover:bg-slate-50"
          >
            <span className="font-medium text-slate-800">Excel (.xlsx)</span>
            <span className="text-xs text-slate-500">Con colores y números listos para editar</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => bajar("pdf")}
            className="flex w-full flex-col px-3.5 py-2 text-left hover:bg-slate-50"
          >
            <span className="font-medium text-slate-800">PDF</span>
            <span className="text-xs text-slate-500">Hoja carta horizontal para imprimir o compartir</span>
          </button>
        </div>
      )}
      {error && <span className="mt-1 text-xs text-error">{error}</span>}
    </div>
  );
}
