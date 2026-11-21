"use client";

import { leerFechas } from "@/lib/periodo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { borrarActividad, colorActividad, editarDatosActividad, etiquetarActividad } from "@/app/acciones";
import { colorDe } from "@/lib/colores";
import { aCampoFechaHora, fechaHoraLarga } from "@/lib/resultados";
import type { EstadoActividad } from "@/lib/tipos";
import { BotonIcono, IconoBasura, IconoLapiz } from "./iconos";
import { SelectorColor } from "./selector-color";
import { SelectorEtiqueta } from "./selector-etiqueta";
import { Boton, BotonLink, InsigniaActividad, fechaLarga } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

const campoChico = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Renglón de una actividad en la vista del curso, con lápiz para editar y bote para borrar. */
export function FilaActividad({
  id,
  titulo,
  fecha,
  resultadosDesde,
  envioDesde,
  envioHasta,
  paginas,
  entregas,
  promedio,
  colorPromedio,
  estado,
  recibidas,
  color,
  etiqueta,
  etiquetasCurso,
}: {
  id: string;
  titulo: string;
  fecha: string;
  /** Desde cuándo ven los alumnos sus resultados (ISO). */
  resultadosDesde?: string;
  /** Recepción de entregas de la actividad (ISO), para revisar la liberación de resultados. */
  envioDesde?: string;
  envioHasta?: string;
  paginas: number;
  entregas: string;
  promedio?: string;
  colorPromedio?: string;
  estado: EstadoActividad;
  recibidas: number;
  color?: string;
  etiqueta?: string;
  etiquetasCurso: string[];
}) {
  const router = useRouter();
  const { t, locale } = useTextos();
  const c = t.profesor.comun;
  const tf = t.profesor.filaActividad;
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError("");
    try {
      leerFechas({ envioDesde: aCampoFechaHora(envioDesde), envioHasta: aCampoFechaHora(envioHasta), resultadosDesde: String(datos.get("resultadosDesde") ?? "") });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    iniciar(async () => {
      try {
        await editarDatosActividad(id, String(datos.get("titulo")), String(datos.get("fecha")), String(datos.get("resultadosDesde") ?? ""));
        setEditando(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : c.noSeGuardo);
      }
    });
  }

  function cambiar(accion: () => Promise<void>) {
    iniciar(async () => {
      try {
        await accion();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : c.noSeGuardo);
      }
    });
  }

  function borrar() {
    const aviso = recibidas
      ? formato(tf.confirmarConEntregas, { titulo, n: recibidas })
      : formato(tf.confirmar, { titulo });
    if (!window.confirm(aviso)) return;
    iniciar(async () => {
      try {
        await borrarActividad(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : c.noSeBorro);
      }
    });
  }

  if (editando) {
    return (
      <li className="px-5 py-4">
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-[1fr_10rem_13rem_auto] sm:items-end">
          <label className="block text-xs font-medium text-slate-500">
            {tf.titulo}
            <input name="titulo" defaultValue={titulo} required autoFocus className={campoChico} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {tf.fechaAplicacion}
            <input name="fecha" type="date" defaultValue={fecha} required className={campoChico} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {tf.resultadosDesde}
            <input name="resultadosDesde" type="datetime-local" defaultValue={aCampoFechaHora(resultadosDesde)} className={campoChico} />
          </label>
          <div className="flex gap-2">
            <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
              {c.guardar}
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)} className="!px-3 !py-1.5">
              {c.cancelar}
            </Boton>
          </div>
        </form>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {tf.ayudaAntes}
          <Link href={`/profesor/actividades/${id}/hoja`} className="font-medium text-tinta-700 hover:underline">
            {tf.hojaImprimible}
          </Link>
          {tf.ayudaMedio}
          <Link href={`/profesor/actividades/${id}/solucion`} className="font-medium text-tinta-700 hover:underline">
            {tf.laSolucion}
          </Link>
          .
        </p>
        <BotonLink
          href={`/profesor/actividades/${id}/editar`}
          variante="secundario"
          title={tf.reeditarAyuda}
          className="inline-flex shrink-0 items-center gap-2 !px-3 !py-1.5"
        >
          <IconoLapiz />
          {tf.reeditar}
        </BotonLink>
        </div>
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </li>
    );
  }

  return (
    <li className={`relative flex flex-col gap-2 py-4 pl-6 pr-5 first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50 sm:flex-row sm:items-center ${pendiente ? "opacity-60" : ""}`}>
      {colorDe(color) && <span className={`absolute inset-y-0 left-0 w-1.5 [li:first-child>&]:rounded-tl-xl [li:last-child>&]:rounded-bl-xl ${colorDe(color)!.franja}`} aria-hidden />}
      <div className="flex-1">
        <Link href={`/profesor/actividades/${id}`} className="font-medium after:absolute after:inset-0">
          {titulo}
        </Link>
        <p className="text-sm text-slate-500">
          {formato(c.aplicada, { f: fechaLarga(fecha, locale) })} · {formato(paginas === 1 ? c.pagina1 : c.paginaN, { n: paginas })}
          {resultadosDesde && formato(tf.resultadosDesdeCorto, { f: fechaHoraLarga(resultadosDesde, locale) })}
        </p>
        {error && <p className="relative z-10 text-xs text-error">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">{entregas}</span>
        {promedio && <span className={`font-semibold ${colorPromedio}`}>{formato(tf.promedio, { p: promedio })}</span>}
        <InsigniaActividad estado={estado} />
        <SelectorEtiqueta
          valor={etiqueta}
          sugeridas={etiquetasCurso}
          onElegir={(e) => cambiar(() => etiquetarActividad(id, e))}
          disabled={pendiente}
        />
        <span className="flex items-center gap-1">
          <BotonIcono etiqueta={tf.editar} onClick={() => setEditando(true)} disabled={pendiente}>
            <IconoLapiz />
          </BotonIcono>
          <SelectorColor valor={color} etiqueta={tf.cambiarColor} onElegir={(c) => cambiar(() => colorActividad(id, c))} disabled={pendiente} />
          <BotonIcono etiqueta={tf.borrar} peligro onClick={borrar} disabled={pendiente}>
            <IconoBasura />
          </BotonIcono>
        </span>
      </div>
    </li>
  );
}
