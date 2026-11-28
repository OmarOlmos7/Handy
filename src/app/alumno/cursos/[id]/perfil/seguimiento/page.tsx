import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BotonCaso } from "@/components/boton-caso";
import { EtapasLogro } from "@/components/etapas-logro";
import { BotonLink, Encabezado, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { costoGenerar } from "@/lib/autoestudio";
import { perfilActivo } from "@/lib/banderas";
import { formatoCal, escalaDe } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { licenciasObligatorias } from "@/lib/licencias";
import { conPuntaje } from "@/lib/modalidad";
import { saldoAlumno } from "@/lib/perfil/bolsa";
import { tieneConsentimiento } from "@/lib/perfil/consentimiento";
import type { NivelSolo } from "@/lib/perfil/crear";
import { etapasPorReforzar } from "@/lib/perfil/etapas";
import { MAX_CASOS, intentosDe, perfilEtapasCurso, seguimientoActividad } from "@/lib/perfil/intentos";
import { actividadesVisibles, resultadoVisible } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";
import { textoTiempo } from "@/lib/tiempo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.seguimiento.titulo };
}

const tarjeta = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]";

/**
 * Seguimiento en actividades (perfil CREAR, etapa 2): logro por etapa de cada actividad calificada,
 * historial de intentos y casos equivalentes cuando no llegó al 70.
 */
