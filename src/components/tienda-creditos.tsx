"use client";

import { useState } from "react";
import { Boton } from "./ui";

const paquetes = [
  { id: "basico", nombre: "Básico", creditos: 300, precio: 249 },
  { id: "profesor", nombre: "Profesor", creditos: 1500, precio: 999, destacado: true },
  { id: "escuela", nombre: "Escuela", creditos: 10000, precio: 5499 },
];

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** Demostración del flujo de compra. En producción redirige al checkout de Mercado Pago o Stripe
 * y los créditos se acreditan solo cuando llega el webhook de pago confirmado. */
export function TiendaCreditos() {
  const [elegido, setElegido] = useState("profesor");
  const [metodo, setMetodo] = useState("tarjeta");
  const [enviado, setEnviado] = useState(false);
  const p = paquetes.find((x) => x.id === elegido)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 sm:grid-cols-3">
        {paquetes.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setElegido(x.id);
              setEnviado(false);
            }}
            aria-pressed={elegido === x.id}
            className={`rounded-xl bg-white p-5 text-left ring-2 transition ${elegido === x.id ? "ring-tinta-600" : "ring-slate-200 hover:ring-slate-300"}`}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold">{x.nombre}</span>
              {x.destacado && <span className="rounded-full bg-tinta-50 px-2 py-0.5 text-xs text-tinta-700">Popular</span>}
            </span>
            <span className="mt-2 block text-2xl font-semibold">{pesos(x.precio)}</span>
            <span className="block text-sm text-slate-500">{x.creditos.toLocaleString("es-MX")} créditos</span>
            <span className="mt-2 block text-xs text-slate-500">
              ${(x.precio / x.creditos).toFixed(2)} por página
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold">Resumen</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Paquete</dt>
            <dd>{p.nombre}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Créditos</dt>
            <dd>{p.creditos.toLocaleString("es-MX")}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
            <dt>Total (IVA incluido)</dt>
            <dd>{pesos(p.precio)}</dd>
          </div>
        </dl>
        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="mb-1 font-medium">Método de pago</legend>
          {[
            ["tarjeta", "Tarjeta de crédito o débito"],
            ["oxxo", "Efectivo en OXXO"],
            ["spei", "Transferencia SPEI"],
          ].map(([v, t]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="metodo" value={v} checked={metodo === v} onChange={() => setMetodo(v)} />
              {t}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" /> Necesito factura (CFDI)
        </label>
        {enviado ? (
          <p className="mt-4 rounded-lg bg-aviso-suave p-3 text-sm text-aviso" role="status">
            Demostración: aquí se abriría el pago de Mercado Pago. Los créditos se suman cuando el pago se confirma.
          </p>
        ) : (
          <Boton className="mt-4 w-full" onClick={() => setEnviado(true)}>
            Pagar {pesos(p.precio)}
          </Boton>
        )}
      </div>
    </div>
  );
}
