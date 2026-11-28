import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/ui";
import { costoGenerar, duracion, LIMITE_DIARIO, resumenAutoestudio } from "@/lib/autoestudio";
import { grupoDe } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";
import { colorCalificacion } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.autoestudio.profesor.titulo };
}

/** Vista del cuaderno con las actividades autoasignadas de cada alumno del curso. */
export default async function AutoestudioGrupo({ params }: PageProps<"/profesor/grupos/[id]/autoestudio">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.autoestudio.profesor;
  const lista = (db.autoactividades ?? []).filter((a) => a.grupoId === grupo.id);
  const filas = grupo.alumnos
    .map((al) => ({ al, r: resumenAutoestudio(lista, grupo.id, al.matricula) }))
    .sort((a, b) => b.r.total - a.r.total || a.al.nombre.localeCompare(b.al.nombre, "es"));
  const f = (n: number) => n.toLocaleString(locale);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.profesor.cuaderno.titulo, href: `/profesor/grupos/${grupo.id}/cuaderno` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`✨ ${ta.titulo}`}
        subtitulo={ta.subtitulo}
      />
      <p className="mb-2 text-sm text-slate-600">{formato(ta.costo, { g: f(costoGenerar("practica")), l: f(costoGenerar("lectura")), n: LIMITE_DIARIO })}</p>
      <p className="mb-4 text-sm text-violet-900">
        {ta.porcentaje}: <strong>{grupo.pesoAutoestudio ?? 0} %</strong> · {ta.pesoAyuda}
      </p>
      {lista.length === 0 && <p className="mb-4 rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{ta.vacioGrupo}</p>}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">{ta.alumno}</th>
              <th className="px-3 py-2 text-center">{ta.actividades}</th>
              <th className="px-3 py-2 text-center">{ta.terminadas}</th>
              <th className="px-3 py-2 text-center">{ta.promedio}</th>
              <th className="px-3 py-2 text-center">{ta.tiempo}</th>
              <th className="px-3 py-2">{ta.ultima}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ al, r }) => (
              <tr key={al.matricula} className="hover:bg-slate-50/70">
                <td className="px-4 py-2 font-medium text-slate-800">
                  {al.nombre}
                  <span className="block font-mono text-xs font-normal text-slate-500">{al.matricula}</span>
                </td>
                <td className="px-3 py-2 text-center tabular-nums">{r.total}</td>
                <td className="px-3 py-2 text-center tabular-nums">{r.completadas}</td>
                <td className="px-3 py-2 text-center">
                  {r.promedio === null ? <span className="text-slate-400">—</span> : <span className={`font-semibold tabular-nums ${colorCalificacion(r.promedio, 100)}`}>{r.promedio}</span>}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-700">{r.segundos ? duracion(r.segundos) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {r.ultima ? new Date(r.ultima).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "America/Mexico_City" }) : "—"}
                  {r.alertas > 0 && (
                    <span title={ta.alertaAyuda} className="ml-2 rounded-md bg-error-suave px-1.5 py-0.5 text-xs font-semibold text-error">
                      ⚠ {ta.alerta}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/profesor/grupos/${grupo.id}/autoestudio/${encodeURIComponent(al.matricula)}`} className="text-sm font-medium text-violet-800 hover:underline">
                    {formato(ta.ver, { n: r.total })} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
