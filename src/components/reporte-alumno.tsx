// Formato de retroalimentación (lo ven el alumno y el profesor):
// 1) identificación de la actividad, el alumno y los temas, 2) retroalimentación con base en
// la rúbrica (aspectos positivos y de mejora, puntos por reactivo), 3) la hoja corregida con
// palomas verdes y marcas rojas con anotaciones, 4) recomendaciones de estudio (videos y ejercicios).
import type { ReactNode } from "react";
import { idYouTube, recursosParaTemas } from "@/lib/recursos";
import { enlaceVideo } from "@/lib/videos";
import type { Actividad, Alumno, Entrega, Grupo } from "@/lib/tipos";
import { calificacion, escalaDe, formatoCal, puntosObtenidos, puntosTotales } from "@/lib/estadisticas";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { TextoMat } from "./texto-mat";
import { colorCalificacion, fechaLarga } from "./ui";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

export async function ReporteAlumno({
  actividad,
  alumno,
  entrega,
  grupo,
  accionEstudio,
}: {
  actividad: Actividad;
  alumno: Alumno;
  entrega: Entrega;
  grupo: Grupo;
  /** Botón del profesor para (re)generar las recomendaciones de estudio. */
  accionEstudio?: ReactNode;
}) {
  const { t, locale } = await textos();
  const tr = t.profesor.reporte;
  const nombreTipo: Record<string, string> = tr.tipos;
  const temas = [...new Set(actividad.reactivos.map((r) => r.tema).filter(Boolean))];
  const recursos = recursosParaTemas(actividad, entrega.estudio?.temas ?? []);
  const cal = calificacion(actividad, entrega);
  const escala = escalaDe(actividad);
  const grupoTexto = `${grupo.materia} · ${grupo.nombre}`;
  return (
    <article className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr.identificacion}</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">{tr.nombre}</dt>
            <dd className="font-medium">{alumno.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.matricula}</dt>
            <dd className="font-mono">{alumno.matricula}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.grupo}</dt>
            <dd>{grupoTexto}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.actividad}</dt>
            <dd>{actividad.titulo}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-slate-500">{temas.length === 1 ? tr.tema : tr.temas}</dt>
            <dd>{temas.join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.fecha}</dt>
            <dd>{fechaLarga(actividad.fechaAplicacion, locale)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.calificacion}</dt>
            <dd className={`text-2xl font-semibold ${colorCalificacion(cal, escala)}`}>
              {formatoCal(cal, escala)} <span className="text-sm font-normal text-slate-500">/ {escala}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr.retro}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-acierto-suave/60 p-4">
            <h3 className="font-medium text-acierto">{tr.positivos}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.positivos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-error-suave/60 p-4">
            <h3 className="font-medium text-error">{tr.mejora}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.mejoras.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {recursos.lecturas.length > 0 && (
              <p className="mt-3 text-xs text-slate-600">
                {tr.repasar}{" "}
                {recursos.lecturas.map((l, i) => (
                  <span key={l.url}>
                    {i > 0 && " · "}
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-tinta-700 hover:underline">
                      {l.fuente}
                    </a>
                  </span>
                ))}{" "}
                (OpenStax)
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">{tr.reactivo}</th>
                <th className="py-2 pr-3 font-medium">{tr.tipo}</th>
                <th className="py-2 pr-3 font-medium">{tr.temaCol}</th>
                <th className="py-2 pr-3 font-medium">{tr.comentario}</th>
                <th className="py-2 text-right font-medium">{tr.puntos}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actividad.reactivos.map((r) => {
                const res = entrega.resultados.find((x) => x.numero === r.numero)!;
                const completo = res.puntosObtenidos === r.puntos;
                return (
                  <tr key={r.numero}>
                    <td className="py-2 pr-3 font-medium">{r.numero}</td>
                    <td className="py-2 pr-3 text-slate-600">{nombreTipo[r.tipo]}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.tema}</td>
                    <td className="py-2 pr-3 text-slate-700">{res.comentario}</td>
                    <td className={`py-2 text-right font-medium ${completo ? "text-acierto" : "text-error"}`}>
                      {res.puntosObtenidos}/{r.puntos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300">
                <td colSpan={4} className="py-2 font-medium">
                  {tr.total}
                </td>
                <td className="py-2 text-right font-semibold">
                  {puntosObtenidos(entrega)}/{puntosTotales(actividad)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {tr.corregida}
        </h2>
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            <span className="font-semibold text-acierto">{tr.verde}</span>{tr.verdeTexto}
          </span>
          <span>
            <span className="font-semibold text-error">{tr.rojo}</span>{tr.rojoTexto}
          </span>
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: paginasDe(actividad, entrega) }, (_, i) => (
            <HojaEntrega
              key={i}
              actividad={actividad}
              pagina={i + 1}
              alumno={alumno}
              entrega={entrega}
              grupoTexto={grupoTexto}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tr.estudio}</h2>
          {accionEstudio}
        </div>
        {entrega.estudio ? (
          <>
            {entrega.estudio.temas.length > 0 && (
              <p className="mt-2 text-sm text-slate-700">
                {tr.repasa} <strong className="font-semibold"><TextoMat texto={entrega.estudio.temas.join(" · ")} /></strong>
              </p>
            )}
            <h3 className="mt-5 font-medium">{tr.videos}</h3>
            {recursos.videos.length > 0 ? (
              <ul className="mt-2 grid gap-3 md:grid-cols-3">
                {recursos.videos.map((v) => {
                  const id = idYouTube(v.url);
                  return (
                    <li key={v.url}>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-full flex-col overflow-hidden rounded-lg ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        {id ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" className="aspect-video w-full bg-slate-100 object-cover" loading="lazy" />
                        ) : (
                          <span className="flex aspect-video w-full items-center justify-center bg-acierto-suave text-sm font-semibold text-acierto">
                            Khan Academy
                          </span>
                        )}
                        <span className="p-3 text-sm">
                          <span className="block font-medium text-slate-900">{v.titulo}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{v.fuente}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="mt-2 grid gap-3 md:grid-cols-3">
                {entrega.estudio.videos.map((v) => (
                  <li key={v.busqueda}>
                    <a
                      href={enlaceVideo(v.busqueda)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-full items-start gap-3 rounded-lg p-3 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error-suave text-error" aria-hidden>
                        ▶
                      </span>
                      <span className="text-sm">
                        <span className="block font-medium text-slate-900">{v.titulo}</span>
                        <span className="mt-0.5 block text-xs text-tinta-700">{tr.buscarYoutube}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {recursos.lecturas.length > 0 && (
              <>
                <h3 className="mt-6 font-medium">{tr.lecturas}</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {recursos.lecturas.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-tinta-700 hover:underline">
                        {l.titulo} ↗
                      </a>
                      <span className="text-xs text-slate-500"> · {l.fuente}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h3 className="mt-6 font-medium">{tr.ejercicios}</h3>
            <p className="text-xs text-slate-500">{tr.ejerciciosAyuda}</p>
            <ol className="mt-3 space-y-3">
              {entrega.estudio.ejercicios.map((e, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    {formato(tr.ejercicio, { n: i + 1 })} · <TextoMat texto={e.tema} negritas="font-semibold" />
                  </p>
                  <p className="mt-1 text-slate-800">
                    <TextoMat texto={e.enunciado} />
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-tinta-700">{tr.verRespuesta}</summary>
                    <p className="mt-1 font-medium text-acierto">
                      <TextoMat texto={e.respuesta} negritas="font-semibold" />
                    </p>
                  </details>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{tr.noListas}</p>
        )}
      </section>
    </article>
  );
}
