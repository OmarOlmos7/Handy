"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archivarCursoAlumno, colorCursoAlumno } from "@/app/acciones-alumno";
import { colorDe } from "@/lib/colores";
import { formato } from "@/lib/i18n/idiomas";
import { BotonIcono, IconoArchivar, IconoDesarchivar } from "./iconos";
import { SelectorColor } from "./selector-color";
import { useTextos } from "./proveedor-textos";

/**
 * Tarjeta de un curso en el portal del alumno: abre el curso; el círculo cambia el color de la tarjeta
 * y la caja la archiva (o, si ya está archivada, la restaura). Todo solo en la vista del alumno.
 */
export function TarjetaCursoAlumno({
  id,
  materia,
  nombre,
  ciclo,
  color,
  actividades,
  porEntregar,
  promedio,
  colorPromedio,
  archivado = false,
}: {
  id: string;
  materia: string;
  nombre: string;
  ciclo: string;
  color?: string;
  actividades: number;
  porEntregar: number;
  /** Texto del promedio (ya formateado) o undefined si aún no hay evaluadas. */
  promedio?: string;
  colorPromedio?: string;
  /** La tarjeta está en "Cursos archivados": muestra el botón para restaurarla. */
  archivado?: boolean;
}) {
  const router = useRouter();
  const { t } = useTextos();
  const c = t.profesor.comun;
  const tc = t.alumno.cursos;
  const ta = t.archivados;
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function pintar(clave: string) {
    iniciar(async () => {
      try {
        await colorCursoAlumno(id, clave);
        router.refresh();
      } catch {
        setError(tc.noColor);
      }
    });
  }

  function archivar() {
    iniciar(async () => {
      try {
        await archivarCursoAlumno(id, !archivado);
        router.refresh();
      } catch {
        setError(archivado ? ta.noSeRestauro : ta.noSeArchivo);
      }
    });
  }

  return (
    <div
      className={`relative flex min-h-[170px] flex-col overflow-visible rounded-2xl bg-white p-5 pt-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-tinta-300 ${
        pendiente ? "opacity-60" : ""
      }`}
    >
      {colorDe(color) && <span className={`absolute inset-x-0 top-0 h-2 rounded-t-2xl ${colorDe(color)!.franja}`} aria-hidden />}
      {/* El enlace cubre toda la tarjeta; el selector de color queda encima. */}
      <Link href={`/alumno/cursos/${id}`} className="after:absolute after:inset-0 after:rounded-2xl">
        <span className="block text-xs font-semibold uppercase tracking-wider text-tinta-600">{materia}</span>
        <span className="mt-0.5 block text-xl font-semibold text-slate-900">{nombre}</span>
      </Link>
      {ciclo && <span className="text-xs text-slate-500">{formato(c.ciclo, { c: ciclo })}</span>}
      {error && <p className="relative z-10 mt-2 text-xs text-error">{error}</p>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-4">
        <dl className="flex gap-4 text-sm">
          <div>
            <dt className="whitespace-nowrap text-xs text-slate-500">{tc.actividades}</dt>
            <dd className="text-2xl font-semibold text-slate-900">{actividades}</dd>
          </div>
          <div>
            <dt className="whitespace-nowrap text-xs text-slate-500">{tc.porEntregar}</dt>
            <dd className={`text-2xl font-semibold ${porEntregar > 0 ? "text-aviso" : "text-slate-900"}`}>{porEntregar}</dd>
          </div>
          {promedio && (
            <div>
              <dt className="whitespace-nowrap text-xs text-slate-500">{tc.miPromedio}</dt>
              <dd className={`text-2xl font-semibold ${colorPromedio ?? "text-slate-900"}`}>{promedio}</dd>
            </div>
          )}
        </dl>
        <div className="ml-auto flex gap-1">
          <SelectorColor valor={color} etiqueta={tc.cambiarColor} onElegir={pintar} disabled={pendiente} />
          <BotonIcono etiqueta={archivado ? ta.restaurar : ta.archivar} onClick={archivar} disabled={pendiente}>
            {archivado ? <IconoDesarchivar /> : <IconoArchivar />}
          </BotonIcono>
        </div>
      </div>
    </div>
  );
}
