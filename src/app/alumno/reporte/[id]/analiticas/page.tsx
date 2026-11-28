import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BarrasH, LeyendaDesempeno, Pastel } from "@/components/graficas";
import { Cifra, Seccion, num } from "@/components/tablero";
import { BotonLink, Encabezado, Tarjeta, colorCalificacion } from "@/components/ui";
import { YoVsGrupo } from "@/components/yo-vs-grupo";
import { actividadDe, leer } from "@/lib/almacen";
import { APROBATORIA } from "@/lib/analiticas";
import { formatoCal } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { MINIMO_COMPARACION, analiticasAlumnoActividad } from "@/lib/portal-alumno";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.analiticas.tituloActividad };
}

/** Analíticas de aprendizaje del alumno en una actividad ya liberada. */
export default async function AnaliticasActividadAlumno({ params }: PageProps<"/alumno/reporte/[id]/analiticas">) {
  const { id } = await params;
  const sesion = await alumnoActual();
  if (!sesion) redirect("/alumno");
  const db = await leer();
  const actividad = actividadDe(db, id);
  const curso = actividad && sesion.cursos.find((c) => c.grupo.id === actividad.grupoId);
  if (!actividad || !curso) notFound();
  const { t, locale } = await textos();
  const ta = t.alumno.analiticas;
  const { grupo } = curso;
  const nombreCurso = `${grupo.materia} · ${grupo.nombre}`;
  const migas = [
    { texto: t.alumno.panel.titulo, href: "/alumno" },
    { texto: nombreCurso, href: `/alumno/cursos/${grupo.id}` },
    { texto: actividad.titulo, href: `/alumno/reporte/${id}` },
  ];
  if (!resultadosDisponibles(actividad)) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={ta.tituloActividad} subtitulo={actividad.titulo} />
        <Tarjeta className="text-sm text-slate-700">
          {t.alumno.reporte.noDisponibleAntes} <strong>{fechaHoraLarga(actividad.resultadosDesde!, locale)}</strong> {t.alumno.reporte.noDisponibleDespues}
        </Tarjeta>
      </>
    );
  }
  const grupoEntregas = db.entregas.filter((e) => e.actividadId === id && grupo.alumnos.some((al) => al.matricula === e.matricula));
  const a = analiticasAlumnoActividad(actividad, grupoEntregas, curso.alumno.matricula);
  if (!a) notFound();
  const obtenidos = a.reactivos.reduce((s, r) => s + r.obtenidos, 0);
  const posibles = a.reactivos.reduce((s, r) => s + r.puntos, 0);
  const conGrupo = a.reactivos.filter((r) => r.grupo !== null);

  return (
    <>
      <Encabezado
        migas={migas}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={ta.tituloActividad}
        subtitulo={actividad.titulo}
        acciones={<BotonLink variante="secundario" href={`/alumno/reporte/${id}`}>{ta.verRetro}</BotonLink>}
      />
      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{ta.miCalificacion}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${colorCalificacion(a.calificacion, a.escala)}`}>{formatoCal(a.calificacion, a.escala)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formato(ta.sobre, { e: a.escala })} · {a.aprobada ? ta.aprobada : ta.noAprobada}
            </p>
          </div>
          <Cifra titulo={ta.puntos} valor={`${num(obtenidos)} / ${num(posibles)}`} detalle={`${num(a.sobre100)}%`} />
          <Cifra
            titulo={ta.promedioGrupo}
            valor={a.grupo ? num(a.grupo.promedio) : "—"}
            detalle={a.grupo ? ta.sobre100 : formato(ta.sinGrupo, { n: MINIMO_COMPARACION })}
          />
          <Cifra titulo={ta.medianaGrupo} valor={a.grupo ? num(a.grupo.mediana) : "—"} detalle={a.grupo ? ta.sobre100 : formato(ta.sinGrupo, { n: MINIMO_COMPARACION })} />
        </div>

        <div className="flex justify-end">
          <LeyendaDesempeno aprobatoria={APROBATORIA} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Seccion titulo={ta.puntos}>
            <Pastel
              centro={`${num(a.sobre100)}%`}
              subcentro={ta.logrados}
              rebanadas={[
                { nombre: ta.logrados, valor: obtenidos, color: "#22c55e" },
                { nombre: ta.noLogrados, valor: Math.max(0, posibles - obtenidos), color: "#ef4444" },
              ]}
            />
          </Seccion>
          <Seccion titulo={ta.reactivos} nota={ta.reactivosNota}>
            {conGrupo.length === a.reactivos.length && conGrupo.length > 0 ? (
              <YoVsGrupo
                aprobatoria={APROBATORIA}
                yo={ta.yo}
                grupo={ta.grupo}
                sufijo="%"
                filas={a.reactivos.map((r) => ({ nombre: formato(ta.reactivo, { n: r.numero }), detalle: r.tema, yo: r.acierto, grupo: r.grupo! }))}
              />
            ) : (
              <BarrasH
                aprobatoria={APROBATORIA}
                sufijo="%"
                filas={a.reactivos.map((r) => ({ nombre: formato(ta.reactivo, { n: r.numero }), valor: r.acierto, detalle: r.tema || undefined }))}
              />
            )}
          </Seccion>
          <Seccion titulo={ta.temas} nota={ta.temasNota}>
            <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temas.map((x) => ({ nombre: x.nombre, valor: x.acierto }))} />
          </Seccion>
          {a.habilidades.length > 0 && (
            <Seccion titulo={ta.habilidades} nota={ta.habilidadesNota}>
              <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.habilidades.map((x) => ({ nombre: x.nombre, valor: x.acierto }))} />
            </Seccion>
          )}
        </div>
      </div>
    </>
  );
}
