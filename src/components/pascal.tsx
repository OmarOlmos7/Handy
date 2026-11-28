"use client";

// Pascal, el golden retriever compañero de estudio, asomándose sobre la línea donde habla. Las
// nueve poses vienen de su hoja de personaje; se cargan todas y se cambia de una a otra con un
// fundido. Al hacerle clic, ladra.
import { POSES_PASCAL, imagenPascal, type GestoPascal } from "@/lib/pascal";

export function Pascal({ gesto, guau, etiqueta, onLadrar, className = "" }: { gesto: GestoPascal; guau: string; etiqueta: string; onLadrar: () => void; className?: string }) {
  const visible = gesto === "ladra" ? "alegre" : gesto;
  return (
    <button type="button" onClick={onLadrar} aria-label={etiqueta} title={etiqueta} className={`pascal group relative block cursor-pointer select-none ${className}`}>
      <span className={`pascal-cuerpo absolute inset-0 block ${gesto === "ladra" ? "pascal-ladra" : ""}`}>
        {POSES_PASCAL.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element -- gráficas pequeñas ya optimizadas (webp)
          <img
            key={p}
            src={imagenPascal(p)}
            alt=""
            draggable={false}
            className={`absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-300 ${p === visible ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </span>
      {gesto === "ladra" && (
        <span aria-hidden className="pascal-guau absolute -top-1 right-0 rounded-full bg-amber-400 px-2 py-0.5 text-sm font-extrabold text-slate-900 shadow">
          {guau}
        </span>
      )}
    </button>
  );
}
