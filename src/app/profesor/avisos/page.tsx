import type { Metadata } from "next";
import Link from "next/link";
import { ListaAvisos, SobreAvisos } from "@/components/avisos";
import { Encabezado, Tarjeta } from "@/components/ui";
import { avisosDelGrupo, resumenAvisos } from "@/lib/avisos";
import { vistaProfesor } from "@/lib/avisos-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { fechaHoraLarga } from "@/lib/resultados";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.avisos.meta };
}

/** Pestaña de avisos del profesor: estadísticas de lectura por curso y todos sus avisos. */
export default async function AvisosProfesor() {
  const { db, profesor } = await datosProfesor();
  const { t, locale } = await textos();
  const ta = t.avisos;
  const tp = ta.panel;
  const grupos = db.grupos.filter((g) => !g.archivado);
  const { cursos, total } = resumenAvisos(db.avisos ?? [], grupos);
  const avisos = grupos
    .flatMap((grupo) => {
      const todos = avisosDelGrupo(db.avisos ?? [], grupo.id);
      return todos.map((a) => ({
        orden: a.enviadoEn,
        vista: { ...vistaProfesor(a, { grupo, todos, nombreProfesor: profesor.nombre, locale, conCurso: true }), cursoHref: `/profesor/grupos/${grupo.id}/avisos` },
      }));
    })
    .sort((a, b) => b.orden.localeCompare(a.orden))
    .map((x) => x.vista);

  const cifra = (titulo: string, valor: string, nota?: string, alerta = false) => (
    <Tarjeta>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-semibold ${alerta ? "text-error" : ""}`}>{valor}</p>
      {nota && <p className="text-xs text-slate-500">{nota}</p>}
    </Tarjeta>
  );

  return (
    <>
      <Encabezado titulo={ta.titulo} subtitulo={tp.subtitulo} />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cifra(tp.enviados, total.enviados.toLocaleString(locale))}
        {cifra(tp.lectura, `${total.porcentaje} %`, formato(tp.lecturaTexto, { l: total.lecturas, n: total.entregas }))}
        {cifra(tp.recibidos, total.recibidos.toLocaleString(locale))}
        {cifra(tp.sinLeer, total.recibidosSinLeer.toLocaleString(locale), undefined, total.recibidosSinLeer > 0)}
      </div>

      <h2 className="mb-3 text-lg font-semibold">{tp.porCurso}</h2>
      {cursos.length === 0 ? (
        <Tarjeta className="mb-8 text-sm text-slate-600">{tp.sinCursos}</Tarjeta>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">{tp.curso}</th>
                <th className="px-4 py-2.5 text-right font-medium">{tp.enviados}</th>
                <th className="px-4 py-2.5 font-medium">{tp.lectura}</th>
                <th className="px-4 py-2.5 text-right font-medium">{tp.recibidos}</th>
                <th className="px-4 py-2.5 text-right font-medium">{tp.sinLeer}</th>
                <th className="px-4 py-2.5 font-medium">{tp.ultimo}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cursos.map((c) => (
                <tr key={c.grupo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="block text-xs font-semibold tracking-wide text-tinta-600 uppercase">{c.grupo.materia}</span>
                    <span className="font-medium text-slate-900">{c.grupo.nombre}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.enviados}</td>
                  <td className="px-4 py-2.5">
                    {c.entregas ? (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                          <span className="block h-full rounded-full bg-acierto" style={{ width: `${c.porcentaje}%` }} />
                        </span>
                        <span className="tabular-nums">{c.porcentaje} %</span>
                        <span className="text-xs text-slate-400">
                          {c.lecturas}/{c.entregas}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.recibidos}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${c.recibidosSinLeer ? "font-semibold text-error" : ""}`}>{c.recibidosSinLeer}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{c.ultimo ? fechaHoraLarga(c.ultimo, locale) : tp.sinAvisos}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <SobreAvisos href={`/profesor/grupos/${c.grupo.id}/avisos`} sinLeer={c.recibidosSinLeer} />
                      <Link href={`/profesor/grupos/${c.grupo.id}/avisos`} className="text-sm font-medium text-tinta-700 hover:underline">
                        {tp.abrir}
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">{ta.titulo}</h2>
      <ListaAvisos avisos={avisos} vacio={tp.ningunoEnviado} />
    </>
  );
}
