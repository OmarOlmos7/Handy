import type { Metadata } from "next";
import { TiendaCreditos } from "@/components/tienda-creditos";
import { ESCALA, PUNTO_PREDETERMINADO } from "@/lib/configuracion";
import { Encabezado, Tarjeta, fechaLarga } from "@/components/ui";
import { QuitarEjemplo } from "@/components/quitar-ejemplo";
import { saldo } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { divisaActual, textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.creditos.titulo };
}

export default async function Creditos() {
  const { db } = await datosProfesor();
  const { t, locale } = await textos();
  const tc = t.profesor.creditos;
  const hayEjemplo = db.actividades.some((a) => a.demo);
  const saldoCreditos = saldo(db);
  const movimientos = db.movimientos;
  return (
    <>
      <Encabezado
        titulo={tc.titulo}
        subtitulo={tc.subtitulo}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-slate-500">{tc.saldo}</p>
          <p className="mt-1 text-3xl font-semibold">{saldoCreditos.toLocaleString(locale)}</p>
          <p className="text-xs text-slate-500">{formato(tc.aproximado, { n: Math.floor(saldoCreditos / (3 * ESCALA[PUNTO_PREDETERMINADO].creditos)).toLocaleString(locale) })}</p>
        </Tarjeta>
      </div>
      <h2 className="mb-3 text-lg font-semibold">{tc.comprar}</h2>
      <TiendaCreditos divisa={await divisaActual()} />
      <h2 className="mb-3 mt-10 text-lg font-semibold">{tc.movimientos}</h2>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t.profesor.comun.fecha}</th>
              <th className="px-4 py-3 font-medium">{tc.concepto}</th>
              <th className="px-4 py-3 text-right font-medium">{tc.creditos}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimientos.map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-slate-600">{fechaLarga(m.fecha, locale)}</td>
                <td className="px-4 py-2">{m.concepto}</td>
                <td className={`px-4 py-2 text-right font-medium ${m.cantidad > 0 ? "text-acierto" : "text-slate-700"}`}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hayEjemplo && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-5">
          <h2 className="font-semibold">{tc.ejemploTitulo}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {tc.ejemploTexto}
          </p>
          <QuitarEjemplo />
        </div>
      )}
    </>
  );
}
