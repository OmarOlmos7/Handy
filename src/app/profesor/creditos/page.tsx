import type { Metadata } from "next";
import { TiendaCreditos } from "@/components/tienda-creditos";
import { Encabezado, Tarjeta } from "@/components/ui";
import { ReiniciarDemo } from "@/components/reiniciar-demo";
import { leer, saldo } from "@/lib/almacen";

export const metadata: Metadata = { title: "Créditos" };

export default async function Creditos() {
  const db = await leer();
  const saldoCreditos = saldo(db);
  const movimientos = db.movimientos;
  return (
    <>
      <Encabezado
        titulo="Créditos"
        subtitulo="1 crédito = 1 página de alumno evaluada. Subir tu solución y generar la rúbrica es gratis."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-slate-500">Saldo disponible</p>
          <p className="mt-1 text-3xl font-semibold">{saldoCreditos}</p>
          <p className="text-xs text-slate-500">≈ {Math.floor(saldoCreditos / 3)} alumnos con actividades de 3 páginas</p>
        </Tarjeta>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Comprar créditos</h2>
      <TiendaCreditos />
      <h2 className="mb-3 mt-10 text-lg font-semibold">Movimientos</h2>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 text-right font-medium">Créditos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimientos.map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-slate-600">{m.fecha}</td>
                <td className="px-4 py-2">{m.concepto}</td>
                <td className={`px-4 py-2 text-right font-medium ${m.cantidad > 0 ? "text-acierto" : "text-slate-700"}`}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-5">
        <h2 className="font-semibold">Demo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Regresa la plataforma a los datos de ejemplo. Se borran grupos, actividades y fotos que hayas subido.
        </p>
        <ReiniciarDemo />
      </div>
    </>
  );
}
