import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncabezadoProyecto } from "@/components/encabezado-proyecto";
import { Tarjeta, colorCalificacion } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { textos } from "@/lib/i18n/servidor";
import { ICONO_ETAPA, resumenAlumno } from "@/lib/proyectos";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.proyecto.concentrado.titulo };
}

/** Concentrado de calificaciones del proyecto: por alumno y etapa, con la acumulada y la final. */
export default async function CalificacionesProyecto({ params }: PageProps<"/profesor/proyectos/[id]/calificaciones">) {
  const { id } = await params;
  const profesor = await requerirProfesor();
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso?.esDueno) notFound();
  const { proyecto, grupo } = acceso;
  const { t } = await textos();
  const tc = t.proyecto.concentrado;
  const evaluaciones = (db.evaluacionesProyecto ?? []).filter((e) => e.proyectoId === id);
  const alumnos = grupo.alumnos.filter((a, i) => grupo.alumnos.findIndex((x) => x.matricula === a.matricula) === i);
  const filas = alumnos.map((a) => ({ alumno: a, r: resumenAlumno(proyecto, evaluaciones, [], a.matricula, { enCurso: true }) }));
  const celda = (v: number | null) => (v === null ? <span className="text-slate-300">—</span> : <span className={colorCalificacion(v, 100)}>{v}</span>);

  return (
    <>
      <EncabezadoProyecto t={t} proyecto={proyecto} grupo={grupo} esDueno activa="concentrado" />
      <p className="mb-3 text-sm text-slate-600">{tc.ayuda}</p>
      {filas.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{t.proyecto.evaluacion.sinAlumnos}</Tarjeta>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-4 py-2 text-left">{tc.alumno}</th>
                {proyecto.etapas.map((e, i) => (
                  <th key={e.id} className="px-3 py-2 text-center">
                    <span aria-hidden>{ICONO_ETAPA[e.tipo]}</span> {i + 1}. {e.nombre}
                    <span className="block font-normal text-slate-400">
                      {e.peso} %{e.cerradaEn ? " · ✓" : ""}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center">{tc.acumulada}</th>
                <th className="px-3 py-2 text-center">{tc.final}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(({ alumno, r }) => (
                <tr key={alumno.matricula}>
                  <td className="sticky left-0 bg-white px-4 py-2 font-medium text-slate-900">{alumno.nombre}</td>
                  {r.etapas.map((e) => (
                    <td key={e.etapa.id} className="px-3 py-2 text-center font-semibold">
                      {celda(e.resultado?.calificacion ?? (e.etapa.cerradaEn ? 0 : null))}
                      {e.resultado && e.resultado.esperadas > 1 && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {e.resultado.terminadas}/{e.resultado.esperadas}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-slate-800">{r.cerradas ? r.acumulada : "—"}</td>
                  <td className="px-3 py-2 text-center font-semibold">{celda(r.final ?? r.promedioALaFecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
