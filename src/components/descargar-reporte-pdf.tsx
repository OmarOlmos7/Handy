"use client";

import { useState } from "react";
import { descargar } from "@/lib/exportar";
import { pdfReporteAnaliticas } from "@/lib/pdf-reporte";
import type { ReporteAnaliticas } from "@/lib/reporte-analiticas";
import { Boton } from "./ui";

/** Genera en el navegador el reporte de analíticas en PDF (hoja carta) y lo descarga. */
export function DescargarReportePdf({
  reporte,
  archivo,
  variante = "primario",
}: {
  reporte: ReporteAnaliticas;
  archivo: string;
  variante?: "primario" | "secundario";
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  async function bajar() {
    setGenerando(true);
    setError("");
    try {
      const logo = await fetch("/logo.png")
        .then((r) => (r.ok ? r.arrayBuffer() : undefined))
        .catch(() => undefined);
      descargar(await pdfReporteAnaliticas(reporte, logo), `${archivo}.pdf`);
    } catch {
      setError("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <Boton type="button" variante={variante} onClick={bajar} disabled={generando}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
          <path d="M10 3v10m0 0-4-4m4 4 4-4M4 15v2h12v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {generando ? "Generando…" : "Descargar reporte PDF"}
      </Boton>
      {error && <span className="mt-1 text-xs text-error">{error}</span>}
    </span>
  );
}
