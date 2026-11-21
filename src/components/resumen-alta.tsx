import Link from "next/link";
import type { ReactNode } from "react";
import { ESCALA, INFO_MOTOR, indiceEscala } from "@/lib/configuracion";
import { idiomaDeActividad } from "@/lib/i18n/detectar";
import { NOMBRE_IDIOMA, formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { esPlataforma } from "@/lib/plataforma";
import { fechaHoraLarga } from "@/lib/resultados";
import type { Actividad, Grupo } from "@/lib/tipos";
import { IconoLapiz } from "./iconos";
import { fechaLarga } from "./ui";

/** Botón "Editar actividad": lleva al formulario para reeditar todas las opciones del alta. */
export function BotonEditarActividad({ id, texto }: { id: string; texto: string }) {
  return (
    <Link
      href={`/profesor/actividades/${id}/editar`}
      className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-tinta-700 ring-1 ring-tinta-200 transition hover:bg-tinta-50"
    >
      <IconoLapiz />
      {texto}
    </Link>
  );
}

/**
 * Paso 1 ya hecho: las opciones con que se dio de alta la actividad (formato, curso, tipo, temas,
 * escala, solución, precisión y fechas), con el botón para volver a editarlas.
 */
export async function ResumenAlta({ actividad, grupo }: { actividad: Actividad; grupo: Pick<Grupo, "materia" | "nombre"> }) {
  const { t, locale } = await textos();
  const th = t.profesor.hoja;
  const tn = t.profesor.nuevaActividad;
  const tm = t.profesor.modalidad;
  const plataforma = esPlataforma(actividad);
  const idioma = idiomaDeActividad(actividad);
  const punto = ESCALA[indiceEscala(actividad.precision)];
  const fechaHora = (iso?: string) => (iso ? fechaHoraLarga(iso, locale) : th.resumenVacio);

  const datos: [string, ReactNode][] = [
    [tn.formato, plataforma ? tn.enPlataforma : tn.manuscrita],
    ...(!plataforma ? [[th.resumenCreacion, actividad.origen === "escaneada" ? th.resumenEscaneada : th.resumenIA] as [string, ReactNode]] : []),
    [tn.curso, `${grupo.materia} · ${grupo.nombre}`],
    [tn.tipoActividad, actividad.etiqueta || th.resumenVacio],
    [tn.idiomaActividad, idioma ? NOMBRE_IDIOMA[idioma] : th.resumenVacio],
    [tn.fecha, fechaLarga(actividad.fechaAplicacion, locale)],
    [
      th.resumenTemario,
      actividad.temario ? (
        <>
          {actividad.temario.unidad}
          {actividad.temario.temas.length > 0 && <span className="block text-xs text-slate-500">{actividad.temario.temas.join(" · ")}</span>}
        </>
      ) : (
        th.resumenVacio
      ),
    ],
    [tn.calificarSobre, actividad.sinPuntaje ? tn.sinPuntos : formato(tn.puntos, { n: actividad.escala === 10 ? 10 : 100 })],
    [th.resumenSolucion, actividad.sinSolucion ? tm.sinSolucionCorto : tm.conSolucionCorto],
    ...(!plataforma
      ? [[th.resumenCorreccion, actividad.estiloCorreccion === "subrayado" ? tm.estiloSubrayadoCorto : tm.estiloMargenCorto] as [string, ReactNode]]
      : []),
    [
      th.resumenPrecision,
      `${t.escala[punto.punto].nombre} · ${INFO_MOTOR[punto.precision.motor].nombreCorto} - ${t.esfuerzos[punto.precision.esfuerzo]}`,
    ],
    [th.resumenReactivos, String(actividad.reactivos.length)],
    ...(!plataforma ? [[tn.paginas, String(actividad.paginas)] as [string, ReactNode]] : []),
    [tn.versiones, String(1 + (actividad.versiones?.length ?? 0))],
    [tn.visibleDesde, fechaHora(actividad.visibleDesde)],
    [tn.envioDesde, fechaHora(actividad.envioDesde)],
    [tn.envioHasta, fechaHora(actividad.envioHasta)],
    [tn.fechasResultados, fechaHora(actividad.resultadosDesde)],
  ];

  return (
    <section className="no-imprimir mx-auto mb-6 max-w-3xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{th.resumenTitulo}</h2>
          <p className="text-sm text-slate-500">{th.resumenTexto}</p>
        </div>
        <BotonEditarActividad id={actividad.id} texto={th.editarActividad} />
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
            <dd className="break-words text-slate-800">{valor}</dd>
          </div>
        ))}
      </dl>
      {actividad.prompt && (
        <details className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer font-medium text-slate-700">{th.resumenPrompt}</summary>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">{actividad.prompt}</p>
        </details>
      )}
    </section>
  );
}
