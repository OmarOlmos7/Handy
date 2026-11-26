"use client";

// Chips de "Tipo de actividad" con su ícono ilustrativo. Los chips de contenido y de proyecto (si se
// indican) van al final: convierten el alta en una actividad de contenido (material anexo e
// instrucciones) o en un proyecto por etapas con varios evaluadores.
import { esEtiquetaContenido, esEtiquetaProyecto, iconoTipoActividad } from "@/lib/iconos-tipo";

export function ChipsTipo({
  tipos,
  valor,
  onCambiar,
  contenido,
  proyecto,
}: {
  tipos: string[];
  valor: string;
  onCambiar: (v: string) => void;
  /** Nombre del tipo "Contenido" en el idioma de la pantalla; sin valor, no se muestra. */
  contenido?: string;
  /** Nombre del tipo "Proyecto" (evaluación por etapas con varios profesores); sin valor, no se muestra. */
  proyecto?: string;
}) {
  const especiales = [contenido, proyecto].filter((x): x is string => !!x);
  const lista = [
    ...tipos.filter(
      (e) =>
        !(contenido && esEtiquetaContenido(e)) &&
        !(proyecto && esEtiquetaProyecto(e)) &&
        !especiales.some((x) => x.toLowerCase() === e.toLowerCase()),
    ),
    ...especiales,
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {lista.map((e) => {
        const activo = valor.trim().toLowerCase() === e.toLowerCase();
        const esContenido = e === contenido || e === proyecto;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(activo ? "" : e)}
            className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2 text-xs font-medium transition ${
              activo
                ? "bg-slate-800 text-white"
                : esContenido
                  ? "bg-tinta-50 text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full text-[13px] leading-none ${activo ? "bg-white/15" : "bg-white shadow-sm"}`}>
              {iconoTipoActividad(e)}
            </span>
            {e}
          </button>
        );
      })}
    </div>
  );
}
