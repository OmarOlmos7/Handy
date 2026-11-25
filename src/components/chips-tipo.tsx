"use client";

// Chips de "Tipo de actividad" con su ícono ilustrativo. El chip de contenido (si se indica) va al
// final y convierte el alta en una actividad de contenido (material anexo e instrucciones).
import { esEtiquetaContenido, iconoTipoActividad } from "@/lib/iconos-tipo";

export function ChipsTipo({
  tipos,
  valor,
  onCambiar,
  contenido,
}: {
  tipos: string[];
  valor: string;
  onCambiar: (v: string) => void;
  /** Nombre del tipo "Contenido" en el idioma de la pantalla; sin valor, no se muestra. */
  contenido?: string;
}) {
  const lista = contenido ? [...tipos.filter((e) => !esEtiquetaContenido(e) && e.toLowerCase() !== contenido.toLowerCase()), contenido] : tipos;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {lista.map((e) => {
        const activo = valor.trim().toLowerCase() === e.toLowerCase();
        const esContenido = e === contenido;
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
