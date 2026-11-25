"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { borrarGrupo, colorGrupo, renombrarGrupo } from "@/app/acciones";
import { colorDe } from "@/lib/colores";
import { BotonIcono, IconoAlumnos, IconoBasura, IconoLapiz } from "./iconos";
import { SelectorColor } from "./selector-color";
import { Boton } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

const campoChico = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/**
 * Tarjeta de un curso en el panel: abre la vista del curso; botón a la lista de alumnos; lápiz para
 * renombrar (y entrar a altas, bajas y cambios de alumnos) y bote para borrar.
 */
export function TarjetaCurso({
  id,
  materia,
  nombre,
  ciclo,
  actividades,
  alumnos,
  porRevisar,
  color,
}: {
  id: string;
  materia: string;
  nombre: string;
  ciclo: string;
  actividades: number;
  alumnos: number;
  porRevisar: number;
  color?: string;
}) {
  const router = useRouter();
  const { t } = useTextos();
  const c = t.profesor.comun;
  const tc = t.profesor.tarjetaCurso;
  const tal = t.alumnosGrupo;
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
        setError(err instanceof Error ? err.message : c.noSeGuardo);
      }
    });
  }

  function pintar(clave: string) {
    iniciar(async () => {
      try {
        await colorGrupo(id, clave);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : tc.noColor);
      }
    });
  }

  function borrar() {
    const aviso =
      actividades > 0
        ? formato(tc.confirmarConActividades, { curso: `${materia} · ${nombre}`, n: actividades })
        : formato(tc.confirmar, { curso: `${materia} · ${nombre}` });
    if (!window.confirm(aviso)) return;
    iniciar(async () => {
      try {
        await borrarGrupo(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : c.noSeBorro);
      }
    });
  }

  return (
    <div
      className={`relative flex min-h-[180px] flex-col overflow-visible rounded-2xl bg-white p-5 pt-6 shadow-sm ring-1 ring-slate-200 transition ${
        editando ? "" : "hover:-translate-y-0.5 hover:shadow-md hover:ring-tinta-300"
      } ${pendiente ? "opacity-60" : ""}`}
    >
      {colorDe(color) && <span className={`absolute inset-x-0 top-0 h-2 rounded-t-2xl ${colorDe(color)!.franja}`} aria-hidden />}
      {editando ? (
        <form onSubmit={guardar} className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            {c.materia}
            <input name="materia" defaultValue={materia} required autoFocus className={campoChico} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {c.grupo}
            <input name="nombre" defaultValue={nombre} required className={campoChico} />
          </label>
          <Link
            href={`/profesor/grupos/${id}/alumnos`}
            className="flex items-center gap-2 rounded-md bg-tinta-50 px-2 py-1.5 text-xs font-medium text-tinta-700 hover:bg-tinta-100"
          >
            <IconoAlumnos /> {tal.enlaceEditar} →
          </Link>
          <div className="flex gap-2 pt-1">
            <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
              {c.guardar}
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setEditando(false)} className="!px-3 !py-1.5">
              {c.cancelar}
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
          <span className="text-xs text-slate-500">{formato(c.ciclo, { c: ciclo })}</span>
          <Link
            href={`/profesor/grupos/${id}/alumnos`}
            className="relative z-10 mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-tinta-50 hover:text-tinta-700 hover:ring-tinta-300"
          >
            <IconoAlumnos /> {tal.boton}
          </Link>
        </>
      )}
      {error && <p className="relative z-10 mt-2 text-xs text-error">{error}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <dl className="flex gap-4 text-sm">
          <div>
            <dt className="whitespace-nowrap text-xs text-slate-500">{c.actividades}</dt>
            <dd className="text-2xl font-semibold text-slate-900">{actividades}</dd>
          </div>
          <div>
            <dt className="whitespace-nowrap text-xs text-slate-500">{c.alumnos}</dt>
            <dd className="text-2xl font-semibold text-slate-900">{alumnos}</dd>
          </div>
          {porRevisar > 0 && (
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">{tc.porRevisar}</dt>
              <dd className="text-2xl font-semibold text-aviso">{porRevisar}</dd>
            </div>
          )}
        </dl>
        {!editando && (
          <div className="flex gap-1">
            <BotonIcono etiqueta={tc.editar} onClick={() => setEditando(true)} disabled={pendiente}>
              <IconoLapiz />
            </BotonIcono>
            <SelectorColor valor={color} etiqueta={tc.cambiarColor} onElegir={pintar} disabled={pendiente} />
            <BotonIcono etiqueta={tc.borrar} peligro onClick={borrar} disabled={pendiente}>
              <IconoBasura />
            </BotonIcono>
          </div>
        )}
      </div>
    </div>
  );
}
