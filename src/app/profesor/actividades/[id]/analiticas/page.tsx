import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DescargarReportePdf } from "@/components/descargar-reporte-pdf";
import { ConFlujo } from "@/components/flujo-actividad";
import { BarrasH, Columnas, LeyendaDesempeno, Pastel, Radar } from "@/components/graficas";
import { Cifra, Seccion, TablaAlumnos, num } from "@/components/tablero";
import { BotonLink, Encabezado, InsigniaNivel, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { APROBATORIA, analiticasCurso } from "@/lib/analiticas";
import { configuracionDe, rebanadasNiveles } from "@/lib/configuracion";
import { colorDesempeno } from "@/lib/escala-color";
import { formatoCal, reporteGrupo } from "@/lib/estadisticas";
import { hallazgosActividad, nombreArchivoReporte, reporteActividadPdf } from "@/lib/reporte-analiticas";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.analiticas.metaActividad };
}

/** Métricas de aprendizaje de una sola actividad, con el mismo tablero que el del grupo. */
export default async function AnaliticasActividad({ params }: PageProps<"/profesor/actividades/[id]/analiticas">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const entregas = entregasDe(db, id);
  const { t, locale } = await textos();
  const ta = t.profesor.analiticas;
  const tc = t.profesor.comun;
  const tipos: Record<string, string> = t.profesor.tipos;
  const nombreTipoReactivo = (tipo: string) => tipos[tipo] ?? tipo;
  const niveles = { nombres: t.configuracion.niveles, a: ta.rangoA };
  const a = analiticasCurso(grupo, [actividad], entregas, configuracionDe(profesor.config).rangos, t.profesor.calculo);
  const rep = reporteGrupo(actividad, entregas, grupo.alumnos);
  const g = a.general;
  const s = a.actividades[0];
  const hay = Boolean(s);

  const hallazgos = hallazgosActividad(a, rep, t.profesor.calculo);
  const reportePdf = reporteActividadPdf(grupo, actividad, a, rep);

  const sinEntregar = grupo.alumnos.filter((al) => !rep.filas.some((f) => f.alumno.matricula === al.matricula));

  return (
    <>
      <Encabezado
        migas={[
          { texto: tc.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo={ta.metaActividad}
        subtitulo={formato(ta.subtituloActividad, { titulo: actividad.titulo, f: fechaLarga(actividad.fechaAplicacion, locale), e: rep.escala })}
        acciones={
          <>
            {hay && (
              <DescargarReportePdf
                reporte={reportePdf}
                archivo={nombreArchivoReporte(["analiticas", grupo.materia, grupo.nombre, actividad.titulo])}
              />
            )}
            <BotonLink href={`/profesor/grupos/${grupo.id}/analiticas`} variante="secundario">
              {ta.analiticasGrupo}
            </BotonLink>
          </>
        }
      />
      <ConFlujo vista={5} db={db} actividad={actividad}>
        {!hay ? (
          <Tarjeta className="text-sm text-slate-600">{ta.sinActividad}</Tarjeta>
        ) : (
          <div className="min-w-0 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Cifra titulo={ta.promedio} valor={num(s.promedio)} detalle={formato(ta.sinContar, { n: num(s.promedioEntregadas) })} />
              <Cifra titulo={ta.mediana} valor={num(s.mediana)} detalle={formato(ta.minMax, { a: num(s.minima), b: num(s.maxima) })} />
              <Cifra titulo={ta.desviacion} valor={num(s.desviacion)} detalle={ta.dispersosPuntajes} />
              <Cifra titulo={ta.aprobacion} valor={`${s.aprobacion}%`} detalle={formato(ta.alumnosCon, { n: APROBATORIA })} />
              <Cifra titulo={ta.tasaEntrega} valor={`${s.tasaEntrega}%`} detalle={`${formato(ta.sinEntregar, { n: s.noEntregadas })}${s.pendientes ? formato(ta.porEvaluar, { n: s.pendientes }) : ""}`} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Seccion titulo={ta.aprobadosVs} nota={formato(ta.apruebaCon, { n: APROBATORIA })}>
                <Pastel
                  centro={`${g.aprobacion}%`}
                  subcentro={ta.aprobados}
                  rebanadas={[
                    { nombre: ta.aprobadosM, valor: g.aprobados, color: "#22c55e" },
                    { nombre: ta.noAprobados, valor: g.reprobados, color: "#ef4444" },
                  ]}
                />
              </Seccion>
              <Seccion titulo={ta.niveles} nota={ta.nivelesNotaActividad}>
                <Pastel
                  centro={String(g.aprobados + g.reprobados)}
                  subcentro={ta.alumnos}
                  rebanadas={rebanadasNiveles(a.niveles, a.rangos, niveles)}
                />
              </Seccion>
              <Seccion titulo={ta.entregas} nota={ta.entregasNotaActividad}>
                <Pastel
                  centro={`${g.tasaEntrega}%`}
                  subcentro={ta.entregados}
                  rebanadas={[
                    { nombre: ta.entregadosM, valor: g.entregadas, color: "#3b6ef6" },
                    { nombre: ta.noEntregados, valor: g.noEntregadas, color: "#94a3b8" },
                  ]}
                />
              </Seccion>
            </div>

            <Seccion titulo={ta.hallazgos} nota={ta.hallazgosNotaActividad}>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {hallazgos.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Seccion>

            <div className="flex justify-end">
              <LeyendaDesempeno aprobatoria={APROBATORIA} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {rep.porReactivo.length >= 3 ? (
                <Seccion titulo={ta.aciertoReactivo} nota={ta.aciertoReactivoRadar}>
                  <Radar
                    aprobatoria={APROBATORIA}
                    ejes={rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipoReactivo(r.tipo)}`, valor: r.acierto }))}
                  />
                </Seccion>
              ) : (
                <Seccion titulo={ta.aciertoReactivo} nota={ta.aciertoReactivoNota}>
                  <BarrasH
                    aprobatoria={APROBATORIA}
                    sufijo="%"
                    filas={rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipoReactivo(r.tipo)}`, valor: r.acierto }))}
                  />
                </Seccion>
              )}
              {a.temas.length >= 3 ? (
                <Seccion titulo={ta.aciertoTema} nota={ta.porcentajeTema}>
                  <Radar aprobatoria={APROBATORIA} ejes={[...a.temas].reverse().slice(0, 8).map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
                </Seccion>
              ) : (
                <Seccion titulo={ta.aciertoTema} nota={ta.porcentajeTema}>
                  <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temas.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
                </Seccion>
              )}
              <Seccion titulo={ta.habilidades} nota={ta.habilidadesNota}>
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={rep.porHabilidad.map((h) => ({ nombre: h.nombre, valor: h.acierto }))} />
              </Seccion>
              <Seccion titulo={ta.distribucionPuntajes} nota={ta.distribucionPuntajesNota}>
                <Columnas
                  max={Math.max(...a.distribucion.map((d) => d.cantidad))}
                  sufijo={ta.sufijoAlumnos}
                  filas={a.distribucion.map((d, i) => ({ nombre: d.rango.replace(" a ", ` ${ta.rangoA} `), valor: d.cantidad, color: colorDesempeno([30, 65, 75, 85, 95][i] ?? 50) }))}
                />
              </Seccion>
              <Seccion titulo={ta.mejores} nota={ta.mejoresNotaActividad}>
                <TablaAlumnos filas={a.mejores} vacio={ta.sinDestacados} titulo={ta.puntaje} entregas={false} />
              </Seccion>
              <Seccion titulo={ta.atencion} nota={formato(ta.atencionNotaActividad, { n: APROBATORIA })} className="ring-red-200">
                <TablaAlumnos filas={a.atencion} vacio={ta.nadieAtencion} titulo={ta.puntaje} motivos />
              </Seccion>
            </div>

            <Seccion titulo={ta.calificaciones} nota={formato(ta.calificacionesNota, { n: rep.escala })}>
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">{tc.alumno}</th>
                      <th className="pb-2 font-medium">{tc.matricula}</th>
                      <th className="pb-2 font-medium">{ta.nivel}</th>
                      <th className="pb-2 text-right font-medium">{tc.calificacion}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rep.filas.map((f, i) => (
                      <tr key={f.alumno.matricula}>
                        <td className="py-2 text-slate-400">{i + 1}</td>
                        <td className="py-2">
                          {f.entrega.resultados.length > 0 ? (
                            <Link href={`/profesor/actividades/${id}/revision/${f.alumno.matricula}`} className="font-medium hover:text-tinta-700">
                              {f.alumno.nombre}
                            </Link>
                          ) : (
                            <span className="font-medium">{f.alumno.nombre}</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-600">{f.alumno.matricula}</td>
                        <td className="py-2">
                          <InsigniaNivel nivel={f.nivel} />
                        </td>
                        <td className={`py-2 text-right font-semibold ${colorCalificacion(f.calificacion, rep.escala)}`}>
                          {formatoCal(f.calificacion, rep.escala)}
                        </td>
                      </tr>
                    ))}
                    {sinEntregar.map((al) => (
                      <tr key={al.matricula} className="text-slate-500">
                        <td className="py-2 text-slate-300">—</td>
                        <td className="py-2">{al.nombre}</td>
                        <td className="py-2 font-mono text-xs">{al.matricula}</td>
                        <td className="py-2 text-xs">{ta.sinCalificacion}</td>
                        <td className="py-2 text-right font-semibold text-error">{ta.noEntrego}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Seccion>
          </div>
        )}
      </ConFlujo>
    </>
  );
}
