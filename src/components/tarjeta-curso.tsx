"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { borrarGrupo, renombrarGrupo } from "@/app/acciones";
import { BotonIcono, IconoBasura, IconoLapiz } from "./iconos";
import { Boton } from "./ui";

const campoChico = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Tarjeta de un curso en el panel: abre la vista del curso; lápiz para renombrar y bote para borrar. */
export function TarjetaCurso({
  id,
  materia,
  nombre,
  ciclo,
  actividades,
  alumnos,
  porRevisar,
}: {
  id: string;
  materia: string;
  nombre: string;
  ciclo: string;
  actividades: number;
  alumnos: number;
  porRevisar: number;
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
        await renombrarGrupo(id, String(datos.get("materia")), String(datos.get("nombre")));
        setEditando(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function borrar() {
    const aviso =
      actividades > 0
        ? `¿Borrar el curso "${materia} · ${nombre}"? También se borrarán sus ${actividades} actividades con todas las entregas y calificaciones. No se puede deshacer.`
        : `¿Borrar el curso "${materia} · ${nombre}"? No se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    iniciar(async () => {
      try {
        await borrarGrupo(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar");
      }
    });
  }

  return (
    <div
      className={`relative flex min-h-[180px] flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition ${
        editando ? "" : "hover:-translate-y-0.5 hover:shadow-md hover:ring-tinta-300"
      } ${pendiente ? "opacity-60" : ""}`}
    >
      {editando ? (
        <form onSubmit={guardar} className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            Materia
            <input name="materia" defaultValue={materia} required autoFocus className={campoChico} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Grupo
            <input name="nombre" defaultValue={nombre} required className={campoChico} />
          </label>
          <div className="flex gap-2 pt-1">
            <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
              Guardar
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)} className="!px-3 !py-1.5">
              Cancelar
            </Boton>
          </div>
        </form>
      ) : (
        <>
          {/* El enlace cubre toda la tarjeta; los botones de abajo quedan encima. */}
          <Link href={`/profesor/grupos/${id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            <span className="block text-xs font-semibold uppercase tracking-wider text-tinta-600">{materia}</span>
            <span className="mt-0.5 block text-xl font-semibold text-slate-900">{nombre}</span>
          </Link>
          <span className="text-xs text-slate-500">Ciclo {ciclo}</span>
        </>
      )}
      {error && <p className="relative z-10 mt-2 text-xs text-error">{error}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <dl className="flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Actividades</dt>
            <dd className="text-2xl font-semibold text-slate-900">{actividades}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Alumnos</dt>
            <dd className="text-2xl font-semibold text-slate-900">{alumnos}</dd>
          </div>
          {porRevisar > 0 && (
            <div>
              <dt className="text-xs text-slate-500">Por revisar</dt>
              <dd className="text-2xl font-semibold text-aviso">{porRevisar}</dd>
            </div>
          )}
        </dl>
        {!editando && (
          <div className="flex gap-1">
            <BotonIcono etiqueta="Editar nombre del curso" onClick={() => setEditando(true)} disabled={pendiente}>
              <IconoLapiz />
            </BotonIcono>
            <BotonIcono etiqueta="Borrar curso" peligro onClick={borrar} disabled={pendiente}>
              <IconoBasura />
            </BotonIcono>
          </div>
        )}
      </div>
    </div>
  );
}
