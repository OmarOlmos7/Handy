"use client";

// Asignatura (temario) del curso: se elige al crear el curso y con el lápiz de su tarjeta.
// Opciones: sin asignatura, una de las asignaturas del profesor o crear una nueva.
import { useState } from "react";
import { NUEVA_ASIGNATURA, asignaturaDeGrupo } from "@/lib/asignaturas";
import type { Asignatura } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { campo } from "./ui";

export type AsignaturaOpcion = Pick<Asignatura, "id" | "nombre"> & { nivel?: string };

/** Desplegable de la asignatura del curso (campo "asignatura" del formulario). */
export function SelectorAsignaturaCurso({
  asignaturas,
  valor,
  alCambiar,
  chico = false,
  autoFocus = false,
}: {
  asignaturas: AsignaturaOpcion[];
  valor: string;
  alCambiar: (valor: string) => void;
  /** Versión compacta para la tarjeta del curso. */
  chico?: boolean;
  autoFocus?: boolean;
}) {
  const { t } = useTextos();
  const tn = t.profesor.nuevoCurso;
  const clase = chico
    ? "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
    : `${campo} bg-white`;
  return (
    <label className={chico ? "block text-xs font-medium text-slate-500" : "block text-sm font-medium text-slate-700"}>
      {tn.asignatura}
      <select name="asignatura" value={valor} onChange={(e) => alCambiar(e.target.value)} className={clase} autoFocus={autoFocus}>
        <option value="">{tn.sinAsignatura}</option>
        {asignaturas.length > 0 && (
          <optgroup label={tn.misAsignaturas}>
            {asignaturas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nivel ? `${a.nombre} · ${a.nivel}` : a.nombre}
              </option>
            ))}
          </optgroup>
        )}
        <option value={NUEVA_ASIGNATURA}>{tn.crearAsignatura}</option>
      </select>
      <span className={`mt-1 block font-normal ${chico ? "text-[11px] leading-snug" : "text-xs"} ${valor === NUEVA_ASIGNATURA ? "text-tinta-700" : "text-slate-500"}`}>
        {valor === NUEVA_ASIGNATURA ? tn.ayudaCrear : chico ? tn.ayudaTarjeta : tn.ayudaAsignatura}
      </span>
    </label>
  );
}

/**
 * Materia, grupo y asignatura del alta de curso. Mientras el profesor no elija otra, la asignatura
 * sigue a la materia: si escribe "Física" y tiene la asignatura "Física", queda seleccionada.
 */
export function CamposNuevoCurso({
  asignaturas,
  ejemploMateria,
  ejemploGrupo,
}: {
  asignaturas: AsignaturaOpcion[];
  ejemploMateria: string;
  ejemploGrupo: string;
}) {
  const { t } = useTextos();
  const c = t.profesor.comun;
  const [materia, setMateria] = useState("");
  const [elegida, setElegida] = useState<string | null>(null);
  const valor = elegida ?? asignaturaDeGrupo(asignaturas, { materia })?.id ?? "";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          {c.materia}
          <input name="materia" required className={campo} placeholder={ejemploMateria} value={materia} onChange={(e) => setMateria(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {c.grupo}
          <input name="nombre" required className={campo} placeholder={ejemploGrupo} />
        </label>
      </div>
      <SelectorAsignaturaCurso asignaturas={asignaturas} valor={valor} alCambiar={setElegida} />
    </>
  );
}
