import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarrasH, Columnas, LeyendaDesempeno } from "@/components/graficas";
import { Cifra, Seccion, num, tonoPuntaje } from "@/components/tablero";
import { Encabezado, Tarjeta, fechaLarga } from "@/components/ui";
import { YoVsGrupo } from "@/components/yo-vs-grupo";
import { leer } from "@/lib/almacen";
import { APROBATORIA } from "@/lib/analiticas";
import { formatoCal } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { MINIMO_COMPARACION, analiticasAlumnoCurso } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.analiticas.tituloCurso };
}

/** Analíticas del alumno en un curso: solo sus actividades ya evaluadas y liberadas. */
export default async function AnaliticasCursoAlumno({ params }: PageProps<"/alumno/cursos/[id]/analiticas">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t, locale } = await textos();
  const ta = t.alumno.analiticas;
  const db = await leer();
  const a = analiticasAlumnoCurso(grupo, db.actividades, db.entregas, curso.alumno.matricula, new Date(), t.profesor.calculo.sinEtiqueta);
  const nombreCurso = `${grupo.materia} · ${grupo.nombre}`;
  const comparadas = a.evaluadas.filter((x) => x.grupo100 !== null);
  const fuertes = a.temas.filter((x) => x.acierto >= 80);
  const debiles = [...a.temas].filter((x) => x.acierto < APROBATORIA).reverse();

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: nombreCurso, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={ta.tituloCurso}
        subtitulo={formato(ta.subtituloCurso, { curso: nombreCurso })}
      />
      {a.evaluadas.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{ta.sinEvaluadas}</Tarjeta>
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Cifra titulo={ta.miPromedio} valor={num(a.promedio!)} detalle={ta.sobre100} />
            <Cifra titulo={ta.mediana} valor={num(a.mediana!)} detalle={ta.deMisCalificaciones} />
            <Cifra
              titulo={ta.promedioGrupo}
              valor={a.promedioGrupo === null ? "—" : num(a.promedioGrupo)}
              detalle={a.promedioGrupo === null ? formato(ta.sinGrupo, { n: MINIMO_COMPARACION }) : ta.sobre100}
            />
            <Cifra titulo={ta.aprobadas} valor={String(a.aprobadas)} detalle={formato(ta.deEvaluadas, { n: a.evaluadas.length, a: APROBATORIA })} />
            <Cifra titulo={ta.entrega} valor={`${a.tasaEntrega}%`} detalle={formato(ta.deEsperadas, { a: a.entregadas, b: a.esperadas })} />
          </div>

          <div className="flex justify-end">
            <LeyendaDesempeno aprobatoria={APROBATORIA} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Seccion titulo={ta.evolucion} nota={ta.evolucionNota}>
              <Columnas
                max={100}
                lineaEn={APROBATORIA}
                filas={a.evaluadas.map((x) => ({ nombre: x.titulo, valor: x.sobre100, detalle: fechaLarga(x.fecha, locale) }))}
              />
            </Seccion>
            <Seccion titulo={ta.vsGrupo} nota={formato(ta.vsGrupoNota, { n: MINIMO_COMPARACION })}>
              {comparadas.length === 0 ? (
                <p className="text-sm text-slate-500">{formato(ta.sinGrupo, { n: MINIMO_COMPARACION })}</p>
              ) : (
                <YoVsGrupo
                  aprobatoria={APROBATORIA}
                  yo={ta.yo}
                  grupo={ta.grupo}
                  filas={comparadas.map((x) => ({ nombre: x.titulo, yo: x.sobre100, grupo: x.grupo100! }))}
                />
              )}
            </Seccion>
            <Seccion titulo={ta.temas} nota={ta.temasNota}>
              <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temas.map((x) => ({ nombre: x.nombre, valor: x.acierto }))} />
            </Seccion>
            <Seccion titulo={ta.porTipo} nota={ta.porTipoNota}>
              <BarrasH
                aprobatoria={APROBATORIA}
                filas={a.porTipo.map((x) => ({
                  nombre: x.nombre,
                  valor: x.valor,
                  detalle: formato(x.cantidad === 1 ? t.profesor.comun.actividad1 : t.profesor.comun.actividadN, { n: x.cantidad }),
                }))}
              />
            </Seccion>
            <Seccion titulo={ta.fortalezas} nota={ta.fortalezasNota}>
              {fuertes.length === 0 ? (
                <p className="text-sm text-slate-500">{ta.ninguno}</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {fuertes.slice(0, 5).map((x) => (
                    <li key={x.nombre} className="flex justify-between gap-3">
                      <span className="text-slate-700">{x.nombre}</span>
                      <span className="font-semibold tabular-nums text-acierto">{num(x.acierto)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
            <Seccion titulo={ta.aReforzar} nota={formato(ta.aReforzarNota, { n: APROBATORIA })} className={debiles.length ? "ring-red-200" : ""}>
              {debiles.length === 0 ? (
                <p className="text-sm text-slate-500">{ta.ninguno}</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {debiles.slice(0, 5).map((x) => (
                    <li key={x.nombre} className="flex justify-between gap-3">
                      <span className="text-slate-700">{x.nombre}</span>
                      <span className="font-semibold tabular-nums text-error">{num(x.acierto)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
            {a.habilidades.length > 0 && (
              <Seccion titulo={ta.habilidades} nota={ta.habilidadesNota}>
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.habilidades.map((x) => ({ nombre: x.nombre, valor: x.acierto }))} />
              </Seccion>
            )}
          </div>

          <Seccion titulo={t.alumno.cuaderno.titulo}>
            <ul className="divide-y divide-slate-100 text-sm">
              {[...a.evaluadas].reverse().map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/alumno/reporte/${x.id}/analiticas`} className="min-w-0 hover:text-tinta-700">
                    <span className="block truncate font-medium text-slate-800">{x.titulo}</span>
                    <span className="block text-xs text-slate-500">{fechaLarga(x.fecha, locale)}</span>
                  </Link>
                  <span className={`shrink-0 font-semibold tabular-nums ${tonoPuntaje(x.sobre100)}`}>
                    {formatoCal(x.calificacion, x.escala)}
                    <span className="text-xs font-normal text-slate-400"> / {x.escala}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      )}
    </>
  );
}
