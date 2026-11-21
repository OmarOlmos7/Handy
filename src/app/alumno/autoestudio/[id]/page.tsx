import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LecturaVista, VideosVista } from "@/components/contenido-autoestudio";
import { HacerAutoactividad, type EjercicioAlumno } from "@/components/hacer-autoactividad";
import { SentirAutoestudio } from "@/components/sentir-autoestudio";
import { TextoMat } from "@/components/texto-mat";
import { BotonLink, Encabezado, colorCalificacion } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { duracion } from "@/lib/autoestudio";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { letraDeOpcion, sinLetra } from "@/lib/plataforma";
import { alumnoActual } from "@/lib/sesion";
import type { Autoactividad, EjercicioAuto, ResultadoAuto } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.autoestudio.tabla.titulo };
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** La clave escrita para el alumno: la opción completa, las palabras o los pares. */
function claveLegible(ej: EjercicioAuto, t: Diccionario): string {
  const th = t.autoestudio.hacer;
  switch (ej.tipo) {
    case "opcion":
    case "multirespuesta": {
      const letras = ej.respuesta.toLowerCase().split(/[,\s]+/).filter(Boolean);
      return (ej.opciones ?? []).filter((o, i) => letras.includes(letraDeOpcion(o, i))).map((o, i) => `${letraDeOpcion(o, i)}) ${sinLetra(o)}`).join(" · ") || ej.respuesta;
    }
    case "verdadero_falso":
      return /^v/i.test(ej.respuesta) ? th.verdadero : th.falso;
    case "completar":
      return ej.respuesta.split("|").map((x) => x.trim()).join(" · ");
    default:
      return ej.respuesta;
  }
}

function Logro({ logro, t }: { logro: number; t: Diccionario }) {
  const th = t.autoestudio.hacer;
  const [clase, texto] = logro >= 1 ? ["bg-acierto-suave text-acierto", th.correcto] : logro > 0 ? ["bg-aviso-suave text-aviso", th.parcial] : ["bg-error-suave text-error", th.incorrecto];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>;
}

