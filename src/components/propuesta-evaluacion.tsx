// Resumen de la propuesta de evaluación: qué elementos se califican y con cuántos
// puntos, los criterios con su porcentaje y las recomendaciones del profesor.
import type { Actividad } from "@/lib/tipos";
import { Tarjeta } from "./ui";

const nombreTipo: Record<string, string> = {
  verdadero_falso: "V / F",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación de columnas",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Abierto",
};

const pct = (n: number) => `${Math.round(n * 100)} %`;

export function PropuestaEvaluacion({ actividad }: { actividad: Actividad }) {
  const total = actividad.reactivos.reduce((s, r) => s + r.puntos, 0);
  const criterios = actividad.criterios ?? [];
  const recomendaciones = actividad.recomendaciones ?? [];
  const sumaCriterios = criterios.reduce((s, c) => s + c.porcentaje, 0);

  return (
    <Tarjeta className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Propuesta de evaluación</h2>
        <p className="text-sm text-slate-500">
          {actividad.reactivos.length} elementos · {total} puntos en total
        </p>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Elementos que se evalúan</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Elemento</th>
                  <th className="py-2 pr-2 font-medium">Tipo</th>
                  <th className="py-2 text-right font-medium">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actividad.reactivos.map((r) => (
                  <tr key={r.numero} className="align-top">
                    <td className="py-2 pr-2 font-medium">{r.numero}</td>
                    <td className="py-2 pr-2">
                      <span className="font-medium">{r.tema}</span>
                      {r.enunciado && <span className="block text-xs text-slate-500">{r.enunciado}</span>}
                      {r.pasos?.length ? (
                        <span className="mt-1 block text-xs text-slate-600">
                          {r.pasos.map((p) => `${p.nombre} ${pct(p.peso)}`).join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 text-slate-600">{nombreTipo[r.tipo] ?? r.tipo}</td>
                    <td className="py-2 text-right font-medium">{r.puntos}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2 text-right">{total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Criterios de evaluación</h3>
            {criterios.length ? (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {criterios.map((c) => (
                  <li key={c.nombre} className="flex gap-3 py-2">
                    <span className="w-14 shrink-0 font-semibold text-tinta-700">{c.porcentaje ? `${c.porcentaje} %` : "—"}</span>
                    <span>
                      <span className="font-medium">{c.nombre}</span>
                      {c.descripcion && <span className="block text-xs text-slate-500">{c.descripcion}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No indicaste criterios con porcentaje. La IA califica con los puntos de cada elemento.
              </p>
            )}
            {criterios.length > 0 && sumaCriterios !== 100 && sumaCriterios > 0 && (
              <p className="mt-2 rounded-lg bg-aviso-suave p-2 text-xs text-aviso">
                Los porcentajes suman {sumaCriterios} %, no 100 %. Revísalos y vuelve a generar la rúbrica.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700">Recomendaciones a seguir al evaluar</h3>
            {recomendaciones.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {recomendaciones.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sin recomendaciones. Puedes agregarlas abajo y volver a generar.</p>
            )}
          </div>

          {actividad.instrucciones?.trim() && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600">Tus indicaciones originales</summary>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{actividad.instrucciones}</p>
            </details>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}
