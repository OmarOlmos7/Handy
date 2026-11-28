"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarPlan, proponerPlan, quitarPlan } from "@/app/acciones-plan";
import { formato } from "@/lib/i18n/idiomas";
import { sumaPesos, TOLERANCIA_SUMA } from "@/lib/plan-evaluacion";
import type { PesoTipo, PlanEvaluacion } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

type Fila = { etiqueta: string; porcentaje: string };

const aFilas = (pesos: PesoTipo[]): Fila[] => pesos.map((p) => ({ etiqueta: p.etiqueta, porcentaje: String(p.porcentaje) }));

/**
 * Botón y panel del plan de evaluación del curso: el profesor escribe cómo ponderar cada tipo de
 * actividad, la IA lo convierte en porcentajes y él los revisa, cambia y guarda.
 */
export function PlanEvaluacionCurso({ grupoId, plan, etiquetas }: { grupoId: string; plan?: PlanEvaluacion; etiquetas: string[] }) {
  const { t } = useTextos();
  const tp = t.profesor.cuaderno.plan;
  const sinEtiqueta = t.profesor.calculo.sinEtiqueta;
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [instrucciones, setInstrucciones] = useState(plan?.instrucciones ?? "");
  const [filas, setFilas] = useState<Fila[]>(plan ? aFilas(plan.pesos) : []);
  const [notas, setNotas] = useState(plan?.notas ?? "");
  const [ajustado, setAjustado] = useState(false);
  const [error, setError] = useState("");
  const [generando, iniciarGenerar] = useTransition();
  const [guardando, iniciarGuardar] = useTransition();
  const ocupado = generando || guardando;

  const textoError = (clave: string) => (tp.errores as Record<string, string>)[clave] ?? clave;
  const pesos = filas.map((f) => ({ etiqueta: f.etiqueta, porcentaje: Number(f.porcentaje.replace(",", ".")) || 0 }));
  const total = sumaPesos(pesos);
  const sumaBien = Math.abs(total - 100) <= TOLERANCIA_SUMA;

  function abrir() {
    setInstrucciones(plan?.instrucciones ?? "");
    setFilas(plan ? aFilas(plan.pesos) : []);
    setNotas(plan?.notas ?? "");
    setAjustado(false);
    setError("");
    setAbierto(true);
  }

  function generar() {
    setError("");
    iniciarGenerar(async () => {
      const r = await proponerPlan(grupoId, instrucciones);
      if ("error" in r) return setError(textoError(r.error));
      setFilas(aFilas(r.pesos));
      setNotas(r.notas);
      setAjustado(r.ajustado);
    });
  }

  function guardar() {
    setError("");
    if (filas.length === 0) return setError(tp.errores.vacio);
    if (!sumaBien) return setError(tp.errores.suma);
    iniciarGuardar(async () => {
      const r = await guardarPlan(grupoId, pesos, instrucciones, notas);
      if ("error" in r) return setError(textoError(r.error));
      setAbierto(false);
      router.refresh();
    });
  }

  function quitar() {
    if (!window.confirm(tp.confirmarQuitar)) return;
    iniciarGuardar(async () => {
      const r = await quitarPlan(grupoId);
      if ("error" in r) return setError(textoError(r.error));
      setAbierto(false);
      router.refresh();
    });
  }

  const cambiar = (i: number, cambio: Partial<Fila>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambio } : f)));
  // Tipos del curso que aún no están en el plan, para sugerirlos al agregar una fila.
  const sugeridas = etiquetas.filter((e) => !filas.some((f) => f.etiqueta.trim().toLowerCase() === e.toLowerCase()));

  return (
    <>
      <Boton type="button" variante="secundario" onClick={abrir}>
        {plan ? tp.botonEditar : tp.boton}
      </Boton>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="titulo-plan">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h2 id="titulo-plan" className="text-lg font-semibold text-slate-900">
              {tp.titulo}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{tp.descripcion}</p>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              {tp.instrucciones}
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                maxLength={1500}
                placeholder={tp.ejemplo}
                className={campo}
                disabled={ocupado}
              />
            </label>
            {etiquetas.length > 0 && <p className="mt-1 text-xs text-slate-500">{formato(tp.tipos, { lista: etiquetas.join(", ") })}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton type="button" onClick={generar} disabled={ocupado || !instrucciones.trim()}>
                {generando ? tp.generando : tp.generar}
              </Boton>
              {filas.length === 0 && (
                <Boton type="button" variante="secundario" onClick={() => setFilas(etiquetas.map((e) => ({ etiqueta: e, porcentaje: "" })))} disabled={ocupado}>
                  {tp.manual}
                </Boton>
              )}
            </div>

            {filas.length > 0 && (
              <div className="mt-5">
                {notas && (
                  <p className="mb-3 rounded-lg bg-tinta-50 px-3 py-2 text-sm text-tinta-800">
                    <span className="font-medium">{tp.interpretacion}</span> {notas}
                  </p>
                )}
                {ajustado && <p className="mb-3 rounded-lg bg-aviso-suave px-3 py-2 text-sm text-aviso">{tp.ajustado}</p>}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 font-medium">{tp.tipo}</th>
                      <th className="w-36 pb-2 font-medium">{tp.porcentaje}</th>
                      <th className="w-10 pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-2">
                          <input
                            value={f.etiqueta}
                            onChange={(e) => cambiar(i, { etiqueta: e.target.value })}
                            placeholder={sinEtiqueta}
                            list="etiquetas-plan"
                            maxLength={30}
                            aria-label={tp.tipo}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
                            disabled={ocupado}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <div className="flex items-center gap-1">
                            <input
                              value={f.porcentaje}
                              onChange={(e) => cambiar(i, { porcentaje: e.target.value })}
                              inputMode="decimal"
                              aria-label={formato(tp.porcentajeDe, { tipo: f.etiqueta || sinEtiqueta })}
                              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
                              disabled={ocupado}
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))}
                            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-error"
                            aria-label={formato(tp.quitarFila, { tipo: f.etiqueta || sinEtiqueta })}
                            disabled={ocupado}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="pt-2">
                        <button
                          type="button"
                          onClick={() => setFilas((fs) => [...fs, { etiqueta: sugeridas[0] ?? "", porcentaje: "" }])}
                          className="text-sm font-medium text-tinta-700 hover:underline"
                          disabled={ocupado}
                        >
                          + {tp.agregar}
                        </button>
                      </td>
                      <td className={`pt-2 text-sm font-semibold tabular-nums ${sumaBien ? "text-acierto" : "text-error"}`} colSpan={2}>
                        {formato(tp.total, { n: total })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <datalist id="etiquetas-plan">
                  {etiquetas.map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
                {!sumaBien && <p className="mt-1 text-xs text-error">{tp.errores.suma}</p>}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-error">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div>
                {plan && (
                  <button type="button" onClick={quitar} className="text-sm text-error hover:underline" disabled={ocupado}>
                    {tp.quitar}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Boton type="button" variante="secundario" onClick={() => setAbierto(false)} disabled={ocupado}>
                  {tp.cancelar}
                </Boton>
                <Boton type="button" onClick={guardar} disabled={ocupado || filas.length === 0 || !sumaBien}>
                  {guardando ? tp.guardando : tp.guardar}
                </Boton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
