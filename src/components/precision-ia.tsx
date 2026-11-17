"use client";

import { useState } from "react";
import { ESFUERZOS, INFO_ESFUERZO, INFO_MOTOR, MOTORES, consumoRelativo, nivelConsumo } from "@/lib/configuracion";
import type { EsfuerzoIA, MotorIA } from "@/lib/tipos";

/** Cinco rayitas que se llenan según el consumo de tokens. */
export function MedidorConsumo({ nivel, etiqueta = "Consumo" }: { nivel: number; etiqueta?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      {etiqueta}
      <span className="flex gap-1" role="img" aria-label={`${etiqueta}: ${nivel} de 5`}>
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

/**
 * Configuración: elige el motor predeterminado (Rápido, Medio o Preciso) y el esfuerzo
 * de cada uno con una barra de tres posiciones (bajo, medio, alto).
 */
export function ConfigPrecision({ motor, esfuerzos }: { motor: MotorIA; esfuerzos: Record<MotorIA, EsfuerzoIA> }) {
  const [elegido, setElegido] = useState(motor);
  const [nivel, setNivel] = useState(esfuerzos);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {MOTORES.map((m) => {
        const info = INFO_MOTOR[m];
        const activo = elegido === m;
        const p = { motor: m, esfuerzo: nivel[m] };
        return (
          <div
            key={m}
            className={`flex flex-col rounded-xl p-4 ring-2 transition ${activo ? "bg-tinta-50/60 ring-tinta-500" : "bg-white ring-slate-200"}`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="motor"
                value={m}
                checked={activo}
                onChange={() => setElegido(m)}
                className="mt-1 h-4 w-4 accent-tinta-600"
              />
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{info.nombre}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Motor {info.motor}</span>
                </span>
                <span className="mt-1 block text-sm text-slate-600">{info.descripcion}</span>
              </span>
            </label>

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-slate-600">Esfuerzo</legend>
              <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {ESFUERZOS.map((e) => (
                  <label
                    key={e}
                    className="cursor-pointer rounded-md px-2 py-1 text-center text-xs font-medium text-slate-600 has-[:checked]:bg-white has-[:checked]:text-tinta-700 has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta-400"
                  >
                    <input
                      type="radio"
                      name={`esfuerzo_${m}`}
                      value={e}
                      checked={nivel[m] === e}
                      onChange={() => setNivel({ ...nivel, [m]: e })}
                      className="sr-only"
                    />
                    {INFO_ESFUERZO[e].nombre}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-3 flex items-center justify-between gap-2">
              <MedidorConsumo nivel={nivelConsumo(p)} />
              <span className="text-xs text-slate-500">≈ {consumoRelativo(p)}× tokens</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Deslizador de precisión y consumo para una actividad nueva (Rápido · Medio · Preciso). */
export function DeslizadorPrecision({ inicial, esfuerzos }: { inicial: MotorIA; esfuerzos: Record<MotorIA, EsfuerzoIA> }) {
  const [indice, setIndice] = useState(MOTORES.indexOf(inicial));
  const motor = MOTORES[indice] ?? "medio";
  const info = INFO_MOTOR[motor];
  const p = { motor, esfuerzo: esfuerzos[motor] };
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">Precisión y consumo de la IA</legend>
      <input type="hidden" name="motor" value={motor} />
      <input
        type="range"
        min={0}
        max={MOTORES.length - 1}
        step={1}
        value={indice}
        onChange={(e) => setIndice(Number(e.target.value))}
        aria-label="Precisión y consumo de la IA"
        aria-valuetext={`${info.nombre}, motor ${info.motor}`}
        className="mt-3 w-full accent-tinta-600"
      />
      <div className="mt-1 grid grid-cols-3 text-xs font-medium">
        {MOTORES.map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setIndice(i)}
            className={`${i === 0 ? "text-left" : i === MOTORES.length - 1 ? "text-right" : "text-center"} ${
              i === indice ? "text-tinta-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {INFO_MOTOR[m].nombre}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-slate-800">
            {info.nombre} · motor {info.motor} · esfuerzo {INFO_ESFUERZO[p.esfuerzo].nombre.toLowerCase()}
          </span>
          <MedidorConsumo nivel={nivelConsumo(p)} />
        </div>
        <p className="mt-1 text-xs text-slate-600">{info.descripcion}</p>
        <p className="mt-1 text-xs text-slate-500">
          Se usa para generar, resolver y evaluar esta actividad. El esfuerzo de cada nivel se ajusta en Configuración.
        </p>
      </div>
    </fieldset>
  );
}
