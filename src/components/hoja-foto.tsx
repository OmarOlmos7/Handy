"use client";

// Foto real de la hoja del alumno con las correcciones, igual que el PDF corregido:
// sobre la hoja, un círculo relleno con el número de comentario y la paloma o el tache
// a un lado; en el margen derecho, los comentarios numerados a la misma altura.
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { useLayoutEffect, useRef } from "react";
import type { Actividad, Entrega } from "@/lib/tipos";
import { anotacionesNumeradas, puntosTexto } from "@/lib/elementos";
import { esCerrado, incisosCerrado } from "@/lib/calificar";
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
  const marcas = anotada
    ? numerarMarcas(entrega).filter(
        (m) => (m.res.ubicacion?.pagina ?? 1) === pagina,
      )
    : [];

  // Los comentarios empiezan en la parte superior del margen y bajan uno tras otro (como en el PDF).
  useLayoutEffect(() => {
    const caja = margen.current;
    const img = foto.current;
    if (!caja || !img) return;
    const acomodar = () => {
      const alto = img.clientHeight;
      let limite = 8;
      for (const el of Array.from(caja.children) as HTMLElement[]) {
        const top = limite;
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
        {marcas.map(({ res }) => {
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
              <Numero n={res.numero} completo={completo} />
              <span className="text-base font-bold leading-none drop-shadow-[0_0_2px_white]">
                {completo ? "✓" : "✗"}
              </span>
              {!completo && unicaIncorrecta(r, res.respuestaLeida) && (
                <span className="font-mano text-base font-bold leading-none drop-shadow-[0_0_2px_white]">{unicaIncorrecta(r, res.respuestaLeida)}</span>
              )}
            </span>
          );
        })}
        {/* Cerrados con varios renglones: paloma junto a cada respuesta correcta; tache y la letra correcta junto a cada incorrecta. */}
        {anotada &&
          entrega.resultados.flatMap((res) => {
            const r = actividad.reactivos.find((x) => x.numero === res.numero);
            if (!r || !esCerrado(r) || !res.ubicacionesIncisos?.length) return [];
            return incisosCerrado(r, res.respuestaLeida).flatMap((inc, j) => {
              const u = res.ubicacionesIncisos?.[j];
              if (!u || u.pagina !== pagina) return [];
              if (inc.palabra) {
                // Palabra elegida: paloma sobre la elegida si acertó; si no, tache sobre la correcta.
                const ux = inc.correcto ? u.x : (u.xCorrecta ?? u.x);
                const uy = inc.correcto ? u.y : (u.yCorrecta ?? u.y);
                return [
                  <span
                    key={`i${res.numero}.${j}`}
                    className={`absolute -translate-x-1/2 -translate-y-full text-sm font-bold leading-none drop-shadow-[0_0_2px_white] sm:text-base ${inc.correcto ? "text-acierto" : "text-error"}`}
                    style={{ left: `${Math.min(0.98, Math.max(0.01, ux)) * 100}%`, top: `${Math.min(0.98, Math.max(0.02, uy)) * 100}%` }}
                  >
                    {inc.correcto ? "✓" : "✗"}
                  </span>,
                ];
              }
              return [
                <span
                  key={`i${res.numero}.${j}`}
                  className={`absolute ml-0.5 flex -translate-y-1/2 items-center gap-0.5 font-bold leading-none drop-shadow-[0_0_2px_white] ${inc.correcto ? "text-acierto" : "text-error"}`}
                  style={{ left: `${Math.min(0.95, Math.max(0, u.x)) * 100}%`, top: `${Math.min(0.98, Math.max(0.02, u.y)) * 100}%` }}
                >
                  <span className="text-sm sm:text-base">{inc.correcto ? "✓" : "✗"}</span>
                  {!inc.correcto && <span className="font-mano text-sm sm:text-base">{inc.correcta}</span>}
                </span>,
              ];
            });
          })}
        {/* Sobre la hoja solo van los numerales; la descripción queda en el margen. */}
        {anotada &&
          entrega.resultados.flatMap((res) => {
            const r = actividad.reactivos.find((x) => x.numero === res.numero);
            if (!r) return [];
            return anotacionesNumeradas(actividad, r, res).flatMap((el) => {
              const s = el.subrayado;
              if (s) {
                // Estilo "subrayado": línea roja bajo el error y su numeral a la izquierda.
                if (s.pagina !== pagina) return [];
                return [
                  <span
                    key={`s${el.numeral}`}
                    title={el.nombre}
                    className="pointer-events-none absolute"
                    style={{ left: `${s.x0 * 100}%`, width: `${Math.max(0.02, s.x1 - s.x0) * 100}%`, top: `${s.y * 100}%` }}
                  >
                    <span className="block h-0 border-b-2 border-error/80" />
                    <span className="absolute bottom-0 right-full mr-0.5 rounded-full ring-2 ring-white">
                      <Etiqueta texto={el.numeral} ok={false} grande />
                    </span>
                  </span>,
                ];
              }
              const u = el.ubicacion;
              if (!u || u.pagina !== pagina) return [];
              const ok = el.ok;
              return [
                <span
                  key={`e${el.numeral}`}
                  title={el.nombre}
                  className={`absolute -translate-y-1/2 ring-2 ring-white rounded-full ${ok ? "text-acierto" : "text-error"}`}
                  style={{ left: `${Math.min(0.94, Math.max(0, u.x)) * 100}%`, top: `${Math.min(0.98, Math.max(0.02, u.y)) * 100}%` }}
                >
                  <Etiqueta texto={el.numeral} ok={ok} grande />
                </span>,
              ];
            });
          })}
      </div>
      {marcas.length > 0 && (
        <div
          ref={margen}
          className="relative w-[28%] border-l border-slate-300"
        >
          {marcas.map(({ res }) => {
            const r = actividad.reactivos.find((x) => x.numero === res.numero);
            if (!r) return null;
            const completo = res.puntosObtenidos >= r.puntos;
            const color = completo ? "text-acierto" : "text-error";
            return (
              <div
                key={res.numero}
                className="absolute inset-x-0 px-1.5 sm:px-2"
                style={{ top: 0 }}
              >
                <div className={`flex items-center gap-1 ${color}`}>
                  <Numero n={res.numero} completo={completo} />
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
                {anotacionesNumeradas(actividad, r, res).length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[10px] leading-tight text-slate-600 sm:text-[11px]">
                    {anotacionesNumeradas(actividad, r, res).map((el) => {
                      const ok = el.ok;
                      return (
                        <li key={el.numeral} className={`flex items-start gap-1 ${ok ? "text-acierto" : "text-error"}`}>
                          <span className="w-2.5 shrink-0 text-center font-bold">{ok ? "✓" : "✗"}</span>
                          <Etiqueta texto={el.numeral} ok={ok} />
                          <span>
                            {el.nombre}
                            {puntaje && el.puntos && ` ${puntosTexto(el.puntos.obtenidos)}/${puntosTexto(el.puntos.total)}`}
                          </span>
                        </li>
                      );
                    })}
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

/** Respuesta correcta de un cerrado de una sola respuesta (opción múltiple, V/F) mal contestado. */
function unicaIncorrecta(r: Actividad["reactivos"][number], leida: string) {
  if (!esCerrado(r)) return "";
  const lista = incisosCerrado(r, leida);
  return lista.length === 1 && !lista[0].correcto ? lista[0].correcta : "";
}

/** Numeral del elemento (1.1, 1.2…) en un círculo verde o rojo. */
function Etiqueta({ texto, ok, grande = false }: { texto: string; ok: boolean; grande?: boolean }) {
  const tam = grande ? "h-4 min-w-4 text-[9px] sm:h-5 sm:min-w-5 sm:text-[11px]" : "h-3.5 min-w-3.5 text-[8px] sm:h-4 sm:min-w-4 sm:text-[9px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full px-1 font-bold leading-none text-white ${tam} ${ok ? "bg-acierto" : "bg-error"}`}
    >
      {texto}
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
