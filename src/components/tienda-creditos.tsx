"use client";

import { useState } from "react";
import { type Divisa, formatoPorPagina, formatoPrecio } from "@/lib/divisas";
import { PLANES, type Plan } from "@/lib/planes";
import { Boton } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

const paquetes = PLANES.filter((p) => p.enTienda).map((p) => ({ id: p.id, creditos: p.creditos, precio: p.precio ?? 0, destacado: p.destacado }));

/** Demostración del flujo de compra. En producción redirige al checkout de Mercado Pago o Stripe
 * y los créditos se acreditan solo cuando llega el webhook de pago confirmado. */
export function TiendaCreditos({ divisa }: { divisa: Divisa }) {
  const { t, locale } = useTextos();
  const tc = t.profesor.creditos;
  const nombre = (id: Plan["id"]) => t.planes[id].nombre;
  const [elegido, setElegido] = useState<string>("pro");
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
              <span className="font-semibold">{nombre(x.id)}</span>
              {x.destacado && <span className="rounded-full bg-tinta-50 px-2 py-0.5 text-xs text-tinta-700">{tc.popular}</span>}
            </span>
            <span className="mt-2 block text-2xl font-semibold">{formatoPrecio(x.precio, divisa, locale)}</span>
            <span className="block text-sm text-slate-500">{formato(t.comun.creditos, { n: x.creditos.toLocaleString(locale) })}</span>
            <span className="mt-2 block text-xs text-slate-500">
              {formato(tc.porPagina, { p: formatoPorPagina(x.precio, x.creditos, divisa, locale) })}
            </span>
          </button>
        ))}
        <div className="rounded-xl border border-dashed border-slate-300 p-5 text-left">
          <span className="font-semibold">{nombre("escuela")}</span>
          <span className="mt-2 block text-lg font-semibold">{tc.contactanos}</span>
          <span className="mt-2 block text-xs text-slate-500">{tc.escuelaTexto}</span>
        </div>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold">{tc.resumen}</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{tc.paquete}</dt>
            <dd>{nombre(p.id)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{tc.creditos}</dt>
            <dd>{p.creditos.toLocaleString(locale)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
            <dt>{tc.total}</dt>
            <dd>{formatoPrecio(p.precio, divisa, locale)}</dd>
          </div>
        </dl>
        {divisa.codigo !== "MXN" && <p className="mt-2 text-xs text-slate-500">{tc.cobroEnMxn}</p>}
        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="mb-1 font-medium">{tc.metodo}</legend>
          {(["tarjeta", "oxxo", "spei"] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="metodo" value={v} checked={metodo === v} onChange={() => setMetodo(v)} />
              {tc.metodos[v]}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" /> {tc.factura}
        </label>
        {enviado ? (
          <p className="mt-4 rounded-lg bg-aviso-suave p-3 text-sm text-aviso" role="status">
            {tc.demo}
          </p>
        ) : (
          <Boton className="mt-4 w-full" onClick={() => setEnviado(true)}>
            {formato(tc.pagar, { p: formatoPrecio(p.precio, divisa, locale) })}
          </Boton>
        )}
      </div>
    </div>
  );
}
