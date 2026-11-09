"use client";

import { useState, useTransition } from "react";
import { guardarRubrica } from "@/app/acciones";
import type { Reactivo, TipoReactivo } from "@/lib/tipos";
import { Boton, Insignia } from "./ui";

const nombreTipo: Record<string, string> = {
  verdadero_falso: "V / F",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación de columnas",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Abierto",
};

/** Rúbrica propuesta por la IA a partir de la solución del profesor. El profesor la ajusta y confirma. */
export function RubricaEditor({
  actividadId,
  reactivosIniciales,
  confirmadaInicial,
}: {
  actividadId: string;
  reactivosIniciales: Reactivo[];
  confirmadaInicial: boolean;
}) {
  const [reactivos, setReactivos] = useState(reactivosIniciales);
  const [confirmada, setConfirmada] = useState(confirmadaInicial);
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState("");

  function guardar(confirmar: boolean) {
    setError("");
    iniciar(async () => {
      try {
        await guardarRubrica(actividadId, reactivos, confirmar);
        setConfirmada(confirmar);
      } catch {
        setError("No se pudo guardar la rúbrica.");
      }
    });
  }
  const total = reactivos.reduce((s, r) => s + r.puntos, 0);

  function cambiar(numero: number, cambio: Partial<Reactivo>) {
    setConfirmada(false);
    setReactivos((rs) => rs.map((r) => (r.numero === numero ? { ...r, ...cambio } : r)));
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex-1">
          <h2 className="font-semibold">Rúbrica propuesta por la IA</h2>
          <p className="text-sm text-slate-500">
            {reactivos.length} reactivos · {total} puntos en total. Revisa respuestas, puntos y pasos esperados.
          </p>
        </div>
        {error && <p className="w-full text-sm text-error">{error}</p>}
        {confirmada ? (
          <Insignia tono="verde">Rúbrica confirmada</Insignia>
        ) : (
          <Boton onClick={() => guardar(true)} disabled={guardando}>
            {guardando ? "Guardando…" : "Confirmar rúbrica"}
          </Boton>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {reactivos.map((r) => (
          <li key={r.numero} className="grid gap-3 px-5 py-4 md:grid-cols-[2rem_1fr_9rem]">
            <span className="font-semibold text-slate-700">{r.numero}.</span>
            <div className="min-w-0">
              <p className="text-sm text-slate-800">{r.enunciado}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={r.tipo}
                  onChange={(e) => cambiar(r.numero, { tipo: e.target.value as TipoReactivo })}
                  className="rounded-full bg-tinta-50 px-2 py-0.5 text-xs font-medium text-tinta-700"
                  aria-label={`Tipo del reactivo ${r.numero}`}
                >
                  {Object.entries(nombreTipo).map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </select>
                <Insignia>Página {r.pagina}</Insignia>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-500">
                  Tema
                  <input value={r.tema} onChange={(e) => cambiar(r.numero, { tema: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800" />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Habilidad
                  <input value={r.habilidad} onChange={(e) => cambiar(r.numero, { habilidad: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800" />
                </label>
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-500">
                {r.tipo === "abierto" ? "Criterios esperados" : r.tipo === "desarrollo" ? "Resultado final" : "Respuesta correcta"}
                <input
                  value={r.respuesta}
                  onChange={(e) => cambiar(r.numero, { respuesta: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
                />
              </label>
              {r.pasos && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500">Estructura que se evalúa (peso de cada paso)</p>
                  <ol className="mt-1 grid gap-1 sm:grid-cols-5">
                    {r.pasos.map((p, i) => (
                      <li key={p.nombre} className="rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200">
                        <span className="block font-medium text-slate-700">{p.nombre}</span>
                        <span className="text-slate-500">{Math.round(p.peso * 100)}%</span>
                        {r.solucionPasos?.[i] && (
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-tinta-700" title={r.solucionPasos[i]}>
                            {r.solucionPasos[i]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <label className="text-xs font-medium text-slate-500">
              Puntos
              <input
                type="number"
                min={0}
                step={0.5}
                value={r.puntos}
                onChange={(e) => cambiar(r.numero, { puntos: Math.max(0, Number(e.target.value)) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-right text-sm text-slate-800"
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
