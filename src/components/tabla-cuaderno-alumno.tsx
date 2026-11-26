// Cuaderno de calificaciones del alumno, con el mismo formato que el del profesor:
// columnas agrupadas por tipo de actividad, solo con la fila del alumno y, abajo,
// el promedio del grupo cuando hay suficientes calificados. Es de solo lectura.
import Link from "next/link";
import { esColumnaProyecto } from "@/lib/proyectos";
import { formatoCal, nivelDe, type Nivel } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { MINIMO_COMPARACION, type CuadernoAlumno } from "@/lib/portal-alumno";
import type { Escala } from "@/lib/tipos";
import { tonoTipo } from "./tonos-tipo";

const SEMAFORO: Record<Nivel, string> = {
  alto: "bg-acierto-suave text-acierto",
  medio: "bg-aviso-suave text-aviso",
  bajo: "bg-error-suave text-error",
};

function Promedio({ valor, escala }: { valor: number | null; escala: Escala }) {
  if (valor === null) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-block min-w-12 rounded-md px-2 py-1 font-semibold tabular-nums ${SEMAFORO[nivelDe(valor, escala)]}`}>
      {formatoCal(valor, escala)}
    </span>
  );
}

export async function TablaCuadernoAlumno({ cuaderno, nombre, matricula, grupoId }: { cuaderno: CuadernoAlumno; nombre: string; matricula: string; grupoId?: string }) {
  const { t } = await textos();
  const tq = t.profesor.cuaderno;
  const tc = t.profesor.comun;
  const ta = t.alumno.cuaderno;
  const tp = tq.plan;
  const grupos = cuaderno.grupos.map((g, i) => ({ ...g, tono: tonoTipo(i) }));
  const final = cuaderno.final;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-acierto-suave ring-1 ring-acierto/40" /> {tq.alto}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-aviso-suave ring-1 ring-aviso/40" /> {tq.medio}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-error-suave ring-1 ring-error/40" /> {tq.bajo}
        </span>
        <span>
          <strong className="font-semibold">{tq.ne}</strong>
          {tq.noEntregoLeyenda}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" /> {ta.ajustada}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th rowSpan={2} className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-2 text-left">
                {tc.alumno}
              </th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left">
                {tc.matricula}
              </th>
              {grupos.map((g) => (
                <th key={g.etiqueta} colSpan={g.columnas.length + 1} className={`border-b border-l border-slate-200 px-3 py-2 text-center text-slate-700 ${g.tono.cabeza}`}>
                  {g.etiqueta}
                  {final && (
                    <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal text-tinta-700">
                      {g.peso !== undefined ? formato(tp.porcentajeTipo, { n: g.peso }) : tp.sinPeso}
                    </span>
                  )}
                </th>
              ))}
              <th rowSpan={2} className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-center text-slate-700">
                {tq.promedio}
                <span className="block text-[10px] font-normal normal-case">{formato(tq.sobre, { n: cuaderno.escala })}</span>
              </th>
              {final && (
                <th rowSpan={2} className="border-b border-l border-slate-200 bg-tinta-50 px-3 py-2 text-center text-tinta-800">
                  {tp.notaFinal}
                  <span className="block text-[10px] font-normal normal-case">{formato(tq.sobre, { n: cuaderno.escala })}</span>
                </th>
              )}
            </tr>
            <tr>
              {grupos.map((g) => [
                ...g.columnas.map((c, i) => (
                  <th
                    key={c.id}
                    className={`max-w-36 border-b border-slate-200 px-2 py-2 text-center align-bottom text-xs font-medium text-slate-700 ${g.tono.cabeza} ${i === 0 ? "border-l" : ""}`}
                  >
                    {c.celda.estado === "calificada" ? (
                      <Link
                        href={esColumnaProyecto(c.id) ? `/alumno/cursos/${grupoId}/proyecto` : `/alumno/reporte/${c.id}`}
                        className="line-clamp-2 hover:text-tinta-700"
                        title={c.titulo}
                      >
                        {esColumnaProyecto(c.id) && "🛠️ "}
                        {c.titulo}
                      </Link>
                    ) : (
                      <span className="line-clamp-2" title={c.titulo}>
                        {c.titulo}
                      </span>
                    )}
                    <span className="block text-[10px] font-normal text-slate-500">/ {c.escala}</span>
                  </th>
                )),
                <th
                  key={`prom-${g.etiqueta}`}
                  className={`border-b border-l border-slate-200 border-l-slate-300/70 px-2 py-2 text-center align-bottom text-xs font-semibold text-slate-800 ${g.tono.promedio}`}
                >
                  {tq.promedio}
                  <span className="block text-[10px] font-normal text-slate-500">{formato(tq.sobre, { n: cuaderno.escala })}</span>
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 bg-white px-4 py-1.5 font-medium text-slate-800">{nombre}</td>
              <td className="whitespace-nowrap border-b border-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">{matricula}</td>
              {grupos.map((g) => [
                ...g.columnas.map(({ id, celda, escala }, i) => (
                <td key={id} className={`border-b border-slate-100 px-2 py-1.5 text-center ${g.tono.celda} ${i === 0 ? "border-l border-l-slate-200" : ""}`}>
                  <span
                    title={celda.estado === "calificada" ? undefined : ta.estados[celda.estado]}
                    className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-md px-2 py-1 tabular-nums ${
                      celda.estado === "calificada" || celda.estado === "no_entregada" ? SEMAFORO[nivelDe(celda.valor ?? 0, escala)] : "text-slate-400"
                    }`}
                  >
                    {celda.estado === "calificada" && formatoCal(celda.valor!, escala)}
                    {celda.estado === "no_entregada" && (
                      <>
                        0 <span className="text-[10px] font-semibold">{tq.ne}</span>
                      </>
                    )}
                    {celda.estado === "pendiente" && tq.porEvaluar}
                    {celda.estado === "sin_resultados" && "—"}
                    {celda.manual && <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" aria-label={ta.ajustada} />}
                  </span>
                </td>
              )),
                <td key={`prom-${g.etiqueta}`} className={`border-b border-l border-slate-100 border-l-slate-300/70 px-2 py-1.5 text-center ${g.tono.promedio}`}>
                  <Promedio valor={g.promedio} escala={cuaderno.escala} />
                </td>,
              ])}
              <td className="border-b border-l border-slate-100 border-l-slate-200 px-3 py-1.5 text-center">
                <Promedio valor={cuaderno.promedio} escala={cuaderno.escala} />
              </td>
              {final && (
                <td className="border-b border-l border-slate-100 border-l-slate-200 bg-tinta-50/40 px-3 py-1.5 text-center">
                  <Promedio valor={final.nota} escala={cuaderno.escala} />
                </td>
              )}
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={2}>
                {ta.promedioGrupo}
              </td>
              {grupos.map((g) => [
                ...g.columnas.map((c, i) => (
                  <td key={c.id} className={`px-2 py-2.5 text-center ${g.tono.celda} ${i === 0 ? "border-l border-slate-200" : ""}`}>
                    <Promedio valor={c.promedioGrupo} escala={c.escala} />
                  </td>
                )),
                <td key={`prom-${g.etiqueta}`} className={`border-l border-slate-300/70 px-2 py-2.5 text-center ${g.tono.promedio}`}>
                  <Promedio valor={g.promedioGrupo} escala={cuaderno.escala} />
                </td>,
              ])}
              <td className="border-l border-slate-200 px-3 py-2.5 text-center">
                <Promedio valor={cuaderno.promedioGrupo} escala={cuaderno.escala} />
              </td>
              {final && (
                <td className="border-l border-slate-200 bg-tinta-50/60 px-3 py-2.5 text-center">
                  <Promedio valor={final.promedioGrupo} escala={cuaderno.escala} />
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
      {final && final.sinCalificar.length > 0 && (
        <p className="rounded-lg bg-tinta-50 px-3 py-2 text-xs text-tinta-800">
          {formato(tp.parcial, { n: final.ponderacionActual, tipos: final.sinCalificar.map((e) => e || t.profesor.calculo.sinEtiqueta).join(", ") })}
        </p>
      )}
      <p className="text-xs text-slate-500">{formato(ta.ayuda, { n: MINIMO_COMPARACION })}</p>
    </div>
  );
}
