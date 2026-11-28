import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarrasH, COLORES_SERIE, Columnas, LeyendaDesempeno, Pastel, Radar, RadarSeries } from "@/components/graficas";
import { DescargarReportePdf } from "@/components/descargar-reporte-pdf";
import { Cifra, Seccion, TablaAlumnos, num, tonoPuntaje } from "@/components/tablero";
import { Tarjeta, fechaLarga } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { APROBATORIA, analiticasCurso } from "@/lib/analiticas";
import { configuracionDe, rebanadasNiveles } from "@/lib/configuracion";
import { colorDesempeno } from "@/lib/escala-color";
import { nombreArchivoReporte, reporteGrupoPdf } from "@/lib/reporte-analiticas";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.analiticas.metaGrupo };
}

/** Tablero con los resultados de todas las actividades del curso. */
export default async function AnaliticasCurso({ params }: PageProps<"/profesor/grupos/[id]/analiticas">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const ids = new Set(actividades.map((a) => a.id));
  const { t, locale } = await textos();
  const ta = t.profesor.analiticas;
  const tc = t.profesor.comun;
  const a = analiticasCurso(grupo, actividades, db.entregas.filter((e) => ids.has(e.actividadId)), configuracionDe(profesor.config).rangos, t.profesor.calculo);
  const niveles = { nombres: t.configuracion.niveles, a: ta.rangoA };
  const g = a.general;
  const hay = a.actividades.length > 0;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label={tc.ruta}>
            <Link href="/profesor" className="hover:text-tinta-700">{tc.panel}</Link>
            <span>/</span>
            <Link href={`/profesor/grupos/${grupo.id}`} className="hover:text-tinta-700">
              {grupo.materia} · {grupo.nombre}
            </Link>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{ta.metaGrupo}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formato(ta.resumenGrupo, {
              a: formato(a.actividades.length === 1 ? ta.evaluada1 : ta.evaluadaN, { n: a.actividades.length }),
              b: formato(g.alumnos === 1 ? tc.alumno1 : tc.alumnoN, { n: g.alumnos }),
            })}
          </p>
        </div>
        {hay && (
          <div className="flex flex-wrap gap-2">
            <DescargarReportePdf reporte={reporteGrupoPdf(grupo, a, { tx: t.profesor.reportePdf, locale, niveles })} archivo={nombreArchivoReporte(["analiticas", grupo.materia, grupo.nombre])} />
          </div>
        )}
      </div>

      {!hay ? (
        <Tarjeta className="text-sm text-slate-600">
          {ta.sinGrupo}
        </Tarjeta>
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Cifra titulo={ta.promedioGeneral} valor={num(g.promedio)} detalle={formato(ta.sinContar, { n: num(g.promedioEntregadas) })} />
            <Cifra titulo={ta.mediana} valor={num(g.mediana)} detalle={ta.deLosPromedios} />
            <Cifra titulo={ta.desviacion} valor={num(g.desviacion)} detalle={ta.dispersosPromedios} />
            <Cifra titulo={ta.aprobacion} valor={`${g.aprobacion}%`} detalle={formato(ta.alumnosConPromedio, { n: APROBATORIA })} />
            <Cifra titulo={ta.tasaEntrega} valor={`${g.tasaEntrega}%`} detalle={formato(ta.sinEntregar, { n: g.noEntregadas })} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Seccion titulo={ta.aprobadosVs} nota={formato(ta.porPromedioAprueba, { n: APROBATORIA })}>
              <Pastel
                centro={`${g.aprobacion}%`}
                subcentro={ta.aprobados}
                rebanadas={[
                  { nombre: ta.aprobadosM, valor: g.aprobados, color: "#22c55e" },
                  { nombre: ta.noAprobados, valor: g.reprobados, color: "#ef4444" },
                ]}
              />
            </Seccion>
            <Seccion titulo={ta.niveles} nota={ta.nivelesNotaGrupo}>
              <Pastel
                centro={String(g.alumnos)}
                subcentro={ta.alumnos}
                rebanadas={rebanadasNiveles(a.niveles, a.rangos, niveles)}
              />
            </Seccion>
            <Seccion titulo={ta.entregas} nota={ta.entregasNotaGrupo}>
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

          <Seccion titulo={ta.hallazgos} nota={ta.hallazgosNotaGrupo}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {a.hallazgos.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </Seccion>

          <div className="flex justify-end">
            <LeyendaDesempeno aprobatoria={APROBATORIA} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Seccion
              titulo={ta.radarTipo}
              nota={`${formato(ta.radarTipoNota, { n: APROBATORIA })}${a.porTipo.length > COLORES_SERIE.length ? formato(ta.radarTipoMas, { n: COLORES_SERIE.length }) : ""}`}
            >
              <RadarSeries
                aprobatoria={APROBATORIA}
                ejes={[...ta.ejes]}
                series={[...a.porTipo]
                  .sort((x, y) => y.cantidad - x.cantidad)
                  .slice(0, COLORES_SERIE.length)
                  .sort((x, y) => x.nombre.localeCompare(y.nombre, locale))
                  .map((tp, i) => ({
                    nombre: tp.nombre,
                    color: COLORES_SERIE[i],
                    valores: [tp.promedio, tp.mediana, tp.aprobacion, tp.tasaEntrega, tp.promedioEntregadas],
                  }))}
              />
            </Seccion>
            {a.temas.length >= 3 ? (
              <Seccion
                titulo={ta.aciertoTema}
                nota={
                  a.temas.length > 8
                    ? ta.ochoTemas
                    : ta.porcentajeTema
                }
              >
                <Radar aprobatoria={APROBATORIA} ejes={[...a.temas].reverse().slice(0, 8).map((x) => ({ nombre: x.nombre, valor: x.acierto }))} />
              </Seccion>
            ) : (
              <Seccion titulo={ta.temasMenor} nota={ta.porcentajeTema}>
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temasDebiles.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
              </Seccion>
            )}
            {a.porTipo.length >= 1 && (
              <Seccion titulo={ta.promedioTipo} nota={ta.lineaGris}>
                <BarrasH
                  aprobatoria={APROBATORIA}
                  filas={a.porTipo.map((tp) => ({
                    nombre: tp.nombre,
                    valor: tp.promedio,
                    detalle: formato(tp.cantidad === 1 ? tc.actividad1 : tc.actividadN, { n: tp.cantidad }),
                  }))}
                />
              </Seccion>
            )}
            {a.temas.length >= 3 && (
              <Seccion titulo={ta.temasMenor} nota={ta.cincoTemas}>
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temasDebiles.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
              </Seccion>
            )}
            <Seccion titulo={ta.evolucion} nota={ta.evolucionNota}>
              <Columnas
                max={100}
                lineaEn={APROBATORIA}
                filas={a.actividades.map((s) => ({ nombre: s.titulo, valor: s.promedio, detalle: fechaLarga(s.fecha, locale) }))}
              />
            </Seccion>
            <Seccion titulo={ta.distribucionPromedios} nota={ta.distribucionNota}>
              <Columnas
                max={Math.max(...a.distribucion.map((d) => d.cantidad))}
                sufijo={ta.sufijoAlumnos}
                filas={a.distribucion.map((d, i) => ({ nombre: d.rango.replace(" a ", ` ${ta.rangoA} `), valor: d.cantidad, color: colorDesempeno([30, 65, 75, 85, 95][i] ?? 50) }))}
              />
            </Seccion>
            <Seccion titulo={ta.mejores} nota={ta.mejoresNotaGrupo}>
              <TablaAlumnos filas={a.mejores} vacio={ta.sinDestacados} />
            </Seccion>
            <Seccion
              titulo={ta.atencion}
              nota={formato(ta.atencionNotaGrupo, { n: APROBATORIA })}
              className="ring-red-200"
            >
              <TablaAlumnos filas={a.atencion} vacio={ta.nadieAtencion} motivos />
            </Seccion>
          </div>

          <Seccion titulo={ta.porActividad} nota={ta.porActividadNota}>
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">{ta.colActividad}</th>
                    <th className="pb-2 font-medium">{ta.colTipo}</th>
                    <th className="pb-2 text-right font-medium">{ta.colEntrega}</th>
                    <th className="pb-2 text-right font-medium">{ta.colPromedio}</th>
                    <th className="pb-2 text-right font-medium" title={ta.colPromEntregadosTitulo}>{ta.colPromEntregados}</th>
                    <th className="pb-2 text-right font-medium">{ta.colMediana}</th>
                    <th className="pb-2 text-right font-medium">{ta.colDesv}</th>
                    <th className="pb-2 text-right font-medium">{ta.colMin}</th>
                    <th className="pb-2 text-right font-medium">{ta.colMax}</th>
                    <th className="pb-2 text-right font-medium">{ta.colAprobacion}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {a.actividades.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-3">
                        <Link href={`/profesor/actividades/${s.id}/analiticas`} className="font-medium text-slate-800 hover:text-tinta-700">
                          {s.titulo}
                        </Link>
                        <span className="block text-xs text-slate-500">
                          {fechaLarga(s.fecha, locale)}
                          {s.pendientes > 0 && formato(ta.porEvaluar, { n: s.pendientes })}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{s.etiqueta ?? "—"}</td>
                      <td className="py-2 text-right text-slate-600">{s.tasaEntrega}%</td>
                      <td className={`py-2 text-right font-semibold ${tonoPuntaje(s.promedio)}`}>{num(s.promedio)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.promedioEntregadas)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.mediana)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.desviacion)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.minima)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.maxima)}</td>
                      <td className="py-2 text-right text-slate-700">{s.aprobacion}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.sinResultados.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                {formato(ta.sinResultados, { lista: a.sinResultados.map((s) => s.titulo).join(", ") })}
              </p>
            )}
          </Seccion>
        </div>
      )}
    </>
  );
}
