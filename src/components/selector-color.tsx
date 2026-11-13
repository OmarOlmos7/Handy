"use client";

import { useEffect, useRef, useState } from "react";
import { COLORES, colorDe } from "@/lib/colores";

/** Círculo de color que abre la paleta para elegir otro (o quitarlo). */
export function SelectorColor({
  valor,
  etiqueta,
  onElegir,
  disabled,
}: {
  valor?: string;
  etiqueta: string;
  onElegir: (clave: string) => void;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const actual = colorDe(valor);

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

  return (
    <div ref={caja} className={`relative ${abierto ? "z-40" : "z-20"}`}>
      <button
        type="button"
        title={etiqueta}
        aria-label={etiqueta}
        aria-expanded={abierto}
        disabled={disabled}
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-slate-100 disabled:opacity-40"
      >
        <span
          className={`block h-[18px] w-[18px] rounded-full ${actual ? actual.punto : "border-2 border-dashed border-slate-400"}`}
        />
      </button>
      {abierto && (
        <div
          role="listbox"
          aria-label="Colores"
          className="absolute bottom-11 right-0 w-48 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200"
        >
          <div className="grid grid-cols-4 gap-2">
            {COLORES.map((c) => (
              <button
                key={c.clave}
                type="button"
                role="option"
                aria-selected={c.clave === valor}
                title={c.nombre}
                aria-label={c.nombre}
                onClick={() => {
                  setAbierto(false);
                  onElegir(c.clave);
                }}
                className={`h-8 w-8 rounded-full ${c.punto} ${c.clave === valor ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"} transition`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onElegir("");
            }}
            className="mt-2 w-full rounded-md py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            Sin color
          </button>
        </div>
      )}
    </div>
  );
}
