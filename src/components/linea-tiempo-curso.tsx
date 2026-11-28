// Línea de tiempo del curso: las unidades del temario repartidas entre el inicio y el término del
// curso. Cada unidad es una tarjeta con su número en un bloque de color (oscuro si ya debió
// cubrirse, claro si sigue en fila) y su ícono y nombre en blanco, unidas por flechas.
import Link from "next/link";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import type { IconoUnidad, UnidadEnTiempo } from "@/lib/linea-tiempo";
import { colorProgreso, colorUnidad } from "@/lib/mapa-temario";
import { AjustesCurso } from "./asesorias";
import { fechaLarga } from "./ui";

const trazo = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "h-8 w-8",
};

/** Íconos de línea para las unidades (cada uno con pocas formas, para leerse a 32 px). */
function IconoDeUnidad({ icono }: { icono: IconoUnidad }) {
  switch (icono) {
    case "regla":
      return (
        <svg {...trazo}>
          <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
          <path d="M6 8v3M9.5 8v4.5M13 8v3M16.5 8v4.5M20 8v3" />
        </svg>
      );
    case "movimiento":
      return (
        <svg {...trazo}>
          <circle cx="17" cy="12" r="3.5" />
          <path d="M2.5 9h7M4.5 12h6M2.5 15h7" />
        </svg>
      );
    case "fuerza":
      return (
        <svg {...trazo}>
          <rect x="3" y="9" width="8" height="8" rx="1" />
          <path d="M11 13h9M17 10l3 3-3 3M2 20h20" />
        </svg>
      );
    case "energia":
      return (
        <svg {...trazo}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
        </svg>
      );
    case "termometro":
      return (
        <svg {...trazo}>
          <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
          <path d="M12 9v8M16.5 6h2.5M16.5 9h2" />
        </svg>
      );
    case "iman":
      return (
        <svg {...trazo}>
          <path d="M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0Z" />
          <path d="M5 8h4M15 8h4" />
        </svg>
      );
    case "onda":
      return (
        <svg {...trazo}>
          <path d="M2 12c2-5 4-5 5 0s3 5 5 0 3-5 5 0 3 5 5 0" />
        </svg>
      );
    case "luz":
      return (
        <svg {...trazo}>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
        </svg>
      );
    case "atomo":
      return (
        <svg {...trazo}>
          <circle cx="12" cy="12" r="1.6" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" />
        </svg>
      );
    case "matraz":
      return (
        <svg {...trazo}>
          <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
          <path d="M7 15h10" />
        </svg>
      );
    case "funcion":
      return (
        <svg {...trazo}>
          <path d="M3 12h4M5 10v4" />
          <path d="M15 4c-2 0-2.5 1.5-3 4l-1.5 8c-.5 2.5-1 4-3 4M10 10h5M16 12l5 6M21 12l-5 6" />
        </svg>
      );
    case "grafica":
      return (
        <svg {...trazo}>
          <path d="M3 3v18h18" />
          <path d="M7 16v-3M11.5 16v-6M16 16v-4M20 16V8" />
          <path d="m7 10 4.5-4 4.5 3 4-4" />
        </svg>
      );
    case "triangulo":
      return (
        <svg {...trazo}>
          <path d="M3 20h18L3 4Z" />
          <path d="M3 15a5 5 0 0 1 5 5M8 13h3" />
        </svg>
      );
    case "hoja":
      return (
        <svg {...trazo}>
          <path d="M5 19C5 10 10 4 20 4c0 10-6 15-15 15Z" />
          <path d="M5 19 14 10" />
        </svg>
      );
    case "reloj":
      return (
        <svg {...trazo}>
          <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />
        </svg>
      );
    case "globo":
      return (
        <svg {...trazo}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z" />
        </svg>
      );
    case "codigo":
      return (
        <svg {...trazo}>
          <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
        </svg>
      );
    case "libro":
      return (
        <svg {...trazo}>
          <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5Z" />
          <path d="M12 6v14" />
        </svg>
      );
  }
}

export interface UnidadLinea extends UnidadEnTiempo {
  icono: IconoUnidad;
  /** Avance del grupo en la unidad (0 a 100); null si no tiene actividades ligadas. */
  avance: number | null;
}

