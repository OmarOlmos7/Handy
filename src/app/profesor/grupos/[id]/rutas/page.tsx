import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CirculoEstado, HistogramaRutas, SimbologiaRutas } from "@/components/histograma-rutas";
import { Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { asignaturaDelCurso, minimoCertificacion } from "@/lib/asignaturas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { colorRuta, distribucionPorUnidad } from "@/lib/ruta-aprendizaje";
import { rutaDelAlumno } from "@/lib/ruta-curso";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.ruta.profesor.titulo };
}

/**
 * Rutas de aprendizaje del grupo para el profesor: la valoración inicial de cada alumno y en qué
 * unidades ya certificó con los exámenes de certificación que marcó el profesor.
 */
export default async function RutasGrupo({ params }: PageProps<"/profesor/grupos/[id]/rutas">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t } = await textos();
  const tr = t.ruta;
  const tp = tr.profesor;
  const tc = t.profesor.comun;
  const asignatura = asignaturaDelCurso(db, grupo);
  const migas = [
    { texto: tc.panel, href: "/profesor" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
  ];
  if (!asignatura || asignatura.unidades.length === 0) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={tc.ruta} titulo={tp.titulo} />
        <Tarjeta className="text-sm text-slate-600">{t.profesor.avance.sinAsignatura}</Tarjeta>
      </>
    );
  }
  // El profesor ve todas las calificaciones aprobadas, aunque aún no se liberen a los alumnos.
  const ahora = new Date("9999-12-31T00:00:00Z");
  const filas = grupo.alumnos.map((al) => ({ alumno: al, ...rutaDelAlumno(db, grupo.id, asignatura, { matricula: al.matricula }, ahora) }));
  const distribucion = distribucionPorUnidad(filas.map((f) => f.ruta), asignatura.unidades);
  const examenes = db.actividades.filter((a) => a.grupoId === grupo.id && a.temario?.asignaturaId === asignatura.id && a.temario.certificacion);

  return (
    <>
      <Encabezado migas={migas} rutaEtiqueta={tc.ruta} titulo={`${tp.titulo} · ${asignatura.nombre}`} subtitulo={tp.subtitulo} />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
        <HistogramaRutas datos={distribucion} t={t} totalAlumnos={filas.length} />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
        <h2 className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{tp.examenes}</h2>
        {examenes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{tp.sinExamenes}</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {asignatura.unidades.map((u, i) => {
              const deUnidad = examenes.filter((a) => a.temario!.unidad === u.nombre);
              return (
                <li key={u.nombre} className="flex items-start gap-2 text-sm">
                  <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: colorRuta(i) }} />
                  <span>
                    <strong className="text-slate-800">{formato(tr.unidad, { n: i + 1 })}:</strong>{" "}
                    {deUnidad.length ? (
                      deUnidad.map((a) => `${a.titulo} (≥ ${minimoCertificacion(a.temario!.certificacion!.minimo)} %)`).join(" · ")
                    ) : (
                      <span className="text-slate-400">{tp.sinExamen}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-800">{tp.histograma.tabla}</h2>
        <SimbologiaRutas t={t} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="sticky left-0 bg-white px-4 py-3 font-semibold">{tp.alumno}</th>
              {asignatura.unidades.map((u, i) => {
                const n = filas.filter((f) => f.ruta.unidades[i]?.estado === "certificada").length;
                return (
                  <th key={u.nombre} className="px-3 py-3 text-center align-bottom font-semibold" title={u.nombre}>
                    <span className="block" style={{ color: colorRuta(i) }}>
                      {formato(tr.unidad, { n: i + 1 })}
                    </span>
                    <span className="block font-normal text-slate-400">{formato(tp.certificados, { n })}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ alumno, ruta, valoracion }) => (
              <tr key={alumno.matricula}>
                <td className="sticky left-0 bg-white px-4 py-2">
                  <span className="block font-medium text-slate-800">{alumno.nombre}</span>
                  <span className="block text-xs text-slate-400">{valoracion ? `${tp.valoracion} ✓` : tp.sinValoracion}</span>
                </td>
                {ruta.unidades.map((u, i) => (
                  <td key={u.nombre} className="px-3 py-2 text-center">
                    <span className="flex justify-center">
                      <CirculoEstado estado={u.estado} color={colorRuta(i)} etiqueta={`${u.nombre}: ${tr.estados[u.estado]}`} />
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{u.nivel ? tr.valoracion.niveles[u.nivel] : "—"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
