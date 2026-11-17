// Formato de retroalimentación (lo ven el alumno y el profesor):
// 1) identificación de la actividad, el alumno y los temas, 2) retroalimentación con base en
// la rúbrica (aspectos positivos y de mejora, puntos por reactivo), 3) la hoja corregida con
// palomas verdes y marcas rojas con anotaciones, 4) recomendaciones de estudio (videos y ejercicios).
import type { ReactNode } from "react";
import { enlaceVideo } from "@/lib/videos";
import type { Actividad, Alumno, Entrega, Grupo } from "@/lib/tipos";
import { calificacion, escalaDe, formatoCal, puntosObtenidos, puntosTotales } from "@/lib/estadisticas";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { TextoMat } from "./texto-mat";
import { colorCalificacion, fechaLarga } from "./ui";

const nombreTipo: Record<string, string> = {
  verdadero_falso: "Verdadero o falso",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación de columnas",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Respuesta abierta",
};

export function ReporteAlumno({
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
  const temas = [...new Set(actividad.reactivos.map((r) => r.tema).filter(Boolean))];
  const cal = calificacion(actividad, entrega);
  const escala = escalaDe(actividad);
  const grupoTexto = `${grupo.materia} · ${grupo.nombre}`;
  return (
    <article className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Identificación</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium">{alumno.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Matrícula</dt>
            <dd className="font-mono">{alumno.matricula}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Grupo</dt>
            <dd>{grupoTexto}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Actividad</dt>
            <dd>{actividad.titulo}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-slate-500">{temas.length === 1 ? "Tema" : "Temas"}</dt>
            <dd>{temas.join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fecha de aplicación</dt>
            <dd>{fechaLarga(actividad.fechaAplicacion)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Calificación</dt>
            <dd className={`text-2xl font-semibold ${colorCalificacion(cal, escala)}`}>
              {formatoCal(cal, escala)} <span className="text-sm font-normal text-slate-500">/ {escala}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Retroalimentación con base en la rúbrica</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-acierto-suave/60 p-4">
            <h3 className="font-medium text-acierto">Aspectos positivos</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.positivos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-error-suave/60 p-4">
            <h3 className="font-medium text-error">Aspectos de mejora</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.mejoras.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Reactivo</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Tema</th>
                <th className="py-2 pr-3 font-medium">Comentario</th>
                <th className="py-2 text-right font-medium">Puntos</th>
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
                  Total
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
          3. Tu actividad corregida
        </h2>
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            <span className="font-semibold text-acierto">✓ verde</span>: respuesta correcta
          </span>
          <span>
            <span className="font-semibold text-error">✗ rojo</span>: hay un error; la anotación dice qué revisar
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">4. Recomendaciones de estudio</h2>
          {accionEstudio}
        </div>
        {entrega.estudio ? (
          <>
            {entrega.estudio.temas.length > 0 && (
              <p className="mt-2 text-sm text-slate-700">
                Repasa: <strong className="font-semibold"><TextoMat texto={entrega.estudio.temas.join(" · ")} /></strong>
              </p>
            )}
            <h3 className="mt-5 font-medium">Videos con ejercicios resueltos</h3>
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
                      <span className="mt-0.5 block text-xs text-tinta-700">Buscar en YouTube ↗</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-medium">Ejercicios para practicar en casa</h3>
            <p className="text-xs text-slate-500">Resuélvelos y compara tu resultado con la respuesta. No incluye el procedimiento.</p>
            <ol className="mt-3 space-y-3">
              {entrega.estudio.ejercicios.map((e, i) => (
                <li key={i} className="rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    Ejercicio {i + 1} · <TextoMat texto={e.tema} negritas="font-semibold" />
                  </p>
                  <p className="mt-1 text-slate-800">
                    <TextoMat texto={e.enunciado} />
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-tinta-700">Ver respuesta</summary>
                    <p className="mt-1 font-medium text-acierto">
                      <TextoMat texto={e.respuesta} negritas="font-semibold" />
                    </p>
                  </details>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Las recomendaciones de estudio aún no están listas.</p>
        )}
      </section>
    </article>
  );
}
