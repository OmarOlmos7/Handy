import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncabezadoProyecto } from "@/components/encabezado-proyecto";
import { ConFlujoProyecto } from "@/components/flujo-proyecto";
import { EvaluarProyecto } from "@/components/evaluar-proyecto";
import { Tarjeta, colorCalificacion } from "@/components/ui";
import { VisorArchivos, type ArchivoVisor } from "@/components/visor-archivos";
import { leer } from "@/lib/almacen";
import { creditosPorPagina, precisionPara, sumarCreditos } from "@/lib/configuracion";
import { claseDeArchivo, laIALee } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { ICONO_ETAPA, calificacionEvaluacion, evaluadoresDe, sujetosDeEtapa } from "@/lib/proyectos";
import { accesoProyecto, evaluadoresConNombre } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.proyecto.formulario.titulo };
}

/** Evaluación de un profesor para un alumno o equipo en una etapa, con la evidencia a la vista. */
export default async function EvaluarEtapa({ params }: PageProps<"/profesor/proyectos/[id]/evaluar/[etapa]/[sujeto]">) {
  const { id, etapa: etapaId, sujeto: crudo } = await params;
  const sujeto = decodeURIComponent(crudo);
  const profesor = await requerirProfesor();
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso) notFound();
  const { proyecto, grupo, esDueno } = acceso;
  const etapa = proyecto.etapas.find((e) => e.id === etapaId);
  const quien = etapa && sujetosDeEtapa(proyecto, etapa, grupo.alumnos).find((s) => s.sujeto === sujeto);
  if (!etapa || !quien) notFound();
  const { t } = await textos();
  const tp = t.proyecto;
  const tf = tp.formulario;
  const evaluaciones = (db.evaluacionesProyecto ?? []).filter((e) => e.proyectoId === id && e.etapaId === etapa.id && e.sujeto === sujeto);
  const mia = evaluaciones.find((e) => e.evaluadorId === profesor.id);
  const entrega = (db.entregasProyecto ?? []).find((e) => e.proyectoId === id && e.etapaId === etapa.id && e.sujeto === sujeto);
  const visor = (rutas: string[], nombres: string[]): ArchivoVisor[] =>
    rutas.flatMap((ruta, i) => {
      const clase = claseDeArchivo(ruta);
      return clase ? [{ ruta, nombre: nombres[i] ?? ruta.split("/").at(-1)!, clase }] : [];
    });
  const archivos = visor(entrega?.archivos ?? [], entrega?.nombres ?? []);
  const ta = t.altaProyecto.evaluar;
  const sugerible = archivos.some((a) => laIALee(a.clase));
  const costo = sumarCreditos(Math.max(1, entrega?.paginasIA ?? archivos.length) * creditosPorPagina(precisionPara(undefined, profesor.config)));
  const volver = `/profesor/proyectos/${id}?etapa=${etapa.id}`;
  // El profesor del curso ve las evaluaciones terminadas de los demás; los invitados solo la suya.
  const nombres = evaluadoresConNombre(db, proyecto);
  const orden = evaluadoresDe(proyecto);
  const otras = esDueno ? evaluaciones.filter((e) => e.evaluadorId !== profesor.id && e.terminada && orden.includes(e.evaluadorId)) : [];
  const nombreAlumno = (m: string) => grupo.alumnos.find((a) => a.matricula === m)?.nombre ?? m;

  return (
    <>
      <EncabezadoProyecto t={t} proyecto={proyecto} grupo={grupo} esDueno={esDueno} activa="evaluacion" />
      <ConFlujoProyecto vista="evaluacion" proyecto={proyecto} t={t} sinRuta={!esDueno}>
      <div className="mb-4">
        <p className="text-xs font-bold tracking-[0.12em] text-tinta-700 uppercase">
          {ICONO_ETAPA[etapa.tipo]} {tp.tipos[etapa.tipo]}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{formato(tf.de, { etapa: etapa.nombre, sujeto: quien.esEquipo ? `👥 ${quien.nombre}` : quien.nombre })}</h2>
        {quien.esEquipo && <p className="text-sm text-slate-600">{formato(tp.evaluacion.integrantes, { lista: quien.matriculas.map(nombreAlumno).join(", ") })}</p>}
      </div>
      {/* Con la ruta del proyecto a la izquierda, la rúbrica gráfica necesita todo el ancho: la evidencia va arriba salvo en pantallas muy anchas. */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-5 ${esDueno ? "2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] 2xl:items-start" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start"}`}
      >
        <div className={`space-y-4 ${esDueno ? "2xl:sticky 2xl:top-4" : "lg:sticky lg:top-4"}`}>
          {etapa.instrucciones && (
            <Tarjeta>
              <h3 className="text-sm font-semibold text-slate-900">{tf.instrucciones}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{etapa.instrucciones}</p>
            </Tarjeta>
          )}
          {etapa.conEvidencia && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{tf.evidencia}</h3>
              {(etapa.entregables ?? []).length > 0 ? (
                <ul className="space-y-3">
                  {etapa.entregables!.map((d) => {
                    const ev = entrega?.porEntregable?.find((x) => x.entregableId === d.id);
                    const suyos = visor(ev?.archivos ?? [], ev?.nombres ?? []);
                    return (
                      <li key={d.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-900">📎 {d.nombre}</p>
                        {d.descripcion && <p className="text-xs text-slate-500">{d.descripcion}</p>}
                        <p className="mt-2 text-xs font-semibold text-slate-600">{ta.comentarioAlumno}</p>
                        <p className="text-sm whitespace-pre-line text-slate-700">{ev?.comentario || <span className="text-slate-400">{ta.sinComentario}</span>}</p>
                        <div className="mt-2">{suyos.length ? <VisorArchivos archivos={suyos} /> : <p className="text-sm text-slate-500">{tf.sinEvidencia}</p>}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  {entrega?.comentario && (
                    <Tarjeta className="mb-2">
                      <p className="text-xs font-semibold text-slate-600">{ta.comentarioAlumno}</p>
                      <p className="text-sm whitespace-pre-line text-slate-700">{entrega.comentario}</p>
                    </Tarjeta>
                  )}
                  {archivos.length ? <VisorArchivos archivos={archivos} /> : <Tarjeta className="text-sm text-slate-500">{tf.sinEvidencia}</Tarjeta>}
                </>
              )}
            </section>
          )}
          {esDueno && orden.length > 1 && (
            <Tarjeta>
              <h3 className="text-sm font-semibold text-slate-900">{tf.otros}</h3>
              <p className="text-xs text-slate-500">{tf.otrosNota}</p>
              {otras.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{tf.sinOtros}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {otras.map((e) => {
                    const cal = calificacionEvaluacion(etapa, e);
                    return (
                      <li key={e.evaluadorId} className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-slate-900">{nombres.find((n) => n.id === e.evaluadorId)?.nombre}</span>
                          <span className={`font-semibold ${cal === null ? "text-slate-400" : colorCalificacion(cal, 100)}`}>{cal ?? "—"}</span>
                        </div>
                        <ul className="mt-1 text-xs text-slate-600">
                          {etapa.criterios.map((c) => (
                            <li key={c.id}>
                              {c.nombre}: <strong>{e.criterios.find((x) => x.criterioId === c.id)?.puntaje ?? "—"}</strong>
                            </li>
                          ))}
                        </ul>
                        {e.comentario && <p className="mt-1 text-xs text-slate-700 italic">“{e.comentario}”</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          )}
        </div>
        <div>
          {etapa.criterios.length === 0 ? (
            <Tarjeta className="text-sm text-aviso">{tp.errores.sinCriterios}</Tarjeta>
          ) : (
            <EvaluarProyecto
              proyectoId={id}
              etapa={etapa}
              sujeto={sujeto}
              previa={mia}
              cerrada={Boolean(etapa.cerradaEn)}
              sugerible={sugerible}
              costoSugerencia={costo}
              volver={volver}
            />
          )}
        </div>
      </div>
      </ConFlujoProyecto>
    </>
  );
}
