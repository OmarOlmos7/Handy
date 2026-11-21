"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { formato } from "@/lib/i18n/idiomas";
import {
  FILTROS_ENTREGA,
  ORDENES_LISTA,
  type FiltroEntrega,
  type OrdenLista,
} from "@/lib/listas";
import { useTextos } from "./proveedor-textos";

/** Selector de orden (apellido, nombre, matrícula) y filtro Entregadas/Sin entregar de una lista de entregas. */
export function OrdenLista({
  orden,
  filtro,
  conteos,
}: {
  orden: OrdenLista;
  filtro: FiltroEntrega;
  conteos: Record<FiltroEntrega, number>;
}) {
  const { t } = useTextos();
  const tl = t.profesor.lista;
  const router = useRouter();
  const ruta = usePathname();
  const [, iniciar] = useTransition();

  function cambiar(clave: "orden" | "ver", valor: string) {
    const p = new URLSearchParams();
    const valores = { orden, ver: filtro as string, [clave]: valor };
    if (valores.orden !== "apellido") p.set("orden", valores.orden);
    if (valores.ver !== "todas") p.set("ver", valores.ver);
    const q = p.toString();
    iniciar(() => router.replace(q ? `${ruta}?${q}` : ruta, { scroll: false }));
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <label className="flex items-center gap-2 text-slate-600">
        {tl.ordenar}
        <select
          value={orden}
          onChange={(e) => cambiar("orden", e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
        >
          {ORDENES_LISTA.map((o) => (
            <option key={o} value={o}>
              {tl.ordenes[o]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2 text-slate-600">
        <span>{tl.ver}</span>
        <div
          className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300"
          role="group"
          aria-label={tl.ver}
        >
          {FILTROS_ENTREGA.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => cambiar("ver", f)}
              className={`border-l border-slate-300 px-3 py-1.5 first:border-l-0 ${filtro === f ? "bg-tinta-600 font-medium text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {formato(tl.filtros[f], { n: conteos[f] })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
