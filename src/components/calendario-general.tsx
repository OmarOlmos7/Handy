import Link from "next/link";
import type { ItemHoy } from "@/lib/agenda-hoy";
import { hora } from "@/lib/asesorias";
import { COLOR_BLOQUE, EMOJI_BLOQUE } from "@/lib/colores-agenda";
import { formato } from "@/lib/i18n/idiomas";
import type { Diccionario } from "@/lib/i18n/diccionario";

export interface DiaCalendario {
  fecha: string;
  items: ItemHoy[];
  /** Del mes que se ve (en la vista de mes, los días de otro mes se ven tenues). */
  delMes?: boolean;
}

const COLOR_ITEM: Partial<Record<ItemHoy["tipo"], string>> = {
  cita: "bg-tinta-600 text-white",
  entrega: "bg-orange-500 text-white",
};

export type VistaCalendario = "dia" | "semana" | "mes";

/** Liga con los parámetros de la vista cambiados. */
export type HacerRuta = (cambios: { vista?: string; fecha?: string; curso?: string | null }) => string;

/**
 * Calendario general de solo lectura (semana o mes) con filtro por curso: clases, actividades
 * comunes, asesorías, cierres de entrega y asueto. Lo usan el profesor y el alumno.
 */
export function CalendarioGeneral({
  t,
  locale,
  vista,
  dias,
  hoy,
  titulo,
  ruta,
  anterior,
  siguiente,
  actual,
  cursos,
  curso,
  maxPorDia = 4,
  pestanas,
}: {
  /** Sustituye el cambio Semana/Mes (el profesor agrega "Editar agenda"). */
  pestanas?: React.ReactNode;
  t: Diccionario;
  locale: string;
  vista: VistaCalendario;
  dias: DiaCalendario[];
  hoy: string;
  titulo: string;
  ruta: HacerRuta;
  anterior: string;
  siguiente: string;
  actual: string;
  cursos: { id: string; nombre: string }[];
  curso?: string;
  maxPorDia?: number;
}) {
  const ta = t.asesorias;
  const tc = ta.calendario;
  const nombreTipo = (it: ItemHoy) => (it.tipo === "cita" ? ta.hoy.cita : it.tipo === "entrega" ? ta.hoy.entrega : ta.tipos[it.tipo]);
  const emoji = ({ tipo, comun }: ItemHoy) => (comun ? "📣" : tipo === "cita" ? "🙋" : tipo === "entrega" ? "📥" : EMOJI_BLOQUE[tipo]);
  const color = ({ tipo }: ItemHoy) => (tipo === "cita" || tipo === "entrega" ? COLOR_ITEM[tipo]! : tipo === "personal" ? COLOR_BLOQUE.otro : COLOR_BLOQUE[tipo]);
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ring-1 transition ${activo ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-600 ring-slate-300 hover:ring-tinta-400"}`;
  const boton = "rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50";
  const numeroDia = (f: string) => Number(f.slice(8, 10));
  const fechaCorta = (f: string) => new Date(`${f}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

  const item = (it: ItemHoy, i: number, compacto: boolean, grande = false) => {
    const nombre = it.texto || nombreTipo(it);
    const etiqueta = [
      it.tipo === "asueto" ? undefined : `${hora(it.inicio)}${it.fin && it.tipo !== "entrega" ? `–${hora(it.fin)}` : ""}`,
      nombre,
      it.texto && it.tipo !== "clase" ? nombreTipo(it) : undefined,
      it.detalle,
      it.comun ? tc.comun : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    const contenido = compacto ? (
      <span className="block truncate">
        {it.tipo !== "asueto" && <span className="font-semibold tabular-nums">{hora(it.inicio)} </span>}
        {emoji(it)} {nombre}
      </span>
    ) : (
      <>
        <span className="block text-[11px] font-semibold tabular-nums opacity-80">
          {it.tipo === "asueto" ? ta.tipos.asueto : `${hora(it.inicio)}${it.fin && it.tipo !== "entrega" ? ` – ${hora(it.fin)}` : ""}`}
        </span>
        <span className="block font-medium">
          {emoji(it)} {nombre}
        </span>
        {(it.detalle || it.comun) && <span className="block truncate text-[11px] opacity-80">{[it.comun ? tc.comun : undefined, it.detalle].filter(Boolean).join(" · ")}</span>}
      </>
    );
    const clase = `block rounded-md leading-snug ${grande ? "px-3 py-2 text-sm" : "px-1.5 py-1 text-xs"} ${color(it)} ${it.comun ? "ring-2 ring-fuchsia-400" : ""}`;
    return (
      <li key={i} title={etiqueta}>
        {it.href ? (
          <Link href={it.href} className={`${clase} hover:brightness-95`} aria-label={etiqueta}>
            {contenido}
          </Link>
        ) : (
          <span className={clase}>{contenido}</span>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={ruta({ fecha: anterior })} className={boton} aria-label={tc.anterior} title={tc.anterior}>
            ←
          </Link>
          <Link href={ruta({ fecha: actual })} className={boton}>
            {tc.hoy}
          </Link>
          <Link href={ruta({ fecha: siguiente })} className={boton} aria-label={tc.siguiente} title={tc.siguiente}>
            →
          </Link>
          <h2 className="ml-1 text-base font-semibold text-slate-800 first-letter:uppercase">{titulo}</h2>
        </div>
        {pestanas ?? (
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="tablist">
          {(["dia", "semana", "mes"] as const).map((v) => (
            <Link
              key={v}
              href={ruta({ vista: v })}
              role="tab"
              aria-selected={vista === v}
              className={`rounded-md px-3 py-1.5 font-medium ${vista === v ? "bg-white text-tinta-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {v === "dia" ? tc.vistaDia : v === "semana" ? tc.vistaSemana : tc.vistaMes}
            </Link>
          ))}
        </div>
        )}
      </div>
      {cursos.length > 1 && (
        <nav aria-label={tc.filtro} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">{tc.filtro}:</span>
          <Link href={ruta({ curso: null })} className={chip(!curso)}>
            {tc.todos}
          </Link>
          {cursos.map((c) => (
            <Link key={c.id} href={ruta({ curso: c.id })} className={chip(curso === c.id)}>
              {c.nombre}
            </Link>
          ))}
        </nav>
      )}

      {vista === "dia" ? (
        <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${dias[0]?.fecha === hoy ? "ring-2 ring-tinta-400" : "ring-slate-200"}`}>
          {dias[0]?.items.length ? (
            <ul className="space-y-2">{dias[0].items.map((it, j) => item(it, j, false, true))}</ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">{tc.sinNada}</p>
          )}
        </section>
      ) : vista === "semana" ? (
        <div className="grid gap-3 sm:grid-cols-5">
          {dias.map((d, i) => (
            <section key={d.fecha} className={`min-w-0 rounded-xl bg-white p-2 shadow-sm ring-1 ${d.fecha === hoy ? "ring-2 ring-tinta-400" : "ring-slate-200"}`}>
              <h3 className={`mb-2 text-center text-xs font-semibold ${d.fecha === hoy ? "text-tinta-700" : "text-slate-700"}`}>
                {ta.dias[i]} <span className="font-normal text-slate-500">{fechaCorta(d.fecha)}</span>
              </h3>
              {d.items.length ? <ul className="space-y-1.5">{d.items.map((it, j) => item(it, j, false))}</ul> : <p className="py-2 text-center text-xs text-slate-400">{tc.sinNada}</p>}
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="hidden grid-cols-5 border-b border-slate-200 bg-slate-50 sm:grid">
            {ta.dias.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center text-xs font-semibold text-slate-600">
                {d}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-5">
            {dias.map((d, i) => {
              const extra = d.items.length - maxPorDia;
              return (
                <section
                  key={d.fecha}
                  className={`min-h-28 min-w-0 border-b border-slate-100 p-1.5 sm:border-r sm:[&:nth-child(5n)]:border-r-0 ${d.delMes === false ? "bg-slate-50/70 opacity-60" : ""} ${
                    d.items.length === 0 ? "hidden sm:block" : ""
                  }`}
                >
                  <Link
                    href={ruta({ vista: "semana", fecha: d.fecha })}
                    className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold hover:bg-tinta-50 ${
                      d.fecha === hoy ? "bg-tinta-600 text-white hover:bg-tinta-700" : "text-slate-700"
                    }`}
                    title={tc.vistaSemana}
                  >
                    <span className="mr-1 sm:hidden">{ta.diasCortos[i % 5]}</span>
                    {numeroDia(d.fecha)}
                  </Link>
                  <ul className="space-y-1">{d.items.slice(0, maxPorDia).map((it, j) => item(it, j, true))}</ul>
                  {extra > 0 && (
                    <Link href={ruta({ vista: "semana", fecha: d.fecha })} className="mt-1 block px-1 text-[11px] font-medium text-tinta-700 hover:underline">
                      {formato(tc.mas, { n: String(extra) })}
                    </Link>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-fuchsia-50 ring-2 ring-fuchsia-400" /> 📣 {tc.comun}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-tinta-600" /> 🙋 {ta.hoy.cita}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-orange-500" /> 📥 {ta.hoy.entrega}
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${COLOR_BLOQUE.asueto} ring-1 ring-black/5`} /> 🎉 {ta.tipos.asueto}
        </li>
      </ul>
    </div>
  );
}
