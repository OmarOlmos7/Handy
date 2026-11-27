import Link from "next/link";
import type { ItemHoy } from "@/lib/agenda-hoy";
import { hora } from "@/lib/asesorias";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { EMOJI_BLOQUE } from "@/lib/colores-agenda";

const PUNTO: Partial<Record<ItemHoy["tipo"], string>> = {
  clase: "bg-tinta-500",
  comida: "bg-amber-400",
  proyecto: "bg-violet-400",
  reunion: "bg-rose-400",
  evento: "bg-fuchsia-400",
  vacaciones: "bg-teal-400",
  asueto: "bg-red-400",
  cita: "bg-tinta-700",
  entrega: "bg-orange-500",
};

/**
 * "Actividades de hoy": lista corta (hora y nombre) de lo que toca hoy, para verla de un vistazo
 * a la derecha del panel (arriba en el teléfono).
 */
export function ActividadesHoy({ items, t, fecha, agendaHref }: { items: ItemHoy[]; t: Diccionario; fecha: string; agendaHref?: string }) {
  const ta = t.asesorias;
  const th = ta.hoy;
  const nombreTipo = (tipo: ItemHoy["tipo"]) => (tipo === "cita" ? th.cita : tipo === "entrega" ? th.entrega : ta.tipos[tipo]);
  const emoji = (tipo: ItemHoy["tipo"]) => (tipo === "cita" ? "🙋" : tipo === "entrega" ? "📥" : EMOJI_BLOQUE[tipo]);
  return (
    <section aria-labelledby="actividades-hoy" className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="actividades-hoy" className="font-semibold text-slate-900">
          {th.titulo}
        </h2>
        <span className="text-xs text-slate-500 first-letter:uppercase">{fecha}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{th.vacio}</p>
      ) : (
        <ol className="mt-2 divide-y divide-slate-100">
          {items.map((it, i) => {
            const nombre = it.texto || nombreTipo(it.tipo);
            const contenido = (
              <>
                <span className="w-[4.5rem] shrink-0 pt-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                  {it.tipo === "asueto" ? "—" : hora(it.inicio)}
                  {it.fin && it.tipo !== "asueto" && it.tipo !== "entrega" && <span className="block font-normal text-slate-400">{hora(it.fin)}</span>}
                </span>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PUNTO[it.tipo] ?? "bg-slate-400"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900" title={nombre}>
                    <span aria-hidden>{emoji(it.tipo)} </span>
                    {nombre}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[it.texto ? nombreTipo(it.tipo) : undefined, it.detalle].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </>
            );
            return (
              <li key={i}>
                {it.href ? (
                  <Link href={it.href} className="-mx-2 flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2 py-2">{contenido}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {agendaHref && (
        <Link href={agendaHref} className="mt-2 inline-block text-sm font-medium text-tinta-700 hover:underline">
          🗓️ {th.verAgenda} →
        </Link>
      )}
    </section>
  );
}
