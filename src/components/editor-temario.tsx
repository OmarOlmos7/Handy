"use client";

// Tabla editable del temario: unidades, temas y subtemas (uno por renglón).
import { useState, useTransition } from "react";
import { borrarAsignatura, guardarAsignatura } from "@/app/acciones-asignaturas";
import { formato } from "@/lib/i18n/idiomas";
import type { Asignatura } from "@/lib/tipos";
import { IconoBasura } from "./iconos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

type TemaEditable = { nombre: string; subtemas: string };
type UnidadEditable = { nombre: string; temas: TemaEditable[] };

const aEditable = (a: Asignatura): UnidadEditable[] =>
  a.unidades.map((u) => ({ nombre: u.nombre, temas: u.temas.map((t) => ({ nombre: t.nombre, subtemas: t.subtemas.join("\n") })) }));

const celda = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-slate-200 focus:border-tinta-500 focus:bg-white focus:ring-2 focus:ring-tinta-100";

export function EditorTemario({ asignatura }: { asignatura: Asignatura }) {
  const { t } = useTextos();
  const ta = t.profesor.asignaturas;
  const [nombre, setNombre] = useState(asignatura.nombre);
  const [nivel, setNivel] = useState(asignatura.nivel ?? "");
  const [unidades, setUnidades] = useState(() => aEditable(asignatura));
  const [guardado, setGuardado] = useState(() => JSON.stringify([asignatura.nombre, asignatura.nivel ?? "", aEditable(asignatura)]));
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, iniciar] = useTransition();
  const sinGuardar = JSON.stringify([nombre, nivel, unidades]) !== guardado;

  const cambiarUnidad = (i: number, cambio: (u: UnidadEditable) => UnidadEditable) => {
    setAviso(null);
    setUnidades((us) => us.map((u, k) => (k === i ? cambio(u) : u)));
  };
  const cambiarTema = (i: number, j: number, cambio: Partial<TemaEditable>) =>
    cambiarUnidad(i, (u) => ({ ...u, temas: u.temas.map((tm, k) => (k === j ? { ...tm, ...cambio } : tm)) }));

  function guardar() {
    iniciar(async () => {
      const datos = unidades.map((u) => ({
        nombre: u.nombre,
        temas: u.temas.map((tm) => ({ nombre: tm.nombre, subtemas: tm.subtemas.split("\n") })),
      }));
      const r = await guardarAsignatura(asignatura.id, { nombre, nivel, unidades: datos }).catch(() => ({ error: "noSeGuardo" as const }));
      if ("ok" in r) {
        setGuardado(JSON.stringify([nombre, nivel, unidades]));
        setAviso({ ok: true, texto: ta.guardado });
      } else setAviso({ ok: false, texto: ta.errores[r.error] });
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          {ta.nombre}
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} className={campo} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {ta.nivel}
          <input value={nivel} onChange={(e) => setNivel(e.target.value)} maxLength={120} className={campo} placeholder={ta.ejemploNivel} />
        </label>
      </div>

      {unidades.map((u, i) => (
        <section key={i} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-tinta-50 px-4 py-2">
            <span className="shrink-0 rounded-full bg-tinta-600 px-2.5 py-0.5 text-xs font-semibold text-white">{formato(ta.unidadN, { n: i + 1 })}</span>
            <input
              value={u.nombre}
              aria-label={ta.nombreUnidad}
              onChange={(e) => cambiarUnidad(i, (x) => ({ ...x, nombre: e.target.value }))}
              className={`${celda} font-semibold text-slate-900`}
            />
            <button
              type="button"
              title={ta.quitarUnidad}
              aria-label={ta.quitarUnidad}
              onClick={() => {
                if (window.confirm(formato(ta.confirmarQuitarUnidad, { n: u.nombre }))) setUnidades((us) => us.filter((_, k) => k !== i));
              }}
              className="rounded-md p-1.5 text-slate-400 hover:bg-error-suave hover:text-error"
            >
              <IconoBasura />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="w-[45%] px-4 pb-1 pt-3 font-medium">{ta.tema}</th>
                <th className="px-4 pb-1 pt-3 font-medium">
                  {ta.subtemas} <span className="font-normal text-slate-400">({ta.subtemasAyuda})</span>
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {u.temas.map((tm, j) => (
                <tr key={j} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-1.5">
                    <textarea
                      value={tm.nombre}
                      aria-label={ta.nombreTema}
                      rows={Math.max(1, Math.ceil(tm.nombre.length / 40))}
                      onChange={(e) => cambiarTema(i, j, { nombre: e.target.value.replace(/\n/g, " ") })}
                      className={`${celda} resize-none font-medium text-slate-800`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <textarea
                      value={tm.subtemas}
                      aria-label={ta.subtemas}
                      rows={Math.max(1, tm.subtemas.split("\n").length)}
                      onChange={(e) => cambiarTema(i, j, { subtemas: e.target.value })}
                      className={`${celda} resize-y text-slate-700`}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <button
                      type="button"
                      title={ta.quitarTema}
                      aria-label={ta.quitarTema}
                      onClick={() => cambiarUnidad(i, (x) => ({ ...x, temas: x.temas.filter((_, k) => k !== j) }))}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-error-suave hover:text-error"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => cambiarUnidad(i, (x) => ({ ...x, temas: [...x.temas, { nombre: "", subtemas: "" }] }))}
            className="m-3 rounded-lg px-3 py-1.5 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
          >
            + {ta.agregarTema}
          </button>
        </section>
      ))}
      <button
        type="button"
        onClick={() => setUnidades((us) => [...us, { nombre: formato(ta.unidadN, { n: us.length + 1 }), temas: [{ nombre: "", subtemas: "" }] }])}
        className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-tinta-400 hover:text-tinta-700"
      >
        + {ta.agregarUnidad}
      </button>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        <p className={`text-sm ${aviso ? (aviso.ok ? "text-acierto" : "text-error") : "text-slate-500"}`}>
          {aviso?.texto ?? (sinGuardar ? ta.sinGuardar : "")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(formato(ta.confirmarBorrar, { n: asignatura.nombre }))) iniciar(() => borrarAsignatura(asignatura.id));
            }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-error hover:bg-error-suave"
          >
            {ta.borrar}
          </button>
          <Boton type="button" onClick={guardar} disabled={guardando || !sinGuardar}>
            {guardando ? ta.guardando : ta.guardar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
