"use client";

import { useState } from "react";

/** Código del curso con botón para copiarlo: el profesor lo comparte con sus alumnos. */
export function CodigoCurso({ codigo, titulo, ayuda, copiar, copiado }: { codigo: string; titulo: string; ayuda: string; copiar: string; copiado: string }) {
  const [listo, setListo] = useState(false);
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200">
      <span className="text-sm text-slate-500">{titulo}</span>
      <span className="font-mono text-lg font-semibold tracking-wider text-tinta-700">{codigo}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(codigo).then(() => setListo(true), () => {});
        }}
        className="rounded-lg px-2 py-1 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50"
      >
        {listo ? copiado : copiar}
      </button>
      <span className="basis-full text-xs text-slate-500 sm:basis-auto">{ayuda}</span>
    </div>
  );
}
