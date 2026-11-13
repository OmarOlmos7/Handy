"use client";

import { useEffect, useRef, useState } from "react";
import { ETIQUETAS } from "@/lib/colores";

/** Etiqueta de la actividad (Tarea, Quiz…); al tocarla se elige otra o se escribe una propia. */
export function SelectorEtiqueta({
  valor,
  sugeridas,
  onElegir,
  disabled,
}: {
  valor?: string;
  /** Etiquetas propias que el profesor ya usa en el curso, además de las de siempre. */
  sugeridas: string[];
  onElegir: (etiqueta: string) => void;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [propia, setPropia] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const opciones = [...new Set([...ETIQUETAS, ...sugeridas])];

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

  const elegir = (e: string) => {
    setAbierto(false);
    setPropia("");
    onElegir(e);
  };

  return (
    <div ref={caja} className={`relative ${abierto ? "z-40" : "z-20"}`}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={abierto}
        title="Cambiar etiqueta"
        onClick={() => setAbierto((a) => !a)}
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-40 ${
          valor ? "bg-slate-800 text-white hover:bg-slate-700" : "border border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
        }`}
      >
        {valor || "+ Etiqueta"}
      </button>
      {abierto && (
        <div className="absolute right-0 top-8 w-52 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
          <ul className="max-h-56 overflow-y-auto">
            {opciones.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => elegir(o)}
                  className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 ${o === valor ? "font-semibold text-tinta-700" : "text-slate-700"}`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-1 flex gap-1 border-t border-slate-100 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (propia.trim()) elegir(propia);
            }}
          >
            <input
              value={propia}
              onChange={(e) => setPropia(e.target.value)}
              maxLength={30}
              placeholder="Otra…"
              aria-label="Escribe otra etiqueta"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-tinta-500"
            />
            <button type="submit" className="rounded-md bg-tinta-600 px-2 text-xs font-medium text-white disabled:opacity-40" disabled={!propia.trim()}>
              Usar
            </button>
          </form>
          {valor && (
            <button type="button" onClick={() => elegir("")} className="mt-1 w-full rounded-md py-1 text-xs text-slate-500 hover:bg-slate-100">
              Quitar etiqueta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
