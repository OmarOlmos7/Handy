import Link from "next/link";
import { Insignia, colorCalificacion, fechaLarga } from "@/components/ui";
import { calificacion, escalaDe, formatoCal } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { conPuntaje } from "@/lib/modalidad";
import { aperturaEnvio, estadoEnvio } from "@/lib/periodo";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { colorDe } from "@/lib/colores";
import type { Actividad, Entrega } from "@/lib/tipos";

/** Renglón de una actividad en el portal del alumno: periodo de recepción, estado y calificación. */
export async function FilaActividadAlumno({ actividad: a, entrega: e, ahora }: { actividad: Actividad; entrega?: Entrega; ahora: Date }) {
  const { t, locale } = await textos();
  const tp = t.alumno.panel;
  const f = (iso: string) => fechaHoraLarga(iso, locale);
  const enviada = Boolean(e && e.estado !== "sin_entregar");
  const publicada = e?.estado === "aprobada" && resultadosDisponibles(a, ahora);
  const recepcion = estadoEnvio(a, ahora);
  const apertura = aperturaEnvio(a);
  const periodo =
    apertura && a.envioHasta
      ? formato(tp.recepcion, { desde: f(apertura), hasta: f(a.envioHasta) })
      : a.envioHasta
        ? formato(tp.recepcionHasta, { hasta: f(a.envioHasta) })
        : apertura
          ? formato(tp.recepcionDesde, { desde: f(apertura) })
          : undefined;
  const franja = colorDe(a.color);
  const contenido = (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {a.titulo}
          {a.etiqueta && <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 align-middle text-xs font-normal text-slate-600">{a.etiqueta}</span>}
          <span className="ml-2 rounded-md bg-sky-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-sky-800">
            {formato(t.autoestudio.asignadaPor, { quien: t.autoestudio.quienProfesor })}
          </span>
        </p>
        <p className="text-sm text-slate-500">{fechaLarga(a.fechaAplicacion, locale)}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-medium">
          {periodo && <span className="rounded-md bg-tinta-50 px-2 py-0.5 text-tinta-700 ring-1 ring-tinta-200">{periodo}</span>}
          {!enviada &&
            (recepcion === "abierto" ? (
              <span className="rounded-md bg-acierto-suave px-2 py-0.5 text-acierto">{tp.abierta}</span>
            ) : recepcion === "proximo" ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{formato(tp.abre, { f: f(apertura!) })}</span>
            ) : (
              <span className="rounded-md bg-error-suave px-2 py-0.5 text-error">{tp.cerrada}</span>
            ))}
          {a.resultadosDesde && (
            <span className="rounded-md bg-aviso-suave px-2 py-0.5 text-aviso ring-1 ring-aviso/30">
              {formato(tp.fechaVisualizacion, { fecha: f(a.resultadosDesde) })}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
        {publicada ? (
          <>
            <Insignia tono="verde">{tp.solucionRetro}</Insignia>
            {conPuntaje(a) && (
              <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!), escalaDe(a))}`}>
                {formatoCal(calificacion(a, e!), escalaDe(a))}
                <span className="text-sm font-normal text-slate-400"> / {escalaDe(a)}</span>
              </span>
            )}
          </>
        ) : enviada ? (
          <>
            <Insignia tono="azul">{tp.enviado}</Insignia>
            <span className="text-xs text-slate-500">{e!.estado === "aprobada" ? tp.listosEnFecha : tp.evaluando}</span>
          </>
        ) : recepcion === "abierto" ? (
          <Link href={`/entregar/${a.id}`} className="rounded-lg bg-tinta-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tinta-700">
            {tp.entregarFotos}
          </Link>
        ) : null}
      </div>
    </>
  );
  const clase = `relative flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 ${franja ? "pl-6" : ""}`;
  const borde = franja && <span className={`absolute inset-y-0 left-0 w-1.5 ${franja.franja}`} aria-hidden />;
  return (
    <li>
      {publicada ? (
        <Link href={`/alumno/reporte/${a.id}`} className={`${clase} hover:bg-slate-50`}>
          {borde}
          {contenido}
        </Link>
      ) : (
        <div className={clase}>
          {borde}
          {contenido}
        </div>
      )}
    </li>
  );
}
