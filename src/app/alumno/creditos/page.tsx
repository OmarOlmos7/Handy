import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { comprarCreditos } from "@/app/acciones-perfil";
import { Encabezado, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { licenciasObligatorias } from "@/lib/licencias";
import { pagosDemo } from "@/lib/mercadopago";
import { PAQUETES_CREDITOS, historialAlumno, precioPaquete, saldoAlumno } from "@/lib/perfil/bolsa";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.bolsa.titulo };
}

const tarjeta = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]";

/** Bolsa de créditos del alumno y tienda de paquetes (perfil CREAR). */
export default async function CreditosAlumno({ searchParams }: PageProps<"/alumno/creditos">) {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const { error } = await searchParams;
  const { t, locale } = await textos();
  const tb = t.perfil.bolsa;
  const db = await leer();
  const saldo = saldoAlumno(db, alumno.id, licenciasObligatorias());
  const historial = historialAlumno(db, alumno.id).slice(0, 30);
  const concepto = (c: string) => {
    const [tipo, a, ...resto] = c.split(":");
    const b = resto.join(":");
    if (tipo === "autoestudio") return formato(tb.conceptos.autoestudio, { tema: b || a });
    if (tipo === "revision") return formato(tb.conceptos.revision, { tema: b || a });
    if (tipo === "caso") return formato(tb.conceptos.caso, { n: a, actividad: b });
    if (tipo === "compra") return formato(tb.conceptos.compra, { n: a });
    return c;
  };
  const mensajeError = typeof error === "string" && error in tb.tienda.errores ? tb.tienda.errores[error as keyof typeof tb.tienda.errores] : undefined;

  return (
    <>
      <Encabezado migas={[{ texto: t.alumno.panel.titulo, href: "/alumno" }]} rutaEtiqueta={t.profesor.comun.ruta} titulo={tb.titulo} subtitulo={tb.subtitulo} />
      <div className="mx-auto max-w-3xl space-y-4">
        <section className={tarjeta}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-tinta-50 p-4 ring-1 ring-tinta-100">
              <p className="text-xs font-bold tracking-wide text-tinta-700 uppercase">{tb.total}</p>
              <p className="text-3xl font-semibold text-tinta-900 tabular-nums">{saldo.total}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{tb.bolsa}</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">{saldo.bolsa}</p>
              <p className="text-xs text-slate-500">{formato(tb.usados, { n: saldo.usados })}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{tb.extra}</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">{saldo.extra}</p>
            </div>
          </div>
          {!saldo.membresia && <p className="mt-3 text-sm text-amber-800">{tb.sinMembresia}</p>}
        </section>

        <section className={tarjeta}>
          <h2 className="text-base font-semibold text-slate-900">{tb.tienda.titulo}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">{tb.tienda.subtitulo}</p>
          {mensajeError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {mensajeError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {PAQUETES_CREDITOS.map((n) => (
              <form key={n} action={comprarCreditos} className="flex flex-col items-center gap-2 rounded-xl p-3 text-center ring-1 ring-slate-200">
                <input type="hidden" name="creditos" value={n} />
                <p className="text-lg font-semibold text-slate-900">{formato(tb.paquete, { n })}</p>
                <p className="text-sm text-slate-600">{formato(tb.tienda.precio, { p: precioPaquete(n) })}</p>
                <button type="submit" className="w-full rounded-lg bg-tinta-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-tinta-700">
                  {tb.tienda.elegir}
                </button>
              </form>
            ))}
          </div>
          {pagosDemo() && <p className="mt-3 text-xs text-slate-500">{tb.tienda.demo}</p>}
        </section>

        <section className={tarjeta}>
          <h2 className="mb-2 text-base font-semibold text-slate-900">{tb.historial}</h2>
          {historial.length === 0 ? (
            <p className="text-sm text-slate-500">{tb.sinMovimientos}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {historial.map((m, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 text-slate-700">{concepto(m.concepto)}</span>
                  <span className="text-xs whitespace-nowrap text-slate-500">{fechaLarga(m.fecha.slice(0, 10), locale)}</span>
                  <span className={`w-14 text-right font-semibold tabular-nums ${m.cantidad < 0 ? "text-slate-900" : "text-emerald-700"}`}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
