"use client";

import { useState, useTransition } from "react";
import { generarRecomendaciones } from "@/app/acciones-retro";

/** Genera (o vuelve a generar) las recomendaciones de estudio del alumno. */
export function BotonEstudio({ actividadId, matricula, hay }: { actividadId: string; matricula: string; hay: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState(false);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-error">No se pudieron generar. Intenta de nuevo.</span>}
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await generarRecomendaciones(actividadId, matricula);
            setError(!r.ok);
          })
        }
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50 disabled:opacity-50"
      >
        {pendiente ? "Generando…" : hay ? "Volver a generar" : "Generar recomendaciones"}
      </button>
    </span>
  );
}
