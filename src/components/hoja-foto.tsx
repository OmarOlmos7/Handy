"use client";

// Foto real de la hoja del alumno con las correcciones (palomas, taches, puntos y
// comentarios en rojo) en un margen a la derecha, a la altura que indicó la IA.
// Igual que el PDF corregido: las marcas nunca tapan lo que escribió el alumno.
import { useLayoutEffect, useRef } from "react";
import type { Actividad, Entrega } from "@/lib/tipos";

export function HojaFoto({
  actividad,
  entrega,
  pagina,
  anotada = true,
  modoProfesor = false,
}: {
  actividad: Actividad;
  entrega: Entrega;
  pagina: number;
  anotada?: boolean;
  modoProfesor?: boolean;
}) {
  const margen = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLImageElement>(null);
  const ruta = entrega.imagenes?.[pagina - 1];
  const marcas = (anotada ? entrega.resultados.filter((r) => (r.ubicacion?.pagina ?? 1) === pagina) : [])
    .slice()
    .sort((a, b) => (a.ubicacion?.y ?? 0.5) - (b.ubicacion?.y ?? 0.5));

  // Si dos reactivos quedan muy juntos, baja el siguiente para que no se encimen.
  useLayoutEffect(() => {
    const caja = margen.current;
    const img = foto.current;
    if (!caja || !img) return;
    const acomodar = () => {
      const alto = img.clientHeight;
      let limite = 0;
      for (const el of Array.from(caja.children) as HTMLElement[]) {
        const deseado = Number(el.dataset.y) * alto;
        const top = Math.max(deseado - 12, limite);
        el.style.top = `${top}px`;
        limite = top + el.offsetHeight + 6;
      }
      // Si los comentarios no caben junto a la foto, el margen crece hacia abajo.
      caja.style.minHeight = limite > alto ? `${limite}px` : "";
    };
    acomodar();
    const obs = new ResizeObserver(acomodar);
    obs.observe(img);
    return () => obs.disconnect();
  }, [entrega, pagina, anotada]);

  if (!ruta) return null;
  return (
    <div className="flex overflow-hidden rounded-md bg-white shadow-md ring-1 ring-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={foto}
        src={`/api/archivos/${ruta}`}
        alt={`Página ${pagina} de la entrega`}
        className={`block h-auto self-start ${marcas.length ? "w-[72%]" : "w-full"}`}
      />
      {marcas.length > 0 && (
        <div ref={margen} className="relative w-[28%] border-l border-error/30">
          {marcas.map((res) => {
            const r = actividad.reactivos.find((x) => x.numero === res.numero);
            if (!r) return null;
            const completo = res.puntosObtenidos >= r.puntos;
            const color = completo ? "text-acierto" : "text-error";
            return (
              <div
                key={res.numero}
                data-y={Math.min(0.98, Math.max(0.02, res.ubicacion?.y ?? 0.5))}
                className="absolute inset-x-0 px-1.5 sm:px-2"
                style={{ top: `${(res.ubicacion?.y ?? 0.5) * 100}%` }}
              >
                <div className={`flex items-center gap-1.5 ${color}`}>
                  <span className="text-xl font-bold leading-none sm:text-2xl">{completo ? "✓" : "✗"}</span>
                  <span className="font-mano text-sm leading-none sm:text-base">
                    {res.numero}. {res.puntosObtenidos}/{r.puntos}
                  </span>
                  {modoProfesor && res.confianza === "baja" && (
                    <span className="rounded bg-aviso px-1 text-[10px] font-semibold text-white">Revisar</span>
                  )}
                </div>
                {!completo && res.comentario && (
                  <p className="font-mano mt-0.5 text-xs leading-tight text-error sm:text-sm">{res.comentario}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