export function LineaTiempoCurso({
  grupoId,
  inicio,
  fin,
  unidades,
  transcurrido,
  hoy,
  hayTemario,
  t,
  locale,
}: {
  grupoId: string;
  inicio?: string;
  fin?: string;
  /** null si faltan las fechas del curso. */
  unidades: UnidadLinea[] | null;
  /** % del curso transcurrido. */
  transcurrido: number | null;
  hoy: string;
  hayTemario: boolean;
  t: Diccionario;
  locale: string;
}) {
  const tl = t.marco.lineaTiempo;
  const corta = (iso: string) => fechaLarga(iso, locale);

  return (
    <section aria-labelledby="linea-tiempo" className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <h2 id="linea-tiempo" className="text-base font-semibold text-slate-900">
            {tl.titulo}
          </h2>
          {unidades && inicio && fin && <p className="text-sm text-slate-500">{formato(tl.subtitulo, { inicio: corta(inicio), fin: corta(fin) })}</p>}
        </div>
        <div className="flex items-center gap-2">
          {transcurrido !== null && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{formato(tl.transcurrido, { p: transcurrido })}</span>
          )}
          {hayTemario && (
            <Link href={`/profesor/grupos/${grupoId}/avance`} className="text-xs font-medium text-tinta-700 hover:underline">
              {tl.verAvance} →
            </Link>
          )}
          <AjustesCurso grupoId={grupoId} inicio={inicio} fin={fin} />
        </div>
      </div>

      {!hayTemario ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {tl.sinTemario}{" "}
          <Link href="/profesor/asignaturas" className="font-medium text-tinta-700 hover:underline">
            {tl.irAsignaturas} →
          </Link>
        </p>
      ) : !unidades ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">⚙️ {tl.sinFechas}</p>
      ) : (
        <>
          {/* Barra del periodo: un tramo por unidad y la marca de hoy. */}
          <div className="relative mb-5">
            <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-slate-200">
              {unidades.map((u) => {
                const c = colorUnidad(u.indice);
                return (
                  <span
                    key={u.indice}
                    title={`${formato(tl.unidad, { n: u.indice + 1 })} · ${corta(u.desde)} – ${corta(u.hasta)}`}
                    className="h-full flex-1 border-r border-white last:border-r-0"
                    style={{ background: u.estado === "pendiente" ? c.fondo : u.estado === "en_curso" ? c.borde : c.nodo }}
                  />
                );
              })}
            </div>
            {transcurrido !== null && transcurrido > 0 && transcurrido < 100 && (
              <span className="absolute -top-1.5 flex -translate-x-1/2 flex-col items-center" style={{ left: `${transcurrido}%` }}>
                <span className="h-6 w-0.5 rounded bg-slate-900" />
                <span className="mt-0.5 rounded bg-slate-900 px-1.5 text-[10px] font-semibold text-white">{corta(hoy)}</span>
              </span>
            )}
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>{inicio && corta(inicio)}</span>
              <span>{fin && corta(fin)}</span>
            </div>
          </div>

          {/* Tarjetas de las unidades, en orden, unidas por flechas. */}
          <ol className="grid overflow-x-clip p-1 gap-x-9 gap-y-4 [grid-template-columns:repeat(auto-fill,minmax(14.5rem,1fr))]">
            {unidades.map((u, i) => {
              const c = colorUnidad(u.indice);
              const bloque = u.estado === "pendiente" ? c.fondo : u.estado === "en_curso" ? c.borde : c.nodo;
              const textoBloque = u.estado === "pendiente" ? c.nodo : "#ffffff";
              const estado = u.estado === "cubierta" ? tl.cubierta : u.estado === "en_curso" ? tl.enCurso : tl.pendiente;
              return (
                <li key={u.indice} className="relative">
                  <div
                    className={`flex h-full min-h-[6.5rem] overflow-hidden rounded-2xl shadow-sm ring-1 ${u.estado === "en_curso" ? "ring-2 ring-slate-900" : "ring-slate-200"}`}
                    style={{ background: bloque }}
                  >
                    <span className="flex w-12 shrink-0 items-center justify-center text-3xl font-light" style={{ color: textoBloque }} aria-hidden>
                      {u.indice + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-l-2xl bg-white px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span style={{ color: u.estado === "pendiente" ? c.borde : c.nodo }}>
                          <IconoDeUnidad icono={u.icono} />
                        </span>
                        <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: u.estado === "pendiente" ? "#f1f5f9" : c.fondo, color: u.estado === "pendiente" ? "#64748b" : c.nodo }}>
                          {estado}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900" title={u.nombre}>
                        <span className="sr-only">{formato(tl.unidad, { n: u.indice + 1 })}: </span>
                        {u.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {corta(u.desde)} – {corta(u.hasta)}
                      </p>
                      {u.avance === null ? (
                        <p className="text-[11px] text-slate-400">{tl.sinActividades}</p>
                      ) : (
                        <div title={formato(tl.avance, { p: u.avance })}>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${u.avance}%`, background: colorProgreso(u.avance) }} />
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">{formato(tl.avance, { p: u.avance })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {i < unidades.length - 1 && (
                    <svg viewBox="0 0 24 12" className="absolute top-1/2 -right-8 hidden h-3 w-7 -translate-y-1/2 text-slate-400 sm:block" aria-hidden>
                      <path d="M1 6h20M16 1.5 21 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
