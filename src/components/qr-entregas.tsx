"use client";

import { useCallback, useEffect, useState } from "react";
import { Tarjeta } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

/**
 * Tarjeta con el QR de entrega. El botón "Proyectar" lo muestra en pantalla completa
 * (título, QR grande e instrucción) para el proyector del salón; cualquier tecla o clic regresa.
 */
export function QrEntregas({ qr, enlace, titulo, suspendidas = false }: { qr: string; enlace: string; titulo: string; suspendidas?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const { t } = useTextos();
  const tq = t.profesor.qr;

  const cerrar = useCallback(() => {
    setAbierto(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      e.preventDefault();
      cerrar();
    };
    // Si el navegador sale de pantalla completa (por ejemplo, con Esc), también se cierra.
    const cambio = () => {
      if (!document.fullscreenElement) setAbierto(false);
    };
    window.addEventListener("keydown", tecla);
    document.addEventListener("fullscreenchange", cambio);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.removeEventListener("fullscreenchange", cambio);
    };
  }, [abierto, cerrar]);

  function proyectar() {
    setAbierto(true);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <>
      <Tarjeta className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={proyectar}
          disabled={suspendidas}
          title={suspendidas ? t.profesor.entregas.suspendidasTexto : tq.pantallaCompletaTitulo}
          className="group relative shrink-0 rounded-lg ring-tinta-200 transition enabled:hover:ring-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={tq.alt} className={`h-24 w-24 ${suspendidas ? "opacity-20 grayscale" : ""}`} />
          {suspendidas ? (
            <span className="absolute inset-0 flex items-center justify-center text-center text-xs font-bold uppercase text-error">
              {t.profesor.entregas.suspendidasInsignia}
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/70 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {tq.proyectar}
            </span>
          )}
        </button>
        <div className="min-w-0 text-sm">
          <p className="font-medium">{tq.titulo}</p>
          <p className="text-slate-500">{tq.texto}</p>
          <a href={enlace} target="_blank" className="block truncate text-tinta-700 hover:underline">
            {enlace}
          </a>
          <button
            type="button"
            onClick={proyectar}
            disabled={suspendidas}
            className="mt-2 inline-flex disabled:cursor-not-allowed disabled:opacity-40 items-center gap-1.5 rounded-lg bg-tinta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-tinta-700"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
            {tq.pantallaCompleta}
          </button>
        </div>
      </Tarjeta>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={formato(tq.dialogo, { titulo })}
          onClick={cerrar}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-[3vh] bg-white p-[4vh] text-center"
        >
          <h2 className="max-w-[90vw] text-[clamp(1.75rem,5vh,4rem)] font-bold leading-tight tracking-tight text-slate-900">{titulo}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={tq.alt} className="aspect-square h-[62vh] max-w-[90vw] [image-rendering:pixelated]" />
          <p className="text-[clamp(1.5rem,4.5vh,3.5rem)] font-semibold text-tinta-700">{tq.captura}</p>
          <p className="text-sm text-slate-400">{tq.regresar}</p>
        </div>
      )}
    </>
  );
}
