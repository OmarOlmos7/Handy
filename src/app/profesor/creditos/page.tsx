import type { Metadata } from "next";
import { TiendaCreditos } from "@/components/tienda-creditos";
import { Encabezado, Tarjeta } from "@/components/ui";
import { saldoCreditos } from "@/lib/datos-ejemplo";

export const metadata: Metadata = { title: "Créditos" };

// Libro de movimientos: cada compra suma, cada evaluación resta. El saldo es la suma.
const movimientos = [
  { fecha: "2026-11-06", concepto: "Evaluación · Cinemática: MRU y MRUA (reservado)", cantidad: -33 },
  { fecha: "2026-10-23", concepto: "Evaluación · Vectores y suma de fuerzas", cantidad: -22 },
  { fecha: "2026-10-20", concepto: "Compra paquete Básico", cantidad: 300 },
  { fecha: "2026-10-15", concepto: "Evaluación · Diagnóstico de álgebra", cantidad: -33 },
  { fecha: "2026-10-01", concepto: "Créditos de bienvenida", cantidad: 200 },
];

export default function Creditos() {
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
            {movimientos.map((m) => (
              <tr key={m.fecha + m.concepto}>
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
    </>
  );
}
