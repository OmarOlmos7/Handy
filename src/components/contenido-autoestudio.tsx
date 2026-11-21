// Partes de una actividad autoasignada que se ven igual antes y después de resolverla: la lectura
// con sus fuentes y los videos del tema. Sin estado, para usarse en el servidor o en el cliente.
import { idYouTube } from "@/lib/recursos";
import type { Diccionario } from "@/lib/i18n/diccionario";
import type { LecturaAuto, RecursoEstudio } from "@/lib/tipos";
import { TextoMat } from "./texto-mat";
import katex from "katex";

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function Formula({ tex }: { tex: string }) {
  const limpia = tex.replace(/^\$+|\$+$/g, "");
  return <span className="block overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: katex.renderToString(limpia, { displayMode: true, throwOnError: false, strict: "ignore", output: "html" }) }} />;
}

export function LecturaVista({ lectura, t }: { lectura: LecturaAuto; t: Diccionario }) {
  const th = t.autoestudio.hacer;
  return (
    <article className="space-y-5">
      <p className="rounded-xl bg-tinta-50 px-4 py-3 text-[15px] leading-relaxed text-tinta-900">
        <TextoMat texto={lectura.introduccion} />
      </p>
      {lectura.secciones.map((s, i) => (
        <section key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">{s.titulo}</h3>
          <div className={`mt-2 ${s.ilustracion ? "sm:flex sm:items-start sm:gap-4" : ""}`}>
            <p className="flex-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">
              <TextoMat texto={s.texto} />
            </p>
            {s.ilustracion && (
              <figure className="mt-3 shrink-0 sm:mt-0 sm:w-56">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svgUrl(s.ilustracion)} alt={s.pie ?? ""} className="w-full rounded-lg bg-white ring-1 ring-slate-200" />
                {s.pie && <figcaption className="mt-1 text-center text-xs text-slate-500">{s.pie}</figcaption>}
              </figure>
            )}
          </div>
        </section>
      ))}
      {lectura.conceptos.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">{th.conceptos}</h3>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            {lectura.conceptos.map((c, i) => (
              <div key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="font-semibold text-tinta-700">
                  <TextoMat texto={c.termino} />
                </dt>
                <dd className="text-sm text-slate-700">
                  <TextoMat texto={c.definicion} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {lectura.ecuaciones.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">{th.ecuaciones}</h3>
          <ul className="mt-2 space-y-3">
            {lectura.ecuaciones.map((e, i) => (
              <li key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                <Formula tex={e.formula} />
                <p className="text-sm text-slate-700">
                  <TextoMat texto={e.descripcion} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lectura.ejemplos.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">{th.ejemplos}</h3>
          <div className="mt-2 space-y-3">
            {lectura.ejemplos.map((e, i) => (
              <div key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="whitespace-pre-line text-[15px] text-slate-800">
                  <TextoMat texto={e.enunciado} />
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-tinta-700">{th.verSolucion}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    <TextoMat texto={e.solucion} />
                  </p>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200 sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">{th.fuentes}</h3>
        <p className="mt-1 text-xs text-slate-500">{th.fuentesNota}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {lectura.fuentes.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-tinta-700 hover:underline">
                {f.titulo}
              </a>{" "}
              <span className="text-slate-500">· {f.sitio}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export function VideosVista({ videos, t }: { videos: RecursoEstudio[]; t: Diccionario }) {
  const th = t.autoestudio.hacer;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {videos.map((v) => {
        const yt = idYouTube(v.url);
        return (
          <figure key={v.url} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {yt ? (
              <div className="aspect-video w-full bg-slate-900">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
                  title={v.titulo}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-tinta-50 text-4xl">🎓</div>
            )}
            <figcaption className="px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">{v.titulo}</p>
              <p className="text-slate-500">{v.fuente}</p>
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium text-tinta-700 hover:underline">
                {yt ? th.verEnYoutube : th.abrirKhan} ↗
              </a>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
