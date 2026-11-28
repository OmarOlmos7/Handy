import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { simularCompra } from "@/app/acciones-perfil";
import { BotonLink, Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { pagosDemo } from "@/lib/mercadopago";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.bolsa.tienda.titulo };
}

/** Estado de una compra de créditos (a donde vuelve Mercado Pago, o para simular el pago en demo). */
export default async function CompraCreditos({ params }: PageProps<"/alumno/creditos/[llave]">) {
  const { llave } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const db = await leer();
  const compra = (db.comprasCreditos ?? []).find((c) => c.llave === decodeURIComponent(llave).toUpperCase() && c.alumnoId === alumno.id);
  if (!compra) notFound();
  const { t } = await textos();
  const tb = t.perfil.bolsa;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: tb.titulo, href: "/alumno/creditos" },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={formato(tb.paquete, { n: compra.creditos })}
        subtitulo={formato(tb.tienda.compra, { llave: compra.llave })}
      />
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-2xl font-semibold text-slate-900">{formato(tb.tienda.precio, { p: compra.precio })}</p>
        <p className={`rounded-lg px-3 py-2 text-sm font-medium ${compra.estado === "pagada" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{tb.tienda.estado[compra.estado]}</p>
        {compra.estado === "pendiente" && pagosDemo() && (
          <form action={simularCompra}>
            <input type="hidden" name="llave" value={compra.llave} />
            <button type="submit" className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700">
              {tb.tienda.simular}
            </button>
            <p className="mt-2 text-xs text-slate-500">{tb.tienda.demo}</p>
          </form>
        )}
        <BotonLink variante="secundario" href="/alumno/creditos">
          {tb.tienda.volver}
        </BotonLink>
      </div>
    </>
  );
}
