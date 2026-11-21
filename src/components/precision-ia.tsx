"use client";

import { useState } from "react";
import { ESCALA, INFO_MOTOR, PUNTO_PREDETERMINADO, TIEMPO_HOJA_SEG, gruposEscala, indiceEscala } from "@/lib/configuracion";
import { formato } from "@/lib/i18n/idiomas";
import type { EsfuerzoIA, MotorIA, PrecisionIA } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";

/**
 * Barra deslizable de precisión: ocho puntos de Rápido (Haiku 5.5, esfuerzo bajo) a Avanzado
 * (Opus 5.5, esfuerzo medio), con las cinco etiquetas bajo los puntos que abarca cada nivel. Debajo muestra los créditos aproximados por página y el motor
 * elegido como "Modelo - esfuerzo". Manda en el formulario el punto, el motor y el esfuerzo.
 */
function BarraPrecision({ inicial, leyenda, onCambio }: { inicial: number; leyenda: string; onCambio?: (p: PrecisionIA) => void }) {
  const { t, locale } = useTextos();
  const c = t.configuracion;
  const [indice, setIndiceInterno] = useState(ESCALA[inicial] ? inicial : PUNTO_PREDETERMINADO);
  const setIndice = (i: number) => {
    setIndiceInterno(i);
    if (ESCALA[i]) onCambio?.(ESCALA[i].precision);
  };
  const e = ESCALA[indice];
  const modelo = `${INFO_MOTOR[e.precision.motor].nombreCorto} - ${t.esfuerzos[e.precision.esfuerzo]}`;
  const rango = TIEMPO_HOJA_SEG[e.precision.motor];
  const tiempo = rango ? formato(t.usoEscala.tiempo, { a: rango[0], b: rango[1] }) : t.usoEscala.tiempoAlto;
  const creditos = e.creditos === 1 ? c.creditoPagina : formato(c.creditosPagina, { n: e.creditos.toLocaleString(locale) });
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{leyenda}</legend>
      <input type="hidden" name="punto" value={e.clave} />
      <input type="hidden" name="motor" value={e.precision.motor} />
      <input type="hidden" name="esfuerzo" value={e.precision.esfuerzo} />
      <input
        type="range"
        min={0}
        max={ESCALA.length - 1}
        step={1}
        value={indice}
        onChange={(ev) => setIndice(Number(ev.target.value))}
        aria-label={leyenda}
        aria-valuetext={`${t.escala[e.punto].nombre}. ${modelo}. ${creditos}`}
        className="mt-3 w-full accent-tinta-600"
      />
      <div className="relative mt-1 h-5 text-[11px] font-medium sm:text-xs">
        {gruposEscala().map((g, k, todos) => {
          const centro = ((g.desde + g.hasta) / 2 / (ESCALA.length - 1)) * 100;
          const lugar = k === 0 ? { left: 0 } : k === todos.length - 1 ? { right: 0 } : { left: `${centro}%`, transform: "translateX(-50%)" };
          const activo = indice >= g.desde && indice <= g.hasta;
          return (
            <button
              key={g.punto}
              type="button"
              onClick={() => setIndice(g.desde)}
              style={lugar}
              className={`absolute top-0 whitespace-nowrap ${activo ? "text-tinta-700" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.escala[g.punto].nombre}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
        <span className="font-medium text-tinta-700">{modelo}</span>
        <span className="text-slate-700">
          {c.consumo}: <span className="font-medium">≈ {creditos}</span>
        </span>
      </div>
      <div className="mt-2 rounded-lg bg-tinta-50/60 px-3 py-2 text-sm ring-1 ring-tinta-100" aria-live="polite">
        <p>
          <span className="font-medium text-tinta-800">{t.usoEscala.titulo}:</span>{" "}
          <span className="text-slate-700">{t.usoEscala.puntos[e.clave as keyof typeof t.usoEscala.puntos]}</span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{tiempo}</p>
      </div>
    </fieldset>
  );
}

/** Configuración: punto predeterminado de la escala de precisión para las actividades nuevas. */
export function ConfigPrecision({ motor, esfuerzos }: { motor: MotorIA; esfuerzos: Record<MotorIA, EsfuerzoIA> }) {
  const { t } = useTextos();
  return (
    <div className="max-w-2xl">
      <BarraPrecision inicial={indiceEscala({ motor, esfuerzo: esfuerzos[motor] })} leyenda={t.profesor.deslizador.leyenda} />
    </div>
  );
}

/** Barra de precisión de una actividad (al crearla o al re-evaluarla). */
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
  return (
    <BarraPrecision
      inicial={indiceEscala({ motor: inicial, esfuerzo: esfuerzoInicial ?? esfuerzos[inicial] })}
      leyenda={t.profesor.deslizador.leyenda}
      onCambio={onCambio}
    />
  );
}
