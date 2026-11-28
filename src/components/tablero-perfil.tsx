// Tablero del perfil CREAR (etapa 3): lo comparten la vista del alumno y la del profesor. Todos los
// números vienen calculados de src/lib/perfil/tablero.ts; aquí solo se dibujan.
import { BotonRutaMejora } from "@/components/boton-ruta-mejora";
import { EtapasLogro } from "@/components/etapas-logro";
import { fechaLarga } from "@/components/ui";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import type { NivelSolo } from "@/lib/perfil/crear";
import { FRANJAS, type ReporteAlumno, type UnidadTablero, comparaAutodiagnostico, ESPERADO_AUTODIAGNOSTICO, etapasARecomendar } from "@/lib/perfil/tablero";
import { textoTiempo } from "@/lib/tiempo";
import type { AplicacionStroop, EtapaCrear, RutaMejora } from "@/lib/tipos";

export const tarjetaTablero = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]";

/** Orden de los días en el mapa de horario: lunes primero. */
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Línea de la calificación (0-100) de cada intento, con la línea de 70. Una sola serie. */
export function GraficaEvolucion({
  puntos,
  aprobatoria = 70,
}: {
  puntos: { calificacion: number; caso: boolean; titulo: string }[];
  aprobatoria?: number;
}) {
  const ancho = 640;
  const alto = 200;
  const m = { izq: 34, der: 12, arr: 12, aba: 22 };
  const w = ancho - m.izq - m.der;
  const h = alto - m.arr - m.aba;
  const x = (i: number) => m.izq + (puntos.length === 1 ? w / 2 : (i * w) / (puntos.length - 1));
  const y = (v: number) => m.arr + h - (Math.max(0, Math.min(100, v)) * h) / 100;
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.calificacion).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full" role="img">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={m.izq} x2={ancho - m.der} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={m.izq - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <line x1={m.izq} x2={ancho - m.der} y1={y(aprobatoria)} y2={y(aprobatoria)} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" />
      <text x={m.izq - 6} y={y(aprobatoria) + 4} textAnchor="end" fontSize={11} fill="#475569" fontWeight={600}>
        {aprobatoria}
      </text>
      {puntos.length > 1 && <path d={linea} fill="none" stroke="#2554e8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.calificacion)} r={p.caso ? 4.5 : 5} fill={p.caso ? "#ffffff" : "#2554e8"} stroke={p.caso ? "#2554e8" : "#ffffff"} strokeWidth={2} />
          {/* Área de contacto mayor que la marca, para el tooltip. */}
          <circle cx={x(i)} cy={y(p.calificacion)} r={12} fill="transparent">
            <title>{p.titulo}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

/** Mapa de 7 días × 4 franjas con el número de intentos; un solo tono (más oscuro = más intentos). */
export function MapaHorario({
  celdas,
  maximo,
  dias,
  franjas,
  texto,
}: {
  celdas: number[][];
  maximo: number;
  dias: string[];
  franjas: Record<(typeof FRANJAS)[number], string>;
  texto: (dia: string, franja: string, n: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[17rem] grid-cols-[2.5rem_repeat(4,1fr)] gap-0.5 text-xs">
        <span />
        {FRANJAS.map((f) => (
          <span key={f} className="pb-1 text-center font-medium text-slate-500 capitalize">
            {franjas[f]}
          </span>
        ))}
        {ORDEN_DIAS.map((d) => (
          <div key={d} className="contents">
            <span className="flex items-center font-medium text-slate-600">{dias[d]}</span>
            {FRANJAS.map((f, j) => {
              const n = celdas[d][j];
              const fuerza = maximo ? n / maximo : 0;
              return (
                <span
                  key={f}
                  title={texto(dias[d], franjas[f], n)}
                  className={`flex h-8 items-center justify-center rounded tabular-nums ${n === 0 ? "bg-slate-50 text-slate-300" : fuerza > 0.55 ? "font-semibold text-white" : "font-semibold text-tinta-900"}`}
                  style={n ? { backgroundColor: `color-mix(in srgb, #2554e8 ${Math.round(18 + fuerza * 82)}%, #eef4ff)` } : undefined}
                >
                  {n || "·"}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{valor}</p>
    </div>
  );
}

/**
 * Tablero completo de un alumno en un curso. `vista` cambia los textos (tú/el alumno) y a quién se
 * le cobra la ruta de mejora.
 */
export async function TableroAlumno({
  vista,
  grupoId,
  matricula,
  reporte,
  unidades,
  stroop,
  evidencias,
  titulos,
  ruta,
  costoRuta,
}: {
  vista: "alumno" | "profesor";
  grupoId: string;
  /** Solo para la vista del profesor (pide la ruta de ese alumno). */
  matricula?: string;
  reporte: ReporteAlumno;
  unidades: UnidadTablero[] | null;
  stroop: { inicio?: AplicacionStroop; fin?: AplicacionStroop };
  /** Evidencias de cada etapa en el Modelo CREAR del curso. */
  evidencias: Record<EtapaCrear, string>;
  /** Título de cada actividad, por id. */
  titulos: Map<string, string>;
  ruta?: RutaMejora;
  costoRuta: number;
}) {
  const { t, locale } = await textos();
  const tp = t.perfil;
  const tt = tp.tablero;
  const nombreEtapa = (e: EtapaCrear) => tp.crear.etapas[e].nombre;
  const nombreSolo = (n: NivelSolo) => tp.crear.solo[n] ?? n;
  const fecha = (iso: string) => fechaLarga(iso.slice(0, 10), locale);
  const recomendar = etapasARecomendar(reporte);
  const efecto = (a?: AplicacionStroop) => (a && !a.omitida && a.resumen ? a.resumen.efectoMs : null);
  const eIni = efecto(stroop.inicio);
  const eFin = efecto(stroop.fin);

  return (
    <div className="space-y-4">
      <section className={tarjetaTablero}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato etiqueta={tt.resumen.calificacion} valor={reporte.calificacion === null ? "—" : String(reporte.calificacion)} />
          <Dato etiqueta={tt.resumen.nivel} valor={nombreSolo(reporte.nivel)} />
          <Dato etiqueta={tt.resumen.actividades} valor={String(reporte.actividades)} />
          <Dato etiqueta={tt.resumen.intentos} valor={String(reporte.intentos)} />
          <Dato etiqueta={tt.resumen.casos} valor={String(reporte.casos)} />
          <Dato etiqueta={tt.resumen.tiempo} valor={reporte.segundos ? textoTiempo(reporte.segundos) : "—"} />
          <Dato
            etiqueta={tt.resumen.mejora}
            valor={reporte.mejoraCasos === null ? "—" : formato(tt.resumen.puntos, { n: `${reporte.mejoraCasos > 0 ? "+" : ""}${reporte.mejoraCasos}` })}
          />
        </div>
      </section>

      <section className={tarjetaTablero}>
        <h2 className="mb-3 text-base font-semibold text-slate-900">{tt.perfilEtapas}</h2>
        <EtapasLogro porEtapa={reporte.porEtapa} nombres={tp.crear.etapas} sinDatos={tp.seguimiento.sinDatosEtapa} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-900">{tt.fortalezas}</h3>
            {reporte.fortalezas.length ? (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                {reporte.fortalezas.map((x) => (
                  <li key={x.etapa}>
                    ✓ {nombreEtapa(x.etapa)} · <span className="font-semibold tabular-nums">{x.logro}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">{tt.sinFortalezas}</p>
            )}
          </div>
          <div className="rounded-xl bg-amber-50/60 p-3 ring-1 ring-amber-200">
            <h3 className="text-sm font-semibold text-amber-900">{tt.areas}</h3>
            {reporte.areas.length ? (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-800">
                {reporte.areas.map((x) => (
                  <li key={x.etapa}>
                    ▲ {nombreEtapa(x.etapa)} · <span className="font-semibold tabular-nums">{x.logro}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">{tt.sinAreas}</p>
            )}
          </div>
        </div>
      </section>

      <section className={tarjetaTablero}>
        <h2 className="mb-2 text-base font-semibold text-slate-900">{tt.recomendaciones}</h2>
        {recomendar.length ? (
          <ol className="space-y-3">
            {recomendar.map((e, i) => (
              <li key={e} className="flex gap-3">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tinta-50 text-xs font-bold text-tinta-700">{i + 1}</span>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{nombreEtapa(e)}</p>
                  <p className="text-slate-700">{tt.recomendacion[e]}</p>
                  {evidencias[e] && <p className="mt-0.5 text-xs text-slate-500">{formato(tt.evidencias, { texto: evidencias[e] })}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-700">{tt.sinRecomendaciones}</p>
        )}
      </section>

      {reporte.evolucion.length > 0 && (
        <section className={tarjetaTablero}>
          <h2 className="text-base font-semibold text-slate-900">{tt.evolucion}</h2>
          <p className="mb-2 text-xs text-slate-500">{tt.evolucionNota}</p>
          <GraficaEvolucion
            puntos={reporte.evolucion.map((p) => ({
              calificacion: p.calificacion,
              caso: p.origen === "caso",
              titulo: formato(tt.intento, { actividad: titulos.get(p.actividadId) ?? "", n: p.numero, fecha: fecha(p.fecha), c: p.calificacion }),
            }))}
          />
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-tinta-600" />
              {tt.puntoEntrega}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border-2 border-tinta-600 bg-white" />
              {tt.puntoCaso}
            </span>
          </div>
        </section>
      )}

      <section className={tarjetaTablero}>
        <h2 className="text-base font-semibold text-slate-900">{tt.horario}</h2>
        <p className="mb-3 text-xs text-slate-500">{tt.horarioNota}</p>
        <MapaHorario
          celdas={reporte.horario.celdas}
          maximo={reporte.horario.maximo}
          dias={tt.diasCortos}
          franjas={tt.franjas}
          texto={(dia, franja, n) => formato(tt.celda, { dia, franja, n })}
        />
        {reporte.horario.masFrecuente && (
          <p className="mt-3 text-sm text-slate-700">
            {formato(tt.masFrecuente, { dia: tp.seguimiento.dias[reporte.horario.masFrecuente.dia], franja: tt.franjas[reporte.horario.masFrecuente.franja] })}
          </p>
        )}
      </section>

      <section className={tarjetaTablero}>
        <h2 className="mb-3 text-base font-semibold text-slate-900">{tt.unidades}</h2>
        {!unidades ? (
          <p className="text-sm text-slate-500">{tt.sinTemario}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-medium">{tt.columnas.unidad}</th>
                  <th className="py-1.5 pr-3 font-medium">{tt.columnas.autodiagnostico}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{tt.columnas.esperado}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{tt.columnas.real}</th>
                  <th className="py-1.5 text-right font-medium">{tt.columnas.actividades}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unidades.map((u) => {
                  const c = comparaAutodiagnostico(u);
                  return (
                    <tr key={u.unidad}>
                      <td className="py-2 pr-3 font-medium text-slate-900">{u.unidad}</td>
                      <td className="py-2 pr-3 text-slate-700">{u.autodiagnostico ? t.ruta.valoracion.niveles[u.autodiagnostico] : "—"}</td>
                      <td className="py-2 pr-3 text-right text-slate-600 tabular-nums">{u.autodiagnostico ? ESPERADO_AUTODIAGNOSTICO[u.autodiagnostico] : "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={u.calificacion === null ? "text-slate-400" : u.calificacion >= 70 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                          {u.calificacion ?? "—"}
                        </span>
                        {c && <span className="ml-2 text-xs font-normal text-slate-500">{c === "arriba" ? "▲" : c === "abajo" ? "▼" : "="} {tt.comparacion[c]}</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">{u.actividades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(stroop.inicio || stroop.fin) && (
        <section className={tarjetaTablero}>
          <h2 className="text-base font-semibold text-slate-900">{tt.stroop}</h2>
          <p className="mb-3 text-xs text-slate-500">{tt.stroopNota}</p>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            <Dato etiqueta={tp.stroop.momento.inicio} valor={stroop.inicio?.omitida ? tp.stroop.omitida : eIni === null ? "—" : formato(tp.stroop.ms, { n: eIni })} />
            <Dato etiqueta={tp.stroop.momento.fin} valor={stroop.fin?.omitida ? tp.stroop.omitida : eFin === null ? "—" : formato(tp.stroop.ms, { n: eFin })} />
          </div>
          <p className="mt-3 text-sm text-slate-700">
            {eIni !== null && eFin !== null
              ? eFin < eIni
                ? formato(tt.stroopBajo, { n: eIni - eFin })
                : eFin > eIni
                  ? formato(tt.stroopSubio, { n: eFin - eIni })
                  : tt.stroopIgual
              : !stroop.fin
                ? tt.stroopPendiente
                : ""}
          </p>
        </section>
      )}

      <section className={tarjetaTablero}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">{tt.ruta.titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{tt.ruta.texto}</p>
          </div>
          <div className="text-right">
            <BotonRutaMejora
              grupoId={grupoId}
              matricula={vista === "profesor" ? matricula : undefined}
              texto={ruta ? tt.ruta.regenerar : tt.ruta.boton}
              generando={tt.ruta.generando}
              errorGeneral={tt.errores.general}
              secundario={Boolean(ruta)}
            />
            <p className="mt-1 text-xs text-slate-500">{formato(vista === "alumno" ? tt.ruta.costo : tt.ruta.costoProfesor, { n: costoRuta })}</p>
          </div>
        </div>
        {ruta && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <p className="text-xs text-slate-500">
              {formato(tt.ruta.generada, { f: fecha(ruta.generadaEn) })} · {ruta.pedidaPor === "profesor" ? tt.ruta.porProfesor : tt.ruta.porAlumno}
            </p>
            <p className="text-slate-800">{ruta.resumen}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold text-emerald-900">{tt.fortalezas}</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                  {ruta.fortalezas.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">{tt.areas}</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                  {ruta.areas.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{tt.recomendaciones}</h3>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-700">
                {ruta.recomendaciones.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>
            <p className="text-xs text-slate-500">{tt.ruta.nota}</p>
          </div>
        )}
      </section>
    </div>
  );
}
