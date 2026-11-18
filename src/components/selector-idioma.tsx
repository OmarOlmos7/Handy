"use client";

import { useRef } from "react";
import { cambiarIdioma } from "@/app/acciones-idioma";
import { IDIOMAS, NOMBRE_IDIOMA, type Idioma } from "@/lib/i18n/idiomas";

/** Lista compacta de idiomas; al elegir uno se guarda y la página se vuelve a mostrar. */
export function SelectorIdioma({ actual, etiqueta, claro = false }: { actual: Idioma; etiqueta: string; claro?: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={cambiarIdioma} className="no-imprimir">
      <label className={`flex items-center gap-1.5 text-xs ${claro ? "text-white/80" : "text-slate-500"}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
        </svg>
        <span className="sr-only">{etiqueta}</span>
        <select
          name="idioma"
          defaultValue={actual}
          aria-label={etiqueta}
          onChange={() => form.current?.requestSubmit()}
          className="cursor-pointer rounded-md border-0 bg-transparent py-1 pr-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-tinta-300"
        >
          {IDIOMAS.map((i) => (
            <option key={i} value={i} lang={i}>
              {NOMBRE_IDIOMA[i]}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="text-xs underline">
          OK
        </button>
      </noscript>
    </form>
  );
}
