import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnilloAvance, GraficaProyecto, LineaEtapas } from "@/components/avance-proyecto";
import { SubirEvidenciaProyecto } from "@/components/subir-evidencia-proyecto";
import { Barra, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { VisorArchivos, type ArchivoVisor } from "@/components/visor-archivos";
import { leer } from "@/lib/almacen";
import { claseDeArchivo } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { ICONO_ETAPA, equipoDe, resumenAlumno } from "@/lib/proyectos";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.proyecto.alumno.titulo };
}

/**
 * Pestaña "Proyecto" del alumno: su avance por etapa en gráficas y, de cada etapa cerrada, el
 * resumen de la rúbrica, los comentarios de los evaluadores, las áreas de mejora, la calificación de
 * la etapa y la acumulada al cierre; arriba, la acumulada global.
 */
export default async function ProyectoAlumno({ params }: PageProps<"/alumno/cursos/[id]/proyecto">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const tp = t.proyecto;
  const ta = tp.alumno;
  const db = await leer();
  const proyectos = (db.proyectos ?? []).filter((p) => p.grupoId === grupo.id);
  const evaluaciones = db.evaluacionesProyecto ?? [];
  const entregas = db.entregasProyecto ?? [];

  return (
    <>
      <div className="mb-6">
        <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label={t.profesor.comun.ruta}>
          <Link href="/alumno" className="hover:text-tinta-700">
            {t.alumno.panel.titulo}
          </Link>
          <span>/</span>
          <Link href={`/alumno/cursos/${grupo.id}`} className="hover:text-tinta-700">
            {grupo.materia} · {grupo.nombre}
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">🛠️ {ta.titulo}</h1>
      </div>
      {proyectos.length === 0 && <Tarjeta className="text-sm text-slate-600">{ta.sinProyectos}</Tarjeta>}
      <div className="space-y-8">
        {proyectos.map((p) => {
          const r = resumenAlumno(p, evaluaciones, entregas, enCurso.matricula);
          const equipo = equipoDe(p, enCurso.matricula);
          const total = p.etapas.reduce((s, e) => s + Math.max(0, e.peso), 0);
          return (
            <section key={p.id} aria-labelledby={`p-${p.id}`} className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 id={`p-${p.id}`} className="text-xl font-semibold text-slate-900">
                  {p.titulo}
                </h2>
                {p.descripcion && <p className="mt-1 text-sm text-slate-600">{p.descripcion}</p>}
                {equipo && <p className="mt-1 text-sm text-slate-600">👥 {equipo.nombre}</p>}
                <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-center">
                  <div className="flex items-center gap-3">
                    <AnilloAvance valor={r.avance} etiqueta={ta.avance} />
                    <div>
                      <p className="text-xs text-slate-500">{ta.avance}</p>
                      <p className="text-sm font-medium text-slate-800">{formato(ta.etapasCerradas, { c: r.cerradas, n: p.etapas.length })}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">{ta.acumulada}</p>
                    <p className="text-2xl font-semibold text-slate-900">{r.cerradas ? r.acumulada : "—"}</p>
                    <p className="text-xs text-slate-500">{formato(ta.acumuladaNota, { a: r.acumulada, t: total })}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">{ta.promedio}</p>
                    <p className={`text-2xl font-semibold ${r.promedioALaFecha === null ? "text-slate-400" : colorCalificacion(r.promedioALaFecha, 100)}`}>
                      {r.promedioALaFecha ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-xs text-slate-500">{ta.final}</p>
                    <p className={`text-2xl font-semibold ${r.final === null ? "text-slate-400" : colorCalificacion(r.final, 100)}`}>{r.final ?? "—"}</p>
                    {r.final === null && <p className="text-xs text-slate-500">{ta.finalPendiente}</p>}
                  </div>
                </div>
                <div className="mt-5">
                  <LineaEtapas resumen={r} t={t} />
                </div>
                <div className="mt-4">
                  <GraficaProyecto resumen={r} t={t} />
                </div>
              </div>

              {r.etapas.map((e) => {
                const archivos: ArchivoVisor[] = (e.entrega?.archivos ?? []).flatMap((ruta, i) => {
                  const clase = claseDeArchivo(ruta);
                  return clase ? [{ ruta, nombre: e.entrega!.nombres[i] ?? ruta.split("/").at(-1)!, clase }] : [];
                });
                const res = e.resultado;
                return (
                  <article key={e.etapa.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <header className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-5 py-3">
                      <span className="text-2xl" aria-hidden>
                        {ICONO_ETAPA[e.etapa.tipo]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-500">
                          {formato(tp.modelo.etapa, { n: e.numero })} · {tp.tipos[e.etapa.tipo]}
                        </p>
                        <h3 className="font-semibold text-slate-900">{e.etapa.nombre}</h3>
                        <p className="text-xs text-slate-500">
                          {[
                            formato(ta.peso, { p: e.etapa.peso }),
                            e.etapa.fecha ? formato(ta.fecha, { f: fechaLarga(e.etapa.fecha, locale) }) : undefined,
                            e.etapa.porEquipo && equipo ? formato(ta.porEquipo, { equipo: equipo.nombre }) : ta.individual,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{ta.estados[e.estado]}</span>
                    </header>
                    <div className="space-y-4 p-5">
                      {e.etapa.instrucciones && <p className="whitespace-pre-line text-sm text-slate-700">{e.etapa.instrucciones}</p>}
                      {e.etapa.conEvidencia ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-800">{e.etapa.porEquipo && equipo ? ta.evidenciaEquipo : ta.tuEvidencia}</h4>
                          {e.entrega && <p className="text-xs text-acierto">✓ {formato(ta.enviada, { f: fechaLarga(e.entrega.entregadaEn.slice(0, 10), locale) })}</p>}
                          {/* En una etapa cerrada la evidencia queda plegada para que destaque la retroalimentación. */}
                          {archivos.length > 0 &&
                            (e.etapa.cerradaEn ? (
                              <details className="rounded-lg ring-1 ring-slate-200">
                                <summary className="cursor-pointer px-3 py-2 text-sm text-tinta-700">
                                  📎 {e.entrega!.nombres.join(", ")}
                                </summary>
                                <VisorArchivos archivos={archivos} />
                              </details>
                            ) : (
                              <VisorArchivos archivos={archivos} />
                            ))}
                          {!e.etapa.cerradaEn && <SubirEvidenciaProyecto proyectoId={p.id} etapaId={e.etapa.id} yaEntregada={Boolean(e.entrega)} />}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">🎙️ {ta.sinEvidencia}</p>
                      )}

                      {e.estado !== "cerrada" || !res ? (
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">⏳ {ta.esperando}</p>
                      ) : (
                        <div className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                          <div className="flex flex-wrap items-end gap-6">
                            <div>
                              <p className="text-xs text-slate-500">{ta.calificacionEtapa}</p>
                              <p className={`text-3xl font-semibold ${colorCalificacion(res.calificacion ?? 0, 100)}`}>
                                {res.calificacion ?? 0}
                                <span className="text-sm font-normal text-slate-400"> / 100</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                {res.terminadas === 1 ? ta.evaluador1 : formato(ta.evaluadoresTerminaron, { n: res.terminadas })}
                              </p>
                            </div>
                            <div className="text-sm text-slate-700">
                              <p>{formato(ta.aporta, { a: e.aporte ?? 0, p: e.etapa.peso })}</p>
                              <p className="font-semibold">{formato(ta.acumuladaCierre, { a: e.acumulada ?? 0 })}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{ta.resumenRubrica}</h4>
                            <ul className="mt-2 space-y-2">
                              {res.porCriterio.map((c) => (
                                <li key={c.criterioId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                                  <span className="truncate text-slate-700">
                                    {c.nombre} <span className="text-xs text-slate-400">· {c.porcentaje} %</span>
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700">
                                    {c.promedio ?? "—"} {c.nivel && `· ${tp.niveles[c.nivel]}`}
                                  </span>
                                  <span className="col-span-2">
                                    <Barra valor={c.promedio ?? 0} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">{ta.comentarios}</h4>
                            {res.comentarios.length === 0 ? (
                              <p className="mt-1 text-sm text-slate-500">{ta.sinComentarios}</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {res.comentarios.map((c, i) => (
                                  <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                                    <span className="text-xs font-semibold text-tinta-700">
                                      {formato(ta.evaluadorN, { n: c.evaluador })} · {c.criterio ?? ta.general}
                                    </span>
                                    <span className="block text-slate-700">{c.texto}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {res.mejoras.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">{ta.mejoras}</h4>
                              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {res.mejoras.map((m) => (
                                  <li key={m}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
