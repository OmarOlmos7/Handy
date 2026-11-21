// Formato de retroalimentación (lo ven el alumno y el profesor), en este orden:
// 1) datos de la entrega (alumno, actividad, temas, fechas y calificación), 2) la hoja entregada
// con palomas verdes, taches rojos, anotaciones y puntos de cada reactivo junto a su respuesta,
// 3) resumen del desempeño (aspectos positivos y de mejora), 4) recomendaciones de mejora
// (hasta 3 videos, Khan Academy primero; lecturas de OpenStax; ejercicios) y 5) la solución.
import { actividadDeVersion } from "@/lib/versiones";
import type { ReactNode } from "react";
import { idYouTube, recursosParaTemas } from "@/lib/recursos";
import { enlaceVideo } from "@/lib/videos";
import { fechaHoraLarga } from "@/lib/resultados";
import type { Actividad, Alumno, Entrega, Grupo } from "@/lib/tipos";
import { calificacion, escalaDe, formatoCal, puntosObtenidos, puntosTotales } from "@/lib/estadisticas";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { RespuestasEntrega } from "./respuestas-entrega";
import { esPlataforma } from "@/lib/plataforma";
import { TextoMat } from "./texto-mat";
import { colorCalificacion, fechaLarga } from "./ui";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";
import { conPuntaje } from "@/lib/modalidad";

const titulo = "text-xs font-semibold uppercase tracking-wide text-slate-500";
const tarjeta = "rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200";

export async function ReporteAlumno({
  actividad: actividadBase,
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
  // El alumno ve el texto y la solución de su versión de la hoja.
  const actividad = actividadDeVersion(actividadBase, entrega.version);
  const { t, locale } = await textos();
  const tr = t.profesor.reporte;
  const temas = [...new Set(actividad.reactivos.map((r) => r.tema).filter(Boolean))];
  const recursos = recursosParaTemas(actividad, entrega.estudio?.temas ?? []);
  const videosBusqueda = (entrega.estudio?.videos ?? []).slice(0, 3);
  const cal = calificacion(actividad, entrega);
  const escala = escalaDe(actividad);
  const grupoTexto = `${grupo.materia} · ${grupo.nombre}`;
  const entregadaEn = entrega.entregadaEn ? fechaHoraLarga(entrega.entregadaEn, locale) : null;
  const puntaje = conPuntaje(actividad);
  const conSolucion = actividad.reactivos.some((r) => r.respuesta.trim() || r.solucionPasos?.length);

  return (
    <article className="space-y-6">
      {/* 1. Datos de la entrega */}
      <section className={tarjeta}>
        <h2 className={titulo}>{tr.identificacion}</h2>
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
          <div className="sm:col-span-2">
            <dt className="text-slate-500">{temas.length === 1 ? tr.tema : tr.temas}</dt>
            <dd>{temas.join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.fecha}</dt>
            <dd>{fechaLarga(actividad.fechaAplicacion, locale)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.entregada}</dt>
            <dd>{entregadaEn ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{tr.calificacion}</dt>
            {puntaje ? (
              <dd className={`text-2xl font-semibold ${colorCalificacion(cal, escala)}`}>
                {formatoCal(cal, escala)} <span className="text-sm font-normal text-slate-500">/ {escala}</span>
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({puntosObtenidos(entrega)}/{puntosTotales(actividad)} {tr.puntos.toLowerCase()})
                </span>
              </dd>
            ) : (
              <dd className="font-medium text-slate-700">{tr.sinPuntaje}</dd>
            )}
          </div>
        </dl>
      </section>

      {/* 2. En plataforma: cada respuesta con sus puntos y comentario */}
      {esPlataforma(actividad) ? (
        <section>
          <h2 className={`mb-3 ${titulo}`}>{tr.respuestasCalificadas}</h2>
          <RespuestasEntrega actividad={actividad} entrega={entrega} t={t} puntaje={puntaje} />
        </section>
      ) : (
      /* 2. La hoja entregada, con las anotaciones junto a cada respuesta */
      <section>
        <h2 className={`mb-3 ${titulo}`}>{tr.corregida}</h2>
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
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xs font-medium text-slate-500">{puntaje ? tr.puntosReactivo : tr.aciertosReactivo}</h3>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {actividad.reactivos.map((r) => {
              const res = entrega.resultados.find((x) => x.numero === r.numero);
              const obtenidos = res?.puntosObtenidos ?? 0;
              const completo = obtenidos >= r.puntos;
              return (
                <li
                  key={r.numero}
                  className={`rounded-full px-3 py-1 font-medium ring-1 ${
                    completo ? "bg-acierto-suave/60 text-acierto ring-acierto/30" : "bg-error-suave/60 text-error ring-error/30"
                  }`}
                >
                  {completo ? "✓" : "✗"} {tr.reactivo} {r.numero}
                  {puntaje && ` · ${obtenidos}/${r.puntos}`}
                </li>
              );
            })}
            {puntaje && (
              <li className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                {tr.total} · {puntosObtenidos(entrega)}/{puntosTotales(actividad)}
              </li>
            )}
          </ul>
        </div>
      </section>
      )}

      {/* 3. Resumen del desempeño */}
      <section className={tarjeta}>
        <h2 className={titulo}>{tr.retro}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-acierto-suave/60 p-4">
            <h3 className="font-medium text-acierto">{tr.positivos}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.positivos.map((p) => (
                <li key={p}>
                  <TextoMat texto={p} />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-error-suave/60 p-4">
            <h3 className="font-medium text-error">{tr.mejora}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.mejoras.map((p) => (
                <li key={p}>
                  <TextoMat texto={p} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Recomendaciones de mejora */}
      <section className={tarjeta}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className={titulo}>{tr.estudio}</h2>
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
                {videosBusqueda.map((v) => (
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
            {entrega.estudio.ejercicios.length > 0 && (
              <>
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
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{tr.noListas}</p>
        )}
      </section>

      {/* 5. Solución */}
      {conSolucion && (
        <section className={tarjeta}>
          <h2 className={titulo}>{tr.solucion}</h2>
          <p className="mt-1 text-xs text-slate-500">{tr.solucionAyuda}</p>
          <ol className="mt-4 space-y-4">
            {actividad.reactivos.map((r) => (
              <li key={r.numero} className="rounded-lg p-4 text-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium text-slate-500">
                  {tr.reactivo} {r.numero}
                  {r.tema && (
                    <>
                      {" · "}
                      <TextoMat texto={r.tema} />
                    </>
                  )}
                </p>
                {r.enunciado && (
                  <p className="mt-1 text-slate-800">
                    <TextoMat texto={r.enunciado} />
                  </p>
                )}
                {r.solucionPasos && r.solucionPasos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">{tr.procedimiento}</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-700">
                      {r.solucionPasos.map((paso, i) => (
                        <li key={i}>
                          <TextoMat texto={paso} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {r.respuesta.trim() && (
                  <p className="mt-3 font-medium text-acierto">
                    {tr.respuesta} <TextoMat texto={r.respuesta} negritas="font-semibold" />
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
