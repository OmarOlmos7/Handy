// Histograma apilado del avance del grupo en su ruta de aprendizaje: una columna por unidad con el
// porcentaje de alumnos que la completaron (certificada), que van en proceso y que no la inician.
// Los colores son los mismos del diagrama del alumno y de la tabla por alumno.
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { AMARILLO_PROGRESO, AZUL_CERTIFICADA, ESTADOS_UNIDAD, colorRuta, type DistribucionUnidad, type EstadoUnidad } from "@/lib/ruta-aprendizaje";

/** Relleno, borde y tinta del texto de cada estado en el histograma. */
export const ESTILO_HISTOGRAMA: Record<EstadoUnidad, { fondo: string; borde: string; texto: string }> = {
  certificada: { fondo: AZUL_CERTIFICADA, borde: AZUL_CERTIFICADA, texto: "#fff" },
  en_progreso: { fondo: AMARILLO_PROGRESO, borde: AMARILLO_PROGRESO, texto: "#713f12" },
  sin_iniciar: { fondo: "#f1f5f9", borde: "#cbd5e1", texto: "#475569" },
};

const etiquetas = (t: Diccionario): Record<EstadoUnidad, string> => {
  const h = t.ruta.profesor.histograma;
  return { certificada: h.completada, en_progreso: h.proceso, sin_iniciar: h.sinIniciar };
};

/** Círculo de estado como en el diagrama del alumno (lo usan la tabla y la simbología). */
export function CirculoEstado({ estado, color, etiqueta, tam = 26 }: { estado: EstadoUnidad; color: string; etiqueta?: string; tam?: number }) {
  const c = tam / 2;
  const r = c - 2;
  return (
    <svg width={tam} height={tam} role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true} className="shrink-0">
      {etiqueta && <title>{etiqueta}</title>}
      <circle
        cx={c}
        cy={c}
        r={estado === "sin_iniciar" ? r - 1 : r}
        fill={estado === "certificada" ? AZUL_CERTIFICADA : estado === "en_progreso" ? AMARILLO_PROGRESO : "#fff"}
        stroke={color}
        strokeWidth={estado === "sin_iniciar" ? 2.5 : 0}
      />
      {estado === "certificada" && (
        <path
          d={`M${c - 0.38 * r} ${c + 0.02 * r} L${c - 0.1 * r} ${c + 0.3 * r} L${c + 0.42 * r} ${c - 0.3 * r}`}
          fill="none"
          stroke="#fff"
          strokeWidth={Math.max(2, r / 4.5)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** Simbología compartida: muestra de la barra y el círculo que se ven en la tabla por alumno. */
export function SimbologiaRutas({ t, circulos = true }: { t: Diccionario; circulos?: boolean }) {
  const nombres = etiquetas(t);
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600" aria-label={t.ruta.profesor.histograma.simbologia}>
      {ESTADOS_UNIDAD.map((e) => (
        <li key={e} className="flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 rounded-[3px]" style={{ background: ESTILO_HISTOGRAMA[e].fondo, boxShadow: `inset 0 0 0 1.5px ${ESTILO_HISTOGRAMA[e].borde}` }} />
          {circulos && <CirculoEstado estado={e} color={e === "certificada" ? AZUL_CERTIFICADA : "#94a3b8"} tam={18} />}
          {nombres[e]}
        </li>
      ))}
    </ul>
  );
}

export function HistogramaRutas({ datos, t, totalAlumnos }: { datos: DistribucionUnidad[]; t: Diccionario; totalAlumnos: number }) {
  const h = t.ruta.profesor.histograma;
  const nombres = etiquetas(t);
  const marcas = [100, 75, 50, 25, 0];
  return (
    <figure className="m-0">
      <figcaption className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{h.titulo}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{totalAlumnos === 0 ? h.sinAlumnos : formato(h.ayuda, { n: totalAlumnos })}</p>
        </div>
        <SimbologiaRutas t={t} circulos={false} />
      </figcaption>

      {totalAlumnos > 0 && (
        <div className="mt-2 overflow-x-auto pt-2 pb-1 sm:overflow-visible">
          <div className="flex min-w-max gap-2 sm:min-w-0">
            {/* Eje de porcentajes. */}
            <div className="relative h-56 w-9 shrink-0 text-right text-[11px] text-slate-400 tabular-nums" aria-hidden>
              {marcas.map((m) => (
                <span key={m} className="absolute right-1 -translate-y-1/2" style={{ top: `${100 - m}%` }}>
                  {m}%
                </span>
              ))}
            </div>
            <div className="relative flex-1">
              {/* Rejilla tenue. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-56" aria-hidden>
                {marcas.map((m) => (
                  <div key={m} className={`absolute inset-x-0 border-t ${m === 0 ? "border-slate-300" : "border-dashed border-slate-100"}`} style={{ top: `${100 - m}%` }} />
                ))}
              </div>
              <ol className="relative flex gap-3 sm:gap-4">
                {datos.map((d) => {
                  const resumen = ESTADOS_UNIDAD.map((e) => formato(h.detalle, { estado: nombres[e], p: d.porcentajes[e], c: d.conteos[e], t: d.total })).join(" · ");
                  return (
                    <li key={d.nombre} className="group relative flex w-16 shrink-0 flex-col items-center sm:w-auto sm:min-w-14 sm:flex-1">
                      <div
                        tabIndex={0}
                        aria-label={`${formato(t.ruta.unidad, { n: d.indice + 1 })} · ${d.nombre}: ${resumen}`}
                        className="flex h-56 w-full max-w-20 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                      >
                        {ESTADOS_UNIDAD.map((e) =>
                          d.porcentajes[e] > 0 ? (
                            <div
                              key={e}
                              className="flex min-h-[3px] items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity group-hover:opacity-90"
                              style={{ flexGrow: d.porcentajes[e], flexBasis: 0, background: ESTILO_HISTOGRAMA[e].fondo, color: ESTILO_HISTOGRAMA[e].texto, boxShadow: `inset 0 0 0 1px ${ESTILO_HISTOGRAMA[e].borde}` }}
                            >
                              {d.porcentajes[e] >= 9 && `${d.porcentajes[e]}%`}
                            </div>
                          ) : null,
                        )}
                      </div>
                      {/* Detalle al pasar el cursor o al tocar la columna. */}
                      <div
                        role="tooltip"
                        className="pointer-events-none invisible absolute top-6 left-0 z-10 w-56 sm:left-1/2 sm:-translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                      >
                        <p className="font-semibold">
                          {formato(t.ruta.unidad, { n: d.indice + 1 })} · {d.nombre.replace(/^(unidad|unit)\s*\d+[.:)\-–]?\s*/i, "")}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {ESTADOS_UNIDAD.map((e) => (
                            <li key={e} className="flex items-center gap-1.5">
                              <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: ESTILO_HISTOGRAMA[e].fondo }} />
                              {formato(h.detalle, { estado: nombres[e], p: d.porcentajes[e], c: d.conteos[e], t: d.total })}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: colorRuta(d.indice) }} />
                        {formato(t.ruta.unidad, { n: d.indice + 1 })}
                      </p>
                      <p className="line-clamp-2 w-full max-w-28 text-center text-[11px] leading-tight text-slate-500" title={d.nombre}>
                        {d.nombre.replace(/^(unidad|unit)\s*\d+[.:)\-–]?\s*/i, "")}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
