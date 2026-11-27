// Ficha de instrucciones de una actividad en la web, con la misma calidad que la hoja impresa:
// encabezado con logo, curso · grupo, título, fecha y puntaje, QR para entregar, instrucciones
// numeradas en dos columnas (una en celular), criterios de evaluación en etiquetas y la forma de
// entrega. Sin nombre, matrícula ni recuadro de calificación: es la vista para leer, no para escribir.
// Sin estado: se usa en el servidor (página de entrega del alumno y vista previa del profesor).
import type { ReactNode } from "react";
import type { Actividad } from "@/lib/tipos";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { conPuntaje } from "@/lib/modalidad";
import { esPlataforma } from "@/lib/plataforma";
import { esEvidenciaDigital } from "@/lib/contenido";
import { TextoMat } from "./texto-mat";
import { fechaLarga } from "./ui";
import { escalaDe } from "@/lib/estadisticas";

/** Estilo de hoja de la web: el mismo ancho y papel en la ficha, la entrega y la rúbrica. */
export const HOJA = "rounded-2xl bg-white px-4 py-5 font-hoja text-slate-800 shadow-sm ring-1 ring-slate-200 sm:px-8 sm:py-7";

/** Hoja con encabezado (antetítulo, título y dato) y la raya gruesa, como la ficha de instrucciones. */
export function HojaWeb({
  antetitulo,
  titulo,
  dato,
  className = "",
  children,
}: {
  antetitulo: string;
  titulo: string;
  dato?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${HOJA} ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tinta-600 sm:text-xs sm:tracking-[0.3em]">{antetitulo}</p>
      <h2 className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">{titulo}</h2>
      {dato && <p className="mt-1 text-sm text-slate-500">{dato}</p>}
      <div className="mt-4 border-t-[3px] border-slate-800" />
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Rúbrica con la que se evaluará la actividad, para el alumno: criterios con su peso y
 * descripción, y los puntos de cada reactivo. Nunca muestra respuestas ni pasos de la solución.
 */
export function HojaRubrica({ actividad, t }: { actividad: Actividad; t: Diccionario }) {
  const tf = t.contenido.ficha;
  const th = t.profesor.hojaImpresa;
  const criterios = (actividad.criterios ?? []).filter((c) => c.nombre.trim());
  const puntos = conPuntaje(actividad) && actividad.reactivos.length > 1 ? actividad.reactivos : [];
  if (!criterios.length && !puntos.length) return null;
  const conPeso = criterios.some((c) => c.porcentaje > 0);
  return (
    <HojaWeb
      antetitulo={tf.rubricaTitulo}
      titulo={actividad.titulo}
      dato={conPuntaje(actividad) ? formato(tf.rubricaEscala, { e: escalaDe(actividad) }) : tf.rubricaSubtitulo}
      className="hoja-rubrica"
    >
      {criterios.length > 0 && (
        <ol className="divide-y divide-slate-200">
          {criterios.map((c, i) => (
            <li key={`${c.nombre}-${i}`} className="flex gap-3 py-3 first:pt-0 sm:gap-4">
              <span className="w-4 shrink-0 text-right text-[15px] font-bold text-tinta-600">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-[15px] font-bold text-slate-900">{c.nombre}</h3>
                  {conPeso && <span className="rounded-full bg-tinta-50 px-3 py-0.5 text-[13px] font-semibold text-tinta-600">{c.porcentaje}%</span>}
                </div>
                {c.descripcion.trim() && (
                  <p className="mt-1 text-[14px] leading-snug text-slate-600 [overflow-wrap:anywhere]">
                    <TextoMat texto={c.descripcion} />
                  </p>
                )}
                {conPeso && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-tinta-500" style={{ width: `${Math.min(100, Math.max(0, c.porcentaje))}%` }} />
                  </div>
                )}
                {c.reactivos && c.reactivos.length > 0 && actividad.reactivos.length > 1 && (
                  <p className="mt-1.5 text-xs font-medium text-slate-500">{formato(c.reactivos.length === 1 ? tf.aplicaUno : tf.aplicaA, { n: c.reactivos.join(", ") })}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {puntos.length > 0 && (
        <div className={criterios.length ? "mt-4 border-t border-slate-200 pt-4" : ""}>
          <p className="text-[13px] font-bold text-slate-900">{tf.puntosPorReactivo}</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-[13px]">
            {puntos.map((r) => (
              <li key={r.numero} className="flex items-center gap-1.5 rounded-full border border-slate-300 py-0.5 pl-0.5 pr-3 font-semibold text-slate-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tinta-600 text-xs font-bold text-white">{r.numero}</span>
                {r.puntos} {r.puntos === 1 ? th.pt : th.pts}
              </li>
            ))}
          </ul>
        </div>
      )}
    </HojaWeb>
  );
}

/** Flechas escritas como "->" se ven como en la hoja impresa. */
const conFlechas = (s: string) => s.replace(/\s->\s/g, " → ").replace(/\s=>\s/g, " ⇒ ");

/** Cómo entrega el alumno esta actividad: el texto de la etiqueta y su ícono. */
export function modalidadEntrega(actividad: Actividad, t: Diccionario): { icono: string; texto: string } {
  const tf = t.contenido.ficha;
  if (actividad.contenido) {
    return esEvidenciaDigital(actividad) ? { icono: "💻", texto: tf.digital } : { icono: "✍️", texto: tf.manuscrita };
  }
  if (esPlataforma(actividad)) return { icono: "💻", texto: tf.enPlataforma };
  return { icono: "✍️", texto: tf.impresa };
}

export function FichaInstrucciones({
  actividad,
  curso,
  t,
  locale,
  logo = "/logo.png",
  qrSrc,
  qrEnCelular = true,
  version,
  children,
}: {
  actividad: Actividad;
  /** "Materia · Grupo". */
  curso: string;
  t: Diccionario;
  locale?: string;
  /** Logo del profesor si subió uno; si no, el de iEureka-Grader. */
  logo?: string;
  /** QR de la página de entrega. Sin él, el encabezado no lo muestra. */
  qrSrc?: string;
  /** En celular el alumno ya está en la página: el QR solo estorba. */
  qrEnCelular?: boolean;
  /** Letra de la versión (A, B…) cuando la actividad tiene varias. */
  version?: string;
  /** Algo más al pie de la ficha (por ejemplo, el enlace para compartir). */
  children?: ReactNode;
}) {
  const th = t.profesor.hojaImpresa;
  const tf = t.contenido.ficha;
  const instrucciones = (actividad.instruccionesAlumno ?? []).map((x) => x.trim()).filter(Boolean);
  const criterios = (actividad.criterios ?? []).filter((c) => c.porcentaje > 0);
  const total = actividad.reactivos.reduce((s, r) => s + r.puntos, 0);
  const n = actividad.reactivos.length;
  const datos = [
    fechaLarga(actividad.fechaAplicacion, locale),
    // Una actividad de contenido con una sola evidencia no tiene "reactivos" que contar.
    actividad.contenido ? (conPuntaje(actividad) && total > 0 ? formato(tf.puntos, { p: total }) : "") : formato(conPuntaje(actividad) ? th.resumen : th.resumenSinPuntos, { n, p: total }),
  ].filter(Boolean);
  const modalidad = modalidadEntrega(actividad, t);

  return (
    <article className={`ficha-instrucciones ${HOJA}`}>
      <header className="flex items-start gap-4 sm:gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="h-12 w-auto max-w-[6rem] shrink-0 object-contain sm:h-[74px] sm:max-w-[10rem]" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.2em] text-tinta-600 sm:text-xs sm:tracking-[0.3em]">
            <span className="min-w-0 break-words">{curso}</span>
            {version && (
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[12px] tracking-[0.15em] text-white">{formato(t.comun.version, { v: version })}</span>
            )}
          </p>
          <h1 className="mt-1 break-words text-2xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-[28px]">{actividad.titulo}</h1>
          {datos.length > 0 && <p className="mt-1.5 text-sm text-slate-500">{datos.join(" · ")}</p>}
        </div>
        {qrSrc && (
          <div
            className={`w-[104px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 p-2 sm:w-[130px] ${qrEnCelular ? "flex" : "hidden sm:flex"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={th.altQr} className="h-[84px] w-[84px] sm:h-[100px] sm:w-[100px]" />
            <span className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-slate-500">{th.escanea}</span>
          </div>
        )}
      </header>

      <div className="mt-4 border-t-[3px] border-slate-800 sm:mt-5" />

      {instrucciones.length > 0 && (
        <ol className="mt-4 grid gap-x-10 gap-y-2.5 text-[15px] leading-snug text-slate-700 sm:grid-cols-2">
          {instrucciones.map((ins, i) => (
            <li key={i} className="flex min-w-0 gap-2.5">
              <span className="w-4 shrink-0 text-right font-bold text-tinta-600">{i + 1}</span>
              <span className="min-w-0 [overflow-wrap:anywhere] [&_.katex]:whitespace-normal">
                <TextoMat texto={conFlechas(ins)} />
              </span>
            </li>
          ))}
        </ol>
      )}

      {criterios.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="mr-1 font-bold text-slate-900">{n > 1 && !actividad.contenido ? th.evaluacionPorProblema : tf.evaluacion}</span>
          {criterios.map((c) => (
            <span key={c.nombre} className="rounded-full bg-tinta-50 px-3 py-0.5 font-semibold text-tinta-600">
              {c.nombre} {c.porcentaje}%
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="mr-1 font-bold text-slate-900">{tf.entrega}</span>
        <span className="rounded-full bg-white px-3 py-0.5 font-medium text-tinta-700 ring-1 ring-tinta-200">
          {modalidad.icono} {modalidad.texto}
        </span>
      </p>

      {children && <div className="mt-4 border-t border-slate-200 pt-4">{children}</div>}
    </article>
  );
}
