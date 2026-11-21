import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Encabezado, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formatoCal } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { cuadernoAlumno } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.cuaderno.titulo };
}

/** Cuaderno de calificaciones del alumno: solo su fila, con el promedio del grupo como referencia. */
export default async function CuadernoAlumno({ params }: PageProps<"/alumno/cursos/[id]/cuaderno">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t, locale } = await textos();
  const tq = t.alumno.cuaderno;
  const db = await leer();
  const c = cuadernoAlumno(grupo, db.actividades, db.entregas, curso.alumno.matricula, new Date(), t.profesor.calculo.sinEtiqueta);
  const nombreCurso = `${grupo.materia} · ${grupo.nombre}`;
  const hay = c.grupos.some((g) => g.columnas.length > 0);
  const tonoEstado = { calificada: "text-slate-500", no_entregada: "text-error", pendiente: "text-tinta-700", sin_resultados: "text-slate-400" } as const;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: nombreCurso, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tq.titulo}
        subtitulo={formato(tq.subtitulo, { curso: nombreCurso })}
      />
      {!hay ? (
        <Tarjeta className="text-sm text-slate-600">{tq.vacio}</Tarjeta>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tq.promedioFinal}</p>
              <p className={`mt-1 text-3xl font-semibold tabular-nums ${c.promedio === null ? "text-slate-400" : colorCalificacion(c.promedio, c.escala)}`}>
                {c.promedio === null ? "—" : formatoCal(c.promedio, c.escala)}
              </p>
              <p className="text-xs text-slate-500">{formato(tq.sobre, { e: c.escala })}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tq.promedioGrupo}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-700">{c.promedioGrupo === null ? "—" : formatoCal(c.promedioGrupo, c.escala)}</p>
              <p className="text-xs text-slate-500">{formato(tq.sobre, { e: c.escala })}</p>
            </div>
          </div>
          {c.grupos.map((g) => (
            <section key={g.etiqueta}>
              <h2 className="mb-2 text-base font-semibold text-slate-800">{g.etiqueta}</h2>
              <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">{tq.colActividad}</th>
                      <th className="px-4 py-2 font-medium">{tq.colEstado}</th>
                      <th className="px-4 py-2 text-right font-medium">{tq.colCalificacion}</th>
                      <th className="px-4 py-2 text-right font-medium">{tq.colGrupo}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {g.columnas.map((col) => (
                      <tr key={col.id}>
                        <td className="px-4 py-2.5">
                          {col.celda.estado === "calificada" ? (
                            <Link href={`/alumno/reporte/${col.id}`} className="font-medium text-slate-800 hover:text-tinta-700">
                              {col.titulo}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-800">{col.titulo}</span>
                          )}
                          <span className="block text-xs text-slate-500">{fechaLarga(col.fecha, locale)}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-xs ${tonoEstado[col.celda.estado]}`}>
                          {tq.estados[col.celda.estado]}
                          {col.celda.manual && <span className="block text-slate-400">{tq.ajustada}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {col.celda.valor === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className={`font-semibold ${colorCalificacion(col.celda.valor, col.escala)}`}>
                              {formatoCal(col.celda.valor, col.escala)}
                              <span className="text-xs font-normal text-slate-400"> / {col.escala}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{col.promedioGrupo === null ? "—" : formatoCal(col.promedioGrupo, col.escala)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