export default async function SeguimientoAlumno({ params }: PageProps<"/alumno/cursos/[id]/perfil/seguimiento">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const tp = t.perfil;
  const tg = tp.seguimiento;
  const db = await leer();
  const base = `/alumno/cursos/${grupo.id}`;
  const consentimiento = tieneConsentimiento(db.consentimientosPerfil, alumno.id);
  const ahora = new Date();
  const saldo = saldoAlumno(db, alumno.id, licenciasObligatorias(), ahora);
  const calificadas = actividadesVisibles(db.actividades, grupo.id, ahora)
    .filter(conPuntaje)
    .map((a) => ({ a, e: db.entregas.find((x) => x.actividadId === a.id && x.matricula === enCurso.matricula) }))
    .filter(({ a, e }) => resultadoVisible(a, e, ahora))
    .sort((x, y) => y.a.fechaAplicacion.localeCompare(x.a.fechaAplicacion));
  const general = perfilEtapasCurso(db.intentosPerfil, alumno.id, grupo.id);
  const nombreSolo = (n: string) => tp.crear.solo[n as NivelSolo] ?? n;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: base },
          { texto: tp.titulo, href: `${base}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tg.titulo}
        subtitulo={tg.subtitulo}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {!consentimiento ? (
          <section className={tarjeta}>
            <p className="text-sm text-slate-700">{tg.errores.sinConsentimiento}</p>
            <BotonLink className="mt-3" href={`${base}/perfil`}>
              {tp.titulo}
            </BotonLink>
          </section>
        ) : (
          <>
            <section className={`${tarjeta} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{tp.bolsa.titulo}</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{saldo.total}</p>
                <p className="text-xs text-slate-500">
                  {tp.bolsa.bolsa}: {saldo.bolsa} · {tp.bolsa.extra}: {saldo.extra}
                </p>
              </div>
              <BotonLink variante="secundario" href="/alumno/creditos">
                {tp.bolsa.comprar}
              </BotonLink>
            </section>

            {general.actividades > 0 && (
              <section className={tarjeta}>
                <h2 className="mb-3 text-base font-semibold text-slate-900">{tp.seguimientoGrupo.titulo}</h2>
                <EtapasLogro porEtapa={general.porEtapa} nombres={tp.crear.etapas} sinDatos={tg.sinDatosEtapa} />
              </section>
            )}

            {calificadas.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">{tg.vacio}</p>}

            {calificadas.map(({ a, e }) => {
              const seg = seguimientoActividad(a, e, db.autoactividades, alumno.id);
              const intentos = intentosDe(db.intentosPerfil, alumno.id, a.id);
              const ultimo = intentos.at(-1);
              const reforzar = ultimo ? etapasPorReforzar(ultimo.porEtapa) : [];
              const escala = escalaDe(a);
              const tipoCaso = a.reactivos.some((r) => r.tipo === "desarrollo") && a.formato !== "plataforma" ? "manuscrita" : "practica";
              return (
                <section key={a.id} className={tarjeta}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{a.titulo}</h2>
                      <p className="text-xs text-slate-500">
                        {fechaLarga(a.fechaAplicacion, locale)} · {formato(tg.intentos, { n: Math.max(1, intentos.length) })}
                        {seg.casos.length > 0 && ` · ${formato(tg.casosUsados, { n: seg.casos.length, max: MAX_CASOS })}`}
                      </p>
                    </div>
                    {seg.calificacion !== null && (
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${seg.calificacion >= 70 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                        {formato(tg.calificacion, { c: formatoCal((seg.calificacion * escala) / 100, escala) })}
                      </span>
                    )}
                  </div>
                  {ultimo ? (
                    <div className="space-y-2">
                      <EtapasLogro porEtapa={ultimo.porEtapa} nombres={tp.crear.etapas} sinDatos={tg.sinDatosEtapa} compacto />
                      <p className="text-sm text-slate-700">
                        {formato(tg.nivel, { nivel: nombreSolo(ultimo.nivel) })}
                        {reforzar.length > 0 && ` · ${formato(tg.reforzar, { etapas: reforzar.map((x) => tp.crear.etapas[x].nombre).join(", ") })}`}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {seg.estado === "aprobada" && <p className="text-sm font-medium text-emerald-800">{tg.aprobada}</p>}
                    {(seg.estado === "disponible" || seg.estado === "pendiente") && (
                      <div className="flex flex-wrap items-center gap-3">
                        <BotonCaso
                          actividadId={a.id}
                          texto={seg.estado === "pendiente" ? tg.continuarCaso : tg.pedirCaso}
                          generando={tg.generando}
                          errorGeneral={tg.errores.general}
                        />
                        {seg.estado === "disponible" && <p className="text-xs text-slate-500">{formato(tg.costo, { n: costoGenerar(tipoCaso) })}</p>}
                      </div>
                    )}
                    {seg.estado === "limite" && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                        <p className="text-sm text-amber-900">
                          {formato(tg.limite, { max: MAX_CASOS })} {tg.asesoria}
                        </p>
                        <BotonLink href={`${base}/asesorias`}>{tg.agendar}</BotonLink>
                      </div>
                    )}
                  </div>

                  {intentos.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-tinta-700">{tg.historial}</summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-xs text-slate-500">
                            <tr>
                              <th className="py-1 pr-3 font-medium">{tg.columnas.numero}</th>
                              <th className="py-1 pr-3 font-medium">{tg.columnas.origen}</th>
                              <th className="py-1 pr-3 font-medium">{tg.columnas.fecha}</th>
                              <th className="py-1 pr-3 text-right font-medium">{tg.columnas.calificacion}</th>
                              <th className="py-1 pr-3 font-medium">{tg.columnas.nivel}</th>
                              <th className="py-1 text-right font-medium">{tg.columnas.tiempo}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {intentos.map((x) => (
                              <tr key={`${x.origen}-${x.clave}`}>
                                <td className="py-1.5 pr-3 tabular-nums">{x.numero}</td>
                                <td className="py-1.5 pr-3">{tg.origen[x.origen]}</td>
                                <td className="py-1.5 pr-3 whitespace-nowrap">
                                  {fechaLarga(x.fecha.slice(0, 10), locale)} · {formato(tg.cuando, { dia: tg.dias[x.dia], hora: x.hora })}
                                </td>
                                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{x.calificacion}</td>
                                <td className="py-1.5 pr-3">{nombreSolo(x.nivel)}</td>
                                <td className="py-1.5 text-right tabular-nums">{x.segundos ? textoTiempo(x.segundos) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
