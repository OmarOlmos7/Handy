"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarRubrica } from "@/app/acciones";
import type { CriterioEditado } from "@/lib/rubrica";
import { MAX_CRITERIOS_ACTIVIDAD } from "@/lib/rubrica";
import type { CriterioEvaluacion, Reactivo, TipoReactivo } from "@/lib/tipos";
import { Boton, Insignia } from "./ui";
import { TextoMat } from "./texto-mat";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

const entrada = "mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-600";

/** Criterio en edición: los reactivos a los que aplica se escriben como texto ("1, 3"). */
type CriterioFila = CriterioEditado & { clave: string; aplicaA: string };

const aFilas = (cs: CriterioEvaluacion[]): CriterioFila[] =>
  cs.map((c, i) => ({ ...c, origen: i, clave: `c${i}`, aplicaA: c.reactivos?.join(", ") ?? "" }));

/**
 * Rúbrica propuesta por la IA a partir de la solución del profesor. El profesor la ajusta y
 * confirma; ya confirmada queda bloqueada y se abre con "Reeditar rúbrica" para cambiar respuestas,
 * puntos, criterios, recomendaciones e indicaciones para la IA.
 */
export function RubricaEditor({
  actividadId,
  reactivosIniciales,
  confirmadaInicial,
  sinPuntaje = false,
  criteriosIniciales = [],
  recomendacionesIniciales = [],
  instruccionesIniciales = "",
  evaluadas = 0,
  conEntregas = false,
}: {
  actividadId: string;
  reactivosIniciales: Reactivo[];
  confirmadaInicial: boolean;
  /** Rúbrica sin puntaje: no se muestran puntos ni porcentajes. */
  sinPuntaje?: boolean;
  criteriosIniciales?: CriterioEvaluacion[];
  recomendacionesIniciales?: string[];
  instruccionesIniciales?: string;
  /** Entregas ya evaluadas: conservan su calificación al reeditar. */
  evaluadas?: number;
  /** Con entregas recibidas, el tipo de cada reactivo queda fijo. */
  conEntregas?: boolean;
}) {
  const { t } = useTextos();
  const tr = t.profesor.rubricaEditor;
  const router = useRouter();
  const nombreTipo: Record<string, string> = t.profesor.tipos;
  const [reactivos, setReactivos] = useState(reactivosIniciales);
  const [criterios, setCriterios] = useState<CriterioFila[]>(() => aFilas(criteriosIniciales));
  const [recomendaciones, setRecomendaciones] = useState(recomendacionesIniciales.join("\n"));
  const [instrucciones, setInstrucciones] = useState(instruccionesIniciales);
  const [confirmada, setConfirmada] = useState(confirmadaInicial);
  // Ya confirmada, la rúbrica se muestra bloqueada hasta que el profesor pide reeditarla.
  const [editando, setEditando] = useState(!confirmadaInicial);
  const [reedicion, setReedicion] = useState(false);
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<{ evaluadas: number } | null>(null);
  const [nuevas, setNuevas] = useState(0);

  function restaurar() {
    setReactivos(reactivosIniciales);
    setCriterios(aFilas(criteriosIniciales));
    setRecomendaciones(recomendacionesIniciales.join("\n"));
    setInstrucciones(instruccionesIniciales);
  }

  function guardar() {
    setError("");
    iniciar(async () => {
      try {
        const r = await guardarRubrica(actividadId, reactivos, true, {
          criterios: criterios.map((c) => ({
            nombre: c.nombre,
            porcentaje: c.porcentaje,
            descripcion: c.descripcion,
            origen: c.origen,
            reactivos: c.aplicaA.split(/[^\d]+/).filter(Boolean).map(Number),
          })),
          recomendaciones: recomendaciones.split(/\r?\n/),
          instrucciones,
        });
        setConfirmada(true);
        setEditando(false);
        // Lo guardado es la nueva lista "anterior": sin los criterios vacíos y con su posición actual.
        setCriterios((cs) => cs.filter((c) => c.nombre.trim()).map((c, i) => ({ ...c, origen: i })));
        if (reedicion) setAviso({ evaluadas: r.evaluadas });
        setReedicion(false);
        router.refresh();
      } catch {
        setError(tr.noSeGuardo);
      }
    });
  }

  function reeditar() {
    setAviso(null);
    setEditando(true);
    setReedicion(true);
  }

  function cancelar() {
    restaurar();
    setEditando(false);
    setReedicion(false);
  }

  const total = reactivos.reduce((s, r) => s + r.puntos, 0);
  const sumaCriterios = criterios.reduce((s, c) => s + (c.porcentaje > 0 ? c.porcentaje : 0), 0);

  function cambiar(numero: number, cambio: Partial<Reactivo>) {
    // La primera vez, cualquier cambio pide confirmar de nuevo; al reeditar, se guarda con su botón.
    if (!reedicion) setConfirmada(false);
    setReactivos((rs) => rs.map((r) => (r.numero === numero ? { ...r, ...cambio } : r)));
  }
  function cambiarCriterio(clave: string, cambio: Partial<CriterioFila>) {
    if (!reedicion) setConfirmada(false);
    setCriterios((cs) => cs.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)));
  }
  function agregarCriterio() {
    if (!reedicion) setConfirmada(false);
    setCriterios((cs) => [...cs, { nombre: "", porcentaje: 0, descripcion: "", clave: `n${nuevas}`, aplicaA: "" }]);
    setNuevas((n) => n + 1);
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex-1">
          <h2 className="font-semibold">{tr.titulo}</h2>
          <p className="text-sm text-slate-500">
            {formato(sinPuntaje ? tr.resumenSinPuntos : tr.resumen, { n: reactivos.length, p: total })}
          </p>
        </div>
        {!editando ? (
          <>
            <Insignia tono="verde">{tr.confirmada}</Insignia>
            <Boton variante="secundario" onClick={reeditar}>
              ✎ {tr.reeditar}
            </Boton>
          </>
        ) : reedicion ? (
          <>
            <Boton variante="secundario" onClick={cancelar} disabled={guardando}>
              {tr.cancelar}
            </Boton>
            <Boton onClick={guardar} disabled={guardando}>
              {guardando ? tr.guardando : tr.guardarCambios}
            </Boton>
          </>
        ) : confirmada ? (
          <Insignia tono="verde">{tr.confirmada}</Insignia>
        ) : (
          <Boton onClick={guardar} disabled={guardando}>
            {guardando ? tr.guardando : tr.confirmar}
          </Boton>
        )}
        {error && <p className="w-full text-sm text-error">{error}</p>}
        {reedicion && (
          <p className="w-full rounded-lg bg-aviso-suave px-3 py-2 text-sm text-aviso">
            {evaluadas > 0 ? formato(tr.avisoEvaluadas, { n: evaluadas }) : tr.avisoSinEvaluadas}
          </p>
        )}
        {aviso && (
          <div className="w-full rounded-lg bg-acierto-suave px-3 py-2 text-sm text-acierto">
            <p>{aviso.evaluadas > 0 ? formato(tr.guardadoEvaluadas, { n: aviso.evaluadas }) : tr.guardado}</p>
            {aviso.evaluadas > 0 && (
              <Link href={`/profesor/actividades/${actividadId}?reevaluar=1#reevaluar`} className="mt-1 inline-block font-medium underline">
                {tr.recalificar}
              </Link>
            )}
          </div>
        )}
      </div>
      <fieldset disabled={!editando || guardando} className="min-w-0">
        <ul className="divide-y divide-slate-100">
          {reactivos.map((r) => (
            <li key={r.numero} className="grid gap-3 px-5 py-4 md:grid-cols-[2rem_1fr_9rem]">
              <span className="font-semibold text-slate-700">{r.numero}.</span>
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
                  <TextoMat texto={r.enunciado} />
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={r.tipo}
                    onChange={(e) => cambiar(r.numero, { tipo: e.target.value as TipoReactivo })}
                    disabled={conEntregas}
                    title={conEntregas ? tr.tipoFijo : undefined}
                    className="rounded-full bg-tinta-50 px-2 py-0.5 text-xs font-medium text-tinta-700"
                    aria-label={formato(tr.tipoDe, { n: r.numero })}
                  >
                    {Object.entries(nombreTipo).map(([v, nt]) => (
                      <option key={v} value={v}>{nt}</option>
                    ))}
                  </select>
                  <Insignia>{formato(tr.pagina, { n: r.pagina })}</Insignia>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-500">
                    {tr.tema}
                    <input value={r.tema} onChange={(e) => cambiar(r.numero, { tema: e.target.value })} className={entrada} />
                  </label>
                  <label className="text-xs font-medium text-slate-500">
                    {tr.habilidad}
                    <input value={r.habilidad} onChange={(e) => cambiar(r.numero, { habilidad: e.target.value })} className={entrada} />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-medium text-slate-500">
                  {r.tipo === "abierto" ? tr.criterios : r.tipo === "desarrollo" ? tr.resultadoFinal : tr.respuestaCorrecta}
                  <input value={r.respuesta} onChange={(e) => cambiar(r.numero, { respuesta: e.target.value })} className={entrada} />
                </label>
                {r.pasos && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">{tr.estructura}</p>
                    <ol className="mt-1 grid gap-1 sm:grid-cols-5">
                      {r.pasos.map((p, i) => (
                        <li key={p.nombre} className="rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200">
                          <span className="block font-medium text-slate-700">{p.nombre}</span>
                          {!sinPuntaje && <span className="text-slate-500">{Math.round(p.peso * 100)}%</span>}
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
              {!sinPuntaje && (
                <label className="text-xs font-medium text-slate-500">
                  {tr.puntos}
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={r.puntos}
                    onChange={(e) => cambiar(r.numero, { puntos: Math.max(0, Number(e.target.value)) })}
                    className={`${entrada} text-right`}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>

        <section className="border-t border-slate-200 px-5 py-4">
          <h3 className="font-semibold">{tr.seccionCriterios}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{tr.seccionCriteriosAyuda}</p>
          {criterios.length === 0 && <p className="mt-3 text-sm text-slate-500">{tr.sinCriterios}</p>}
          <ul className="mt-3 space-y-3">
            {criterios.map((c, i) => (
              <li key={c.clave} className="grid gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_6rem_9rem_auto]">
                <label className="text-xs font-medium text-slate-500">
                  {formato(tr.criterio, { n: i + 1 })}
                  <input value={c.nombre} onChange={(e) => cambiarCriterio(c.clave, { nombre: e.target.value })} maxLength={120} className={entrada} />
                </label>
                {!sinPuntaje ? (
                  <label className="text-xs font-medium text-slate-500">
                    {tr.porcentaje}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={c.porcentaje}
                      onChange={(e) => cambiarCriterio(c.clave, { porcentaje: Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className={`${entrada} text-right`}
                    />
                  </label>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <label className="text-xs font-medium text-slate-500">
                  {tr.aplicaA}
                  <input value={c.aplicaA} onChange={(e) => cambiarCriterio(c.clave, { aplicaA: e.target.value })} placeholder={tr.aplicaATodos} className={entrada} />
                </label>
                <div className="flex items-end">
                  {editando && (
                    <button
                      type="button"
                      onClick={() => setCriterios((cs) => cs.filter((x) => x.clave !== c.clave))}
                      className="rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error-suave"
                    >
                      {tr.quitar}
                    </button>
                  )}
                </div>
                <label className="text-xs font-medium text-slate-500 sm:col-span-4">
                  {tr.descripcion}
                  <textarea
                    value={c.descripcion}
                    onChange={(e) => cambiarCriterio(c.clave, { descripcion: e.target.value })}
                    rows={2}
                    maxLength={600}
                    className={entrada}
                  />
                </label>
              </li>
            ))}
          </ul>
          {editando && (
            <button
              type="button"
              onClick={agregarCriterio}
              disabled={criterios.length >= MAX_CRITERIOS_ACTIVIDAD}
              className="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50 disabled:opacity-50"
            >
              + {tr.agregarCriterio}
            </button>
          )}
          {!sinPuntaje && criterios.length > 0 && sumaCriterios !== 100 && (
            <p className="mt-2 rounded-lg bg-aviso-suave p-2 text-xs text-aviso">{formato(tr.sumaCriterios, { n: sumaCriterios })}</p>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              {tr.recomendaciones}
              <textarea value={recomendaciones} onChange={(e) => { if (!reedicion) setConfirmada(false); setRecomendaciones(e.target.value); }} rows={4} className={entrada} />
            </label>
            <label className="text-xs font-medium text-slate-500">
              {tr.indicaciones}
              <textarea
                value={instrucciones}
                onChange={(e) => { if (!reedicion) setConfirmada(false); setInstrucciones(e.target.value); }}
                rows={4}
                maxLength={2000}
                placeholder={tr.indicacionesEjemplo}
                className={entrada}
              />
            </label>
          </div>
        </section>
      </fieldset>
    </div>
  );
}
