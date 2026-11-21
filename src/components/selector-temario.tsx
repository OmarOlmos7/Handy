"use client";

// En el alta de actividad: primero la unidad de la asignatura y enseguida sus temas y subtemas.
import Link from "next/link";
import { useState } from "react";
import type { Asignatura } from "@/lib/tipos";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { campo } from "./ui";

export type AsignaturaParaAlta = Pick<Asignatura, "id" | "nombre" | "unidades">;

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Casilla({ activa, parcial, onClick, children, fuerte }: { activa: boolean; parcial?: boolean; onClick: () => void; children: React.ReactNode; fuerte?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={parcial ? "mixed" : activa} onClick={onClick} className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-slate-50">
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold ${
          activa || parcial ? "border-tinta-600 bg-tinta-600 text-white" : "border-slate-300 bg-white"
        }`}
      >
        {activa ? "✓" : parcial ? "–" : ""}
      </span>
      <span className={fuerte ? "font-medium text-slate-800" : "text-slate-700"}>{children}</span>
    </button>
  );
}

export function SelectorTemario({ asignaturas, materia }: { asignaturas: AsignaturaParaAlta[]; materia?: string }) {
  const { t } = useTextos();
  const ta = t.profesor.asignaturas;
  // La asignatura sigue la materia del curso hasta que el profesor elige otra.
  const [elegida, setElegida] = useState<string | null>(null);
  const porMateria = asignaturas.find((a) => materia && normal(a.nombre) === normal(materia))?.id ?? "";
  const asignaturaId = elegida ?? porMateria;
  const asignatura = asignaturas.find((a) => a.id === asignaturaId);
  const [unidadSel, setUnidadSel] = useState<{ asignatura: string; unidad: number } | null>(null);
  const unidadIndice = unidadSel && unidadSel.asignatura === asignaturaId ? unidadSel.unidad : -1;
  const unidad = asignatura?.unidades[unidadIndice];
  const [temas, setTemas] = useState<string[]>([]);

  const alternar = (nombres: string[], activar: boolean) =>
    setTemas((xs) => (activar ? [...new Set([...xs, ...nombres])] : xs.filter((x) => !nombres.includes(x))));

  const valor = asignatura && unidad ? JSON.stringify({ asignaturaId: asignatura.id, unidad: unidad.nombre, temas }) : "";

  if (asignaturas.length === 0) {
    return (
      <div className="text-sm">
        <p className="font-medium text-slate-700">{ta.temasActividad}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ta.sinAsignaturasAlta}{" "}
          <Link href={`/profesor/asignaturas/nueva${materia ? `?nombre=${encodeURIComponent(materia)}` : ""}`} className="font-medium text-tinta-700 hover:underline">
            {ta.crearAsignatura}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">{ta.temasActividad}</legend>
      <input type="hidden" name="temario" value={valor} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-500">
          {ta.asignatura}
          <select
            value={asignaturaId}
            onChange={(e) => {
              setElegida(e.target.value);
              setTemas([]);
            }}
            className={campo}
          >
            <option value="">{ta.sinAsignatura}</option>
            {asignaturas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
        {asignatura && (
          <label className="block text-xs font-medium text-slate-500">
            {ta.unidad}
            <select
              value={unidadIndice}
              onChange={(e) => {
                setUnidadSel({ asignatura: asignaturaId, unidad: Number(e.target.value) });
                setTemas([]);
              }}
              className={campo}
            >
              <option value={-1}>{ta.elegirUnidad}</option>
              {asignatura.unidades.map((u, i) => (
                <option key={i} value={i}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {unidad && (
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-1 flex items-center justify-between gap-2 px-2">
            <p className="text-xs font-medium text-slate-500">{ta.temasDeUnidad}</p>
            <span className="text-xs text-slate-500">{temas.length ? formato(ta.elegidos, { n: temas.length }) : ""}</span>
          </div>
          <ul className="max-h-80 space-y-0.5 overflow-y-auto text-sm">
            {unidad.temas.map((tm) => {
              const todos = [tm.nombre, ...tm.subtemas];
              const marcados = todos.filter((x) => temas.includes(x)).length;
              const activo = temas.includes(tm.nombre);
              return (
                <li key={tm.nombre}>
                  <Casilla activa={activo} parcial={!activo && marcados > 0} onClick={() => alternar(todos, !activo)} fuerte>
                    {tm.nombre}
                  </Casilla>
                  {tm.subtemas.length > 0 && (
                    <ul className="ml-6 border-l border-slate-200 pl-1">
                      {tm.subtemas.map((st) => (
                        <li key={st}>
                          <Casilla activa={temas.includes(st)} onClick={() => alternar([st], !temas.includes(st))}>
                            {st}
                          </Casilla>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <span className="block text-xs text-slate-500">{ta.temasAyuda}</span>
    </fieldset>
  );
}
