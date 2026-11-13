"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { borrarActividad, colorActividad, editarDatosActividad, etiquetarActividad } from "@/app/acciones";
import { colorDe } from "@/lib/colores";
import type { EstadoActividad } from "@/lib/tipos";
import { BotonIcono, IconoBasura, IconoLapiz } from "./iconos";
import { SelectorColor } from "./selector-color";
import { SelectorEtiqueta } from "./selector-etiqueta";
import { Boton, InsigniaActividad, fechaLarga } from "./ui";

const campoChico = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Renglón de una actividad en la vista del curso, con lápiz para editar y bote para borrar. */
export function FilaActividad({
  id,
  titulo,
  fecha,
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
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError("");
    iniciar(async () => {
      try {
        await editarDatosActividad(id, String(datos.get("titulo")), String(datos.get("fecha")));
        setEditando(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function cambiar(accion: () => Promise<void>) {
    iniciar(async () => {
      try {
        await accion();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function borrar() {
    const aviso = recibidas
      ? `¿Borrar la actividad "${titulo}"? También se borrarán las ${recibidas} entregas de alumnos y sus calificaciones. No se puede deshacer.`
      : `¿Borrar la actividad "${titulo}"? No se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    iniciar(async () => {
      try {
        await borrarActividad(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar");
      }
    });
  }

  if (editando) {
    return (
      <li className="px-5 py-4">
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
          <label className="block text-xs font-medium text-slate-500">
            Título
            <input name="titulo" defaultValue={titulo} required autoFocus className={campoChico} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Fecha de aplicación
            <input name="fecha" type="date" defaultValue={fecha} required className={campoChico} />
          </label>
          <div className="flex gap-2">
            <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
              Guardar
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)} className="!px-3 !py-1.5">
              Cancelar
            </Boton>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Para cambiar los reactivos, usa{" "}
          <Link href={`/profesor/actividades/${id}/hoja`} className="font-medium text-tinta-700 hover:underline">
            la hoja imprimible
          </Link>{" "}
          (editor con IA) o{" "}
          <Link href={`/profesor/actividades/${id}/rubrica`} className="font-medium text-tinta-700 hover:underline">
            la solución y rúbrica
          </Link>
          .
        </p>
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
          Aplicada {fechaLarga(fecha)} · {paginas} {paginas === 1 ? "página" : "páginas"}
        </p>
        {error && <p className="relative z-10 text-xs text-error">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-slate-500">{entregas}</span>
        {promedio && <span className={`font-semibold ${colorPromedio}`}>Prom. {promedio}</span>}
        <InsigniaActividad estado={estado} />
        <SelectorEtiqueta
          valor={etiqueta}
          sugeridas={etiquetasCurso}
          onElegir={(e) => cambiar(() => etiquetarActividad(id, e))}
          disabled={pendiente}
        />
        <span className="flex items-center gap-1">
          <BotonIcono etiqueta="Editar actividad" onClick={() => setEditando(true)} disabled={pendiente}>
            <IconoLapiz />
          </BotonIcono>
          <SelectorColor valor={color} etiqueta="Cambiar color de la actividad" onElegir={(c) => cambiar(() => colorActividad(id, c))} disabled={pendiente} />
          <BotonIcono etiqueta="Borrar actividad" peligro onClick={borrar} disabled={pendiente}>
            <IconoBasura />
          </BotonIcono>
        </span>
      </div>
    </li>
  );
}
