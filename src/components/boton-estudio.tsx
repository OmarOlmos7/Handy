"use client";

import { useState, useTransition } from "react";
import { generarRecomendaciones } from "@/app/acciones-retro";
import { useTextos } from "./proveedor-textos";

/** Genera (o vuelve a generar) las recomendaciones de estudio del alumno. */
export function BotonEstudio({ actividadId, matricula, hay }: { actividadId: string; matricula: string; hay: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const tb = useTextos().t.profesor.botones;
  const [error, setError] = useState(false);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-error">{tb.noSeGeneraron}</span>}
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
        {pendiente ? tb.generando : hay ? tb.volverGenerar : tb.generarRecomendaciones}
      </button>
    </span>
  );
}
