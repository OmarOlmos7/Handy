import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CerrarEtapa } from "@/components/cerrar-etapa";
import { EncabezadoProyecto } from "@/components/encabezado-proyecto";
import { BotonLink, Insignia, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { ICONO_ETAPA, avanceEtapa, calificacionEvaluacion } from "@/lib/proyectos";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.proyecto.pestanas.evaluacion };
}

/** Evaluación del proyecto: por etapa, quién entregó, la evaluación propia y el avance de los demás evaluadores. */
export default async function EvaluacionProyecto({ params, searchParams }: PageProps<"/profesor/proyectos/[id]">) {
  const { id } = await params;
  const { etapa: etapaPedida } = await searchParams;
  const profesor = await requerirProfesor();
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso) notFound();
  const { proyecto, grupo, esDueno } = acceso;
  const { t, locale } = await textos();
  const tp = t.proyecto;
  const te = tp.evaluacion;
  const etapa = proyecto.etapas.find((e) => e.id === etapaPedida) ?? proyecto.etapas.find((e) => !e.cerradaEn) ?? proyecto.etapas[0];
  const evaluaciones = (db.evaluacionesProyecto ?? []).filter((e) => e.proyectoId === id);
  const entregas = (db.entregasProyecto ?? []).filter((e) => e.proyectoId === id);
  const filas = etapa ? avanceEtapa(proyecto, etapa, grupo.alumnos, evaluaciones, entregas, profesor.id) : [];
  const enlaceEvaluar = (sujeto: string) => `/profesor/proyectos/${id}/evaluar/${etapa!.id}/${encodeURIComponent(sujeto)}`;

  return (
    <>
      <EncabezadoProyecto t={t} proyecto={proyecto} grupo={grupo} esDueno={esDueno} activa="evaluacion" />
      {/* Etapas: una ficha por etapa con su estado. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {proyecto.etapas.map((e, i) => {
          const activa = e.id === etapa?.id;
          return (
            <Link
              key={e.id}
              href={`/profesor/proyectos/${id}?etapa=${e.id}`}
              aria-current={activa ? "true" : undefined}
              className={`flex min-w-44 shrink-0 items-start gap-2 rounded-xl px-3 py-2 text-left ring-2 transition ${
                activa ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {ICONO_ETAPA[e.tipo]}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-500">
                  {formato(tp.modelo.etapa, { n: i + 1 })} · {e.peso} %
                </span>
                <span className="block truncate text-sm font-semibold text-slate-900">{e.nombre}</span>
                <span className={`mt-0.5 block text-xs ${e.cerradaEn ? "text-acierto" : "text-slate-500"}`}>
                  {e.cerradaEn ? `✓ ${formato(te.cerrada, { f: fechaLarga(e.cerradaEn.slice(0, 10), locale) })}` : te.abierta}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {etapa && (
        <Tarjeta className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.12em] text-tinta-700 uppercase">
                {ICONO_ETAPA[etapa.tipo]} {tp.tipos[etapa.tipo]}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{etapa.nombre}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {[
                  etapa.fecha ? formato(tp.alumno.fecha, { f: fechaLarga(etapa.fecha, locale) }) : undefined,
                  formato(tp.alumno.peso, { p: etapa.peso }),
                  etapa.porEquipo ? tp.modelo.porEquipo : tp.alumno.individual,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {etapa.instrucciones && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{etapa.instrucciones}</p>}
              {etapa.criterios.length === 0 && (
                <p className="mt-2 rounded-lg bg-aviso-suave px-3 py-2 text-sm text-aviso">
                  {tp.errores.sinCriterios}{" "}
                  {esDueno && (
                    <Link href={`/profesor/proyectos/${id}/modelo`} className="font-semibold underline">
                      {tp.pestanas.modelo}
                    </Link>
                  )}
                </p>
              )}
            </div>
            {esDueno && <CerrarEtapa proyectoId={id} etapaId={etapa.id} cerrada={Boolean(etapa.cerradaEn)} />}
          </div>
        </Tarjeta>
      )}

      {etapa && filas.length === 0 && <Tarjeta className="text-sm text-slate-600">{te.sinAlumnos}</Tarjeta>}
      {etapa && filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-2">{te.alumnoEquipo}</th>
                <th className="px-4 py-2">{te.evidencia}</th>
                <th className="px-4 py-2">{te.miEvaluacion}</th>
                <th className="px-4 py-2 text-center">{te.evaluadores}</th>
                {esDueno && <th className="px-4 py-2 text-center">{te.promedio}</th>}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => {
                const mia = f.mia ? calificacionEvaluacion(etapa, f.mia) : null;
                return (
                  <tr key={f.sujeto}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900">{f.esEquipo ? `👥 ${f.nombre}` : f.nombre}</span>
                      {f.esEquipo && (
                        <span className="block text-xs text-slate-500">
                          {formato(te.integrantes, { lista: f.matriculas.map((m) => grupo.alumnos.find((a) => a.matricula === m)?.nombre ?? m).join(", ") })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {!etapa.conEvidencia ? (
                        <Insignia>{te.enVivo}</Insignia>
                      ) : f.entrega ? (
                        <Insignia tono="azul">{formato(f.entrega.archivos.length === 1 ? te.archivos1 : te.archivosN, { n: f.entrega.archivos.length })}</Insignia>
                      ) : (
                        <span className="text-xs text-slate-400">{te.sinEvidencia}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {!f.mia ? (
                        <span className="text-xs text-slate-400">{te.sinEvaluar}</span>
                      ) : f.mia.terminada ? (
                        <Insignia tono="verde">
                          {te.terminada}
                          {mia !== null && ` · ${mia}`}
                        </Insignia>
                      ) : (
                        <Insignia tono="ambar">{te.borrador}</Insignia>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-700">
                      {f.terminadas}/{f.esperadas}
                    </td>
                    {esDueno && (
                      <td className={`px-4 py-2.5 text-center font-semibold ${f.calificacion === null ? "text-slate-400" : colorCalificacion(f.calificacion, 100)}`}>
                        {f.calificacion ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <BotonLink variante={f.mia?.terminada || etapa.cerradaEn ? "secundario" : "primario"} className="px-3 py-1.5" href={enlaceEvaluar(f.sujeto)}>
                        {etapa.cerradaEn ? te.ver : te.evaluar}
                      </BotonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