function Resultados({ act, t }: { act: Autoactividad; t: Diccionario }) {
  const th = t.autoestudio.hacer;
  const res = (n: number): ResultadoAuto | undefined => act.resultados?.find((r) => r.numero === n);
  const nota = act.calificacion ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{th.tuNota}</p>
          <p className={`text-4xl font-bold tabular-nums ${colorCalificacion(nota, 100)}`}>
            {nota}
            <span className="text-lg font-normal text-slate-400"> / 100</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{th.tiempo}</p>
          <p className="text-2xl font-semibold text-slate-800">{duracion(act.segundos)}</p>
        </div>
        <p className="flex-1 text-lg font-medium text-slate-800">{nota >= 85 ? th.alta : nota >= 60 ? th.media : th.baja}</p>
      </div>
      <SentirAutoestudio id={act.id} sentir={act.sentir} animo={act.animo} />
      {act.tarjetas?.map((tj, i) => {
        const r = res(i + 1);
        return (
          <section key={i} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900">
                <TextoMat texto={tj.frente} />
              </p>
              {r && <Logro logro={r.logro} t={t} />}
            </div>
            {r?.respuesta && <p className="mt-2 text-sm text-slate-600">{formato(th.tuRespuesta, { r: r.respuesta })}</p>}
            {r?.comentario && <p className="mt-1 text-sm text-slate-700">{r.comentario}</p>}
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
              <TextoMat texto={tj.reverso} />
            </p>
          </section>
        );
      })}
      {act.ejercicios?.map((ej) => {
        const r = res(ej.numero);
        return (
          <section key={ej.numero} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-tinta-700">
                {formato(th.ejercicio, { n: ej.numero })} · <span className="font-normal text-slate-500">{t.autoestudio.tiposEjercicio[ej.tipo]}</span>
              </h3>
              {r && <Logro logro={r.logro} t={t} />}
            </div>
            <div className={`mt-2 ${ej.ilustracion ? "sm:flex sm:items-start sm:gap-4" : ""}`}>
              <p className="flex-1 whitespace-pre-line text-[15px] text-slate-800">
                <TextoMat texto={ej.enunciado} />
              </p>
              {ej.ilustracion && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={svgUrl(ej.ilustracion)} alt="" className="mt-2 w-36 shrink-0 rounded-lg ring-1 ring-slate-200 sm:mt-0" />
              )}
            </div>
            {ej.tipo !== "manuscrito" && <p className="mt-2 text-sm text-slate-600">{formato(th.tuRespuesta, { r: r?.respuesta || th.sinRespuesta })}</p>}
            {r?.comentario && <p className="mt-1 text-sm text-slate-700">💬 {r.comentario}</p>}
            <div className="mt-2 rounded-lg bg-acierto-suave/50 px-3 py-2 text-sm text-slate-800">
              <p className="whitespace-pre-line">
                <TextoMat texto={formato(th.respuestaCorrecta, { r: claveLegible(ej, t) })} />
              </p>
              {ej.explicacion && (
                <p className="mt-1 text-slate-700">
                  <TextoMat texto={ej.explicacion} />
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Una actividad autoasignada: para resolverla o, ya terminada, con su resultado. */
export default async function PaginaAutoactividad({ params }: PageProps<"/alumno/autoestudio/[id]">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const db = await leer();
  const act = db.autoactividades?.find((a) => a.id === id && a.alumnoId === alumno.id);
  if (!act) notFound();
  const curso = alumno.cursos.find((c) => c.grupo.id === act.grupoId);
  const { t } = await textos();
  const ta = t.autoestudio;
  const contenido = act.lectura ? (
    <>
      <p className="text-sm text-slate-600">{ta.hacer.lecturaInstr}</p>
      <LecturaVista lectura={act.lectura} t={t} />
    </>
  ) : act.videos ? (
    <>
      <p className="text-sm text-slate-600">{ta.hacer.videosInstr}</p>
      <VideosVista videos={act.videos} t={t} />
    </>
  ) : undefined;
  // Mientras no termina, el alumno no recibe las claves ni las explicaciones.
  const sinClave: EjercicioAlumno[] = (act.ejercicios ?? []).map(({ respuesta: _r, explicacion: _e, ...resto }) => resto);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          ...(curso ? [{ texto: `${curso.grupo.materia} · ${curso.grupo.nombre}`, href: `/alumno/cursos/${curso.grupo.id}` }] : []),
          ...(curso ? [{ texto: ta.tabla.ver, href: `/alumno/cursos/${curso.grupo.id}/autoestudio` }] : []),
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={act.titulo}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{formato(ta.asignadaPor, { quien: ta.quienEstudiante })}</span>
            <span>
              {ta.tipos[act.tipo]} · {act.tema}
            </span>
          </span>
        }
      />
      <div className="mx-auto max-w-3xl">
        {act.estado === "completada" ? (
          <div className="space-y-6">
            <Resultados act={act} t={t} />
            {contenido && <div className="space-y-4">{contenido}</div>}
            <div className="flex flex-wrap gap-2">
              {curso && <BotonLink href={`/alumno/cursos/${curso.grupo.id}`}>✨ {ta.hacer.otra}</BotonLink>}
              {curso && (
                <BotonLink variante="secundario" href={`/alumno/cursos/${curso.grupo.id}/autoestudio`}>
                  {ta.hacer.tabla}
                </BotonLink>
              )}
            </div>
          </div>
        ) : (
          <HacerAutoactividad id={act.id} ejercicios={sinClave} tarjetas={act.tarjetas} contenido={contenido} tituloPreguntas={contenido ? ta.hacer.preguntas : undefined} />
        )}
      </div>
    </>
  );
}
