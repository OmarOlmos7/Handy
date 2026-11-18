// Resumen de la propuesta de evaluación: qué elementos se califican y con cuántos
// puntos, los criterios con su porcentaje y las recomendaciones del profesor.
import type { Actividad } from "@/lib/tipos";
import { Tarjeta } from "./ui";
import { TextoMat } from "./texto-mat";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

const pct = (n: number) => `${Math.round(n * 100)} %`;

export async function PropuestaEvaluacion({ actividad }: { actividad: Actividad }) {
  const { t } = await textos();
  const tp = t.profesor.propuesta;
  const nombreTipo: Record<string, string> = t.profesor.tipos;
  const total = actividad.reactivos.reduce((s, r) => s + r.puntos, 0);
  const criterios = actividad.criterios ?? [];
  const recomendaciones = actividad.recomendaciones ?? [];
  const sumaCriterios = criterios.reduce((s, c) => s + c.porcentaje, 0);

  return (
    <Tarjeta className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{tp.titulo}</h2>
        <p className="text-sm text-slate-500">
          {formato(tp.resumen, { n: actividad.reactivos.length, p: total })}
        </p>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{tp.elementos}</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">{tp.elemento}</th>
                  <th className="py-2 pr-2 font-medium">{tp.tipo}</th>
                  <th className="py-2 text-right font-medium">{tp.puntos}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actividad.reactivos.map((r) => (
                  <tr key={r.numero} className="align-top">
                    <td className="py-2 pr-2 font-medium">{r.numero}</td>
                    <td className="py-2 pr-2">
                      <span className="font-medium">{r.tema}</span>
                      {r.enunciado && <span className="block text-xs text-slate-500">
                          <TextoMat texto={r.enunciado} />
                        </span>}
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
                    {tp.total}
                  </td>
                  <td className="py-2 text-right">{total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">{tp.criterios}</h3>
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
                {tp.sinCriterios}
              </p>
            )}
            {criterios.length > 0 && sumaCriterios !== 100 && sumaCriterios > 0 && (
              <p className="mt-2 rounded-lg bg-aviso-suave p-2 text-xs text-aviso">
                {formato(tp.sumaMal, { n: sumaCriterios })}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700">{tp.recomendaciones}</h3>
            {recomendaciones.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {recomendaciones.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{tp.sinRecomendaciones}</p>
            )}
          </div>

          {actividad.instrucciones?.trim() && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600">{tp.indicaciones}</summary>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{actividad.instrucciones}</p>
            </details>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}
