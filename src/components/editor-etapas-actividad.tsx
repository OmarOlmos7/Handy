"use client";

import { useState, useTransition } from "react";
import { guardarEtapasActividad } from "@/app/acciones-perfil";
import { Boton } from "@/components/ui";
import type { EtapaCrear } from "@/lib/tipos";

export interface ElementoEtapa {
  etiqueta: string;
  texto: string;
  etapa?: EtapaCrear;
  sugerida: EtapaCrear;
}

export interface ReactivoEtapas extends ElementoEtapa {
  numero: number;
  pasos: ElementoEtapa[];
}

interface Textos {
  automatica: string;
  sugerida: string;
  guardar: string;
  guardando: string;
  guardado: string;
  error: string;
  criterios: string;
}

/** El profesor elige la etapa CREAR de cada reactivo, paso y criterio de su actividad. */
export function EditorEtapasActividad({
  actividadId,
  reactivos: inicialReactivos,
  criterios: inicialCriterios,
  etapas,
  nombres,
  t,
}: {
  actividadId: string;
  reactivos: ReactivoEtapas[];
  criterios: ElementoEtapa[];
  etapas: readonly EtapaCrear[];
  nombres: Record<EtapaCrear, string>;
  t: Textos;
}) {
  const [reactivos, setReactivos] = useState(inicialReactivos);
  const [criterios, setCriterios] = useState(inicialCriterios);
  const [estado, setEstado] = useState<"" | "guardado" | "error">("");
  const [guardando, iniciar] = useTransition();

  const selector = (el: ElementoEtapa, cambiar: (e: EtapaCrear | undefined) => void) => (
    <select
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm sm:w-60"
      value={el.etapa ?? ""}
      onChange={(ev) => {
        setEstado("");
        cambiar((ev.target.value || undefined) as EtapaCrear | undefined);
      }}
      aria-label={el.etiqueta}
    >
      <option value="">
        {t.sugerida.replace("{etapa}", nombres[el.sugerida])}
      </option>
      {etapas.map((e) => (
        <option key={e} value={e}>
          {nombres[e]}
        </option>
      ))}
    </select>
  );

  const fila = (el: ElementoEtapa, cambiar: (e: EtapaCrear | undefined) => void, sangria = false) => (
    <div className={`flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between ${sangria ? "pl-4 sm:pl-6" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${sangria ? "text-slate-700" : "font-semibold text-slate-900"}`}>{el.etiqueta}</p>
        {el.texto && <p className="line-clamp-2 text-xs text-slate-500">{el.texto}</p>}
      </div>
      {selector(el, cambiar)}
    </div>
  );

  function guardar() {
    iniciar(async () => {
      const r = await guardarEtapasActividad(actividadId, {
        reactivos: reactivos.map((r) => ({ numero: r.numero, etapa: r.etapa, pasos: r.pasos.map((p) => p.etapa) })),
        criterios: criterios.map((c) => c.etapa),
      });
      setEstado("ok" in r ? "guardado" : "error");
    });
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        {reactivos.map((r, i) => (
          <div key={r.numero} className="py-1">
            {fila(r, (e) => setReactivos((xs) => xs.map((x, j) => (j === i ? { ...x, etapa: e } : x))))}
            {r.pasos.map((p, k) =>
              fila(
                p,
                (e) => setReactivos((xs) => xs.map((x, j) => (j === i ? { ...x, pasos: x.pasos.map((y, m) => (m === k ? { ...y, etapa: e } : y)) } : x))),
                true,
              ),
            )}
          </div>
        ))}
      </div>
      {criterios.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <h2 className="pt-2 text-sm font-bold tracking-wide text-slate-500 uppercase">{t.criterios}</h2>
          <div className="divide-y divide-slate-100">{criterios.map((c, i) => <div key={i}>{fila(c, (e) => setCriterios((xs) => xs.map((x, j) => (j === i ? { ...x, etapa: e } : x))))}</div>)}</div>
        </div>
      )}
      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-slate-200 backdrop-blur">
        <Boton type="button" onClick={guardar} disabled={guardando}>
          {guardando ? t.guardando : t.guardar}
        </Boton>
        {estado === "guardado" && <p className="text-sm font-medium text-emerald-700">{t.guardado}</p>}
        {estado === "error" && (
          <p role="alert" className="text-sm text-error">
            {t.error}
          </p>
        )}
      </div>
    </div>
  );
}
