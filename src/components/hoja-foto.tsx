"use client";

// Foto real de la hoja del alumno con las correcciones, igual que el PDF corregido:
// sobre la hoja, un círculo relleno con el número de comentario y la paloma o el tache
// a un lado; en el margen derecho, los comentarios numerados a la misma altura.
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { useLayoutEffect, useRef } from "react";
import type { Actividad, Entrega } from "@/lib/tipos";
import { puntosPorElemento, puntosTexto } from "@/lib/elementos";
import { conPuntaje } from "@/lib/modalidad";

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
  const th = useTextos().t.profesor.hojaAlumno;
  const margen = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLImageElement>(null);
  const ruta = entrega.imagenes?.[pagina - 1];
  const puntaje = conPuntaje(actividad);
  // Estilo "subrayado": fragmentos a corregir subrayados con su comentario encima.
  const subrayados = anotada ? entrega.resultados.flatMap((res) => (res.subrayados ?? []).filter((s) => s.pagina === pagina)) : [];
  const marcas = anotada
    ? numerarMarcas(entrega).filter(
        (m) => (m.res.ubicacion?.pagina ?? 1) === pagina,
      )
    : [];

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
      <div
        className={`relative self-start ${marcas.length ? "w-[72%]" : "w-full"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={foto}
          src={`/api/archivos/${ruta}`}
          alt={formato(th.fotoAlt, { p: pagina })}
          className="block h-auto w-full"
        />
        {marcas.map(({ res, numero }) => {
          const r = actividad.reactivos.find((x) => x.numero === res.numero);
          if (!r) return null;
          const completo = res.puntosObtenidos >= r.puntos;
          const x = Math.min(0.94, Math.max(0.02, res.ubicacion?.x ?? 0.9));
          const y = Math.min(0.98, Math.max(0.02, res.ubicacion?.y ?? 0.5));
          return (
            <span
              key={res.numero}
              className={`absolute ml-2 flex -translate-y-1/2 items-center gap-0.5 ${completo ? "text-acierto" : "text-error"}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            >
              <Numero n={numero} completo={completo} />
              <span className="text-base font-bold leading-none drop-shadow-[0_0_2px_white]">
                {completo ? "✓" : "✗"}
              </span>
            </span>
          );
        })}
        {subrayados.map((s, i) => (
          <span
            key={`s${i}`}
            className="pointer-events-none absolute"
            style={{ left: `${s.x0 * 100}%`, width: `${Math.max(0.02, s.x1 - s.x0) * 100}%`, top: `${s.y * 100}%` }}
          >
            <span className="block h-0 border-b-2 border-error/80" />
            <span className="font-mano absolute bottom-full left-0 mb-3 whitespace-nowrap rounded bg-white/85 px-1 text-[11px] leading-tight text-error sm:text-xs">
              {s.comentario}
            </span>
          </span>
        ))}
      </div>
      {marcas.length > 0 && (
        <div
          ref={margen}
          className="relative w-[28%] border-l border-slate-300"
        >
          {marcas.map(({ res, numero }) => {
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
                <div className={`flex items-center gap-1 ${color}`}>
                  <Numero n={numero} completo={completo} />
                  <span className="text-base font-bold leading-none">
                    {completo ? "✓" : "✗"}
                  </span>
                  <span className="text-xs font-semibold leading-none sm:text-sm">
                    {formato(th.reactivo, { n: res.numero })}
                    {puntaje && ` · ${puntosTexto(res.puntosObtenidos)}/${puntosTexto(r.puntos)}`}
                  </span>
                  {modoProfesor && res.confianza === "baja" && (
                    <span className="rounded bg-aviso px-1 text-[10px] font-semibold text-white">
                      {th.revisar}
                    </span>
                  )}
                </div>
                {res.comentario && (
                  <p
                    className={`font-mano mt-0.5 text-xs leading-tight sm:text-sm ${color}`}
                  >
                    {res.comentario}
                  </p>
                )}
                {puntosPorElemento(actividad, r, res).length > 0 && (
                  <ul className="mt-0.5 text-[10px] leading-tight text-slate-600 sm:text-[11px]">
                    {puntosPorElemento(actividad, r, res).map((el) => (
                      <li key={el.nombre} className={el.obtenidos >= el.total ? "text-acierto" : "text-error"}>
                        {el.obtenidos >= el.total ? "✓" : "✗"} {el.nombre}
                        {puntaje && ` ${puntosTexto(el.obtenidos)}/${puntosTexto(el.total)}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Numero({ n, completo }: { n: number; completo: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none text-white ring-2 ring-white ${completo ? "bg-acierto" : "bg-error"}`}
    >
      {n}
    </span>
  );
}

/** Números de comentario en orden de lectura: página, luego de arriba abajo, luego de izquierda a derecha. */
export function numerarMarcas(entrega: Entrega) {
  return entrega.resultados
    .slice()
    .sort(
      (a, b) =>
        (a.ubicacion?.pagina ?? 1) - (b.ubicacion?.pagina ?? 1) ||
        (a.ubicacion?.y ?? 0.5) - (b.ubicacion?.y ?? 0.5) ||
        (a.ubicacion?.x ?? 0.9) - (b.ubicacion?.x ?? 0.9),
    )
    .map((res, i) => ({ res, numero: i + 1 }));
}

/** Hojas corregidas ya archivadas en el PDF (las fotos se borraron). */
export function HojasArchivadas({ actividadId, matricula }: { actividadId: string; matricula: string }) {
  const th = useTextos().t.profesor.hojaAlumno;
  const url = `/api/pdf/${actividadId}/${encodeURIComponent(matricula)}?hojas=1`;
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <iframe src={`${url}#view=FitH`} title={th.hojasCorregidas} className="h-[80vh] w-full" />
      <a
        href={url}
        target="_blank"
        className="block border-t border-slate-100 px-4 py-2 text-center text-xs font-medium text-tinta-700 hover:bg-slate-50"
      >
        {th.abrirHojas}
      </a>
    </div>
  );
}
