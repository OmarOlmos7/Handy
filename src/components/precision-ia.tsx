"use client";

import { useState } from "react";
import { ESCALA, INFO_MOTOR, indiceEscala } from "@/lib/configuracion";
import { formato } from "@/lib/i18n/idiomas";
import type { EsfuerzoIA, MotorIA, PrecisionIA } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";

/** Cinco rayitas que se llenan según el consumo de tokens. */
export function MedidorConsumo({ nivel, etiqueta = "Consumo", ariaLabel }: { nivel: number; etiqueta?: string; ariaLabel?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      {etiqueta}
      <span className="flex gap-1" role="img" aria-label={ariaLabel ?? `${etiqueta}: ${nivel} de 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full ${i <= nivel ? (nivel >= 4 ? "bg-aviso" : "bg-tinta-500") : "bg-slate-200"}`}
          />
        ))}
      </span>
    </span>
  );
}

/** Datos de un punto de la escala para mostrarlo: nombre, motor de IA, tokens y créditos. */
function usePunto() {
  const { t, locale } = useTextos();
  const c = t.configuracion;
  return (i: number) => {
    const e = ESCALA[i];
    return {
      nombre: t.escala[e.punto].nombre,
      descripcion: t.escala[e.punto].descripcion,
      motor: formato(c.motorEsfuerzo, {
        m: INFO_MOTOR[e.precision.motor].nombreModelo,
        e: t.esfuerzos[e.precision.esfuerzo].toLocaleLowerCase(locale),
      }),
      tokens: formato(c.tokensPagina, { n: e.tokens.toLocaleString(locale) }),
      creditos: e.creditos === 1 ? c.creditoPagina : formato(c.creditosPagina, { n: e.creditos }),
      // Consumo de 1 a 5 según su lugar en la escala.
      consumo: i + 1,
      consumoDe: formato(c.consumoDe, { e: c.consumo, n: i + 1 }),
      etiquetaConsumo: c.consumo,
    };
  };
}

/**
 * Configuración: elige el punto predeterminado de la escala de precisión (de Rápido a Preciso).
 * Cada punto fija el motor de IA y su esfuerzo.
 */
export function ConfigPrecision({ motor, esfuerzos }: { motor: MotorIA; esfuerzos: Record<MotorIA, EsfuerzoIA> }) {
  const punto = usePunto();
  const [elegido, setElegido] = useState(indiceEscala({ motor, esfuerzo: esfuerzos[motor] }));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {ESCALA.map((e, i) => {
        const p = punto(i);
        const activo = elegido === i;
        return (
          <label
            key={e.punto}
            className={`flex cursor-pointer flex-col rounded-xl p-4 ring-2 transition ${activo ? "bg-tinta-50/60 ring-tinta-500" : "bg-white ring-slate-200"}`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="punto"
                value={e.punto}
                checked={activo}
                onChange={() => setElegido(i)}
                className="h-4 w-4 accent-tinta-600"
              />
              <span className="font-semibold text-slate-900">{p.nombre}</span>
            </span>
            <span className="mt-2 text-xs font-medium text-tinta-700">{p.motor}</span>
            <span className="mt-1 flex-1 text-sm text-slate-600">{p.descripcion}</span>
            <span className="mt-3">
              <MedidorConsumo nivel={p.consumo} etiqueta={p.etiquetaConsumo} ariaLabel={p.consumoDe} />
            </span>
            <span className="mt-1 text-xs text-slate-500">{p.tokens}</span>
            <span className="text-xs font-medium text-slate-700">{p.creditos}</span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Deslizador de precisión y consumo de una actividad: cinco puntos del análisis más rápido al
 * más preciso. Cada punto fija el motor de IA y el esfuerzo, y muestra los tokens y créditos
 * estimados por página.
 */
export function DeslizadorPrecision({
  inicial,
  esfuerzos,
  esfuerzoInicial,
  onCambio,
}: {
  inicial: MotorIA;
  /** Esfuerzo con el que arranca cada motor (el de Configuración). */
  esfuerzos: Record<MotorIA, EsfuerzoIA>;
  /** Esfuerzo ya guardado para el motor inicial (por ejemplo, al re-evaluar). */
  esfuerzoInicial?: EsfuerzoIA;
  /** Avisa la precisión elegida (por ejemplo, para recalcular los créditos). */
  onCambio?: (p: PrecisionIA) => void;
}) {
  const { t } = useTextos();
  const td = t.profesor.deslizador;
  const c = t.configuracion;
  const punto = usePunto();
  const [indice, setIndiceInterno] = useState(() => indiceEscala({ motor: inicial, esfuerzo: esfuerzoInicial ?? esfuerzos[inicial] }));
  const setIndice = (i: number) => {
    setIndiceInterno(i);
    if (ESCALA[i]) onCambio?.(ESCALA[i].precision);
  };
  const e = ESCALA[indice] ?? ESCALA[2];
  const p = punto(indice);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{td.leyenda}</legend>
      <input type="hidden" name="motor" value={e.precision.motor} />
      <input type="hidden" name="esfuerzo" value={e.precision.esfuerzo} />
      <input
        type="range"
        min={0}
        max={ESCALA.length - 1}
        step={1}
        value={indice}
        onChange={(ev) => setIndice(Number(ev.target.value))}
        aria-label={td.leyenda}
        aria-valuetext={`${p.nombre}. ${p.motor}`}
        className="mt-3 w-full accent-tinta-600"
      />
      <div className="mt-1 grid grid-cols-5 text-[11px] font-medium sm:text-xs">
        {ESCALA.map((x, i) => (
          <button
            key={x.punto}
            type="button"
            onClick={() => setIndice(i)}
            className={`${i === 0 ? "text-left" : i === ESCALA.length - 1 ? "text-right" : "text-center"} ${
              i === indice ? "text-tinta-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.escala[x.punto].nombre}
          </button>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-slate-400">
        <span>{c.menos}</span>
        <span>{c.mas}</span>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-slate-800">{p.nombre}</span>
          <MedidorConsumo nivel={p.consumo} etiqueta={p.etiquetaConsumo} ariaLabel={p.consumoDe} />
        </div>
        <p className="mt-1 text-xs font-medium text-tinta-700">{p.motor}</p>
        <p className="mt-1 text-xs text-slate-600">{p.descripcion}</p>
        <p className="mt-2 text-xs text-slate-500">
          {p.tokens} · <span className="font-medium text-slate-700">{p.creditos}</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">{td.ayuda}</p>
      </div>
    </fieldset>
  );
}
