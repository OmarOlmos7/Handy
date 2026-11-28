import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonLink, Encabezado, fechaLarga } from "@/components/ui";
import { grupoDe, leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { modeloDelCurso } from "@/lib/perfil/crear";
import { datosPerfilGrupo, filasDiagnostico, resumenGrupo } from "@/lib/perfil/diagnostico-inicial";
import { datosProfesor } from "@/lib/sesion";
import type { AplicacionStroop } from "@/lib/tipos";
import { ETAPAS_CREAR } from "@/lib/perfil/crear";
import { perfilEtapasCurso } from "@/lib/perfil/intentos";
import { EtapasLogro } from "@/components/etapas-logro";
import { MapaHorario } from "@/components/tablero-perfil";
import Link from "next/link";
import type { NivelSolo } from "@/lib/perfil/crear";
import { reflexionesDelCurso, reporteGrupo } from "@/lib/perfil/tablero";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.profesor.titulo };
}

const tarjeta = "mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]";

/**
 * Perfil de aprendizaje del grupo, etapa 1: el Modelo CREAR del curso y el diagnóstico inicial de
 * cada alumno. Solo aparecen los datos de quien dio su consentimiento.
 */
export default async function PerfilGrupo({ params }: PageProps<"/profesor/grupos/[id]/perfil">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const tp = t.perfil.profesor;
  const ts = t.perfil.stroop;
  const asignatura = asignaturaDelCurso(db, grupo);
  const conTemario = asignatura && asignatura.unidades.length > 0 ? asignatura.id : undefined;
  // Las cuentas y el perfil de los alumnos no vienen en los datos del profesor: se toman de la base
  // completa, pero solo de los alumnos de este curso.
  const completa = await leer();
  const filas = filasDiagnostico(datosPerfilGrupo(completa, grupo), grupo, conTemario, new Date());
  // Seguimiento por etapa (etapa 2): solo de quien mantiene su consentimiento.
  const intentos = (completa.intentosPerfil ?? []).filter((x) => x.grupoId === grupo.id);
  const casos = (completa.autoactividades ?? []).filter((a) => a.grupoId === grupo.id && a.casoDe);
  const seguimiento = filas
    .filter((f) => f.alumnoId && f.diagnostico?.consentimiento)
    .map((f) => ({ f, p: perfilEtapasCurso(intentos, f.alumnoId!, grupo.id), casos: casos.filter((c) => c.alumnoId === f.alumnoId).length }));
  const tsg = t.perfil.seguimientoGrupo;
  const tt = t.perfil.tablero;
  const grupoR = reporteGrupo(intentos, seguimiento.map((x) => x.f.alumnoId!), grupo.id);
  const reflexiones = [...reflexionesDelCurso(completa.reflexionesPerfil, grupo.id).values()].sort((a, b) => (a.alcance === b.alcance ? 0 : a.alcance === "cierre" ? 1 : -1));
  // En el orden de la taxonomía SOLO, del nivel más alto al más bajo.
  const nivelesOrden = (Object.keys(t.perfil.crear.solo) as NivelSolo[]).reverse().flatMap((n) => (grupoR.niveles[n] ? [[n, grupoR.niveles[n]] as [NivelSolo, number]] : []));
  const areasOrden = (Object.entries(grupoR.areas) as [keyof typeof t.perfil.crear.etapas, number][]).sort((a, b) => b[1] - a[1]);
  const r = resumenGrupo(filas);
  const modelo = modeloDelCurso(db.modelosCrear, grupo);
  const fecha = (iso: string) => fechaLarga(iso.slice(0, 10), locale);
  const celdaStroop = (a: AplicacionStroop | undefined) =>
    !a ? (
      <span className="text-slate-400">—</span>
    ) : a.omitida ? (
      <span className="text-slate-600">{ts.omitida}</span>
    ) : (
      <span className="text-slate-800">
        {a.resumen?.efectoMs === null || !a.resumen
          ? "—"
          : formato(tp.efecto, { e: a.resumen.efectoMs, x: Math.round((a.resumen.erroresCongruente + a.resumen.erroresIncongruente) / 2) })}
      </span>
    );

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tp.titulo}
        subtitulo={tp.subtitulo}
      />

      <section className={tarjeta}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{tp.modelo}</h2>
            <p className="mt-1 text-sm text-slate-700">{tp.modeloTexto}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t.perfil.crear.disciplinas[modelo.disciplina as keyof typeof t.perfil.crear.disciplinas]} ·{" "}
              {modelo.guardado ? formato(tp.modeloVersion, { v: modelo.version, f: fecha(modelo.actualizadoEn) }) : tp.modeloSinGuardar}
            </p>
          </div>
          <BotonLink href={`/profesor/grupos/${grupo.id}/perfil/modelo`}>{tp.modeloBoton}</BotonLink>
        </div>
      </section>

      <section className={tarjeta}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{t.perfil.etapasActividad.titulo}</h2>
            <p className="mt-1 text-sm text-slate-700">{t.perfil.etapasActividad.subtitulo}</p>
          </div>
          <BotonLink variante="secundario" href={`/profesor/grupos/${grupo.id}/perfil/actividades`}>
            {t.perfil.etapasActividad.revisar}
          </BotonLink>
        </div>
      </section>

      <section className={tarjeta}>
        <h2 className="text-base font-semibold text-slate-900">{tsg.titulo}</h2>
        <p className="mt-1 text-sm text-slate-600">{tsg.subtitulo}</p>
        {seguimiento.every((x) => x.p.intentos === 0) ? (
          <p className="mt-3 text-sm text-slate-500">{tsg.sinDatos}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-medium">{tp.columnas.alumno}</th>
                  {ETAPAS_CREAR.map((e) => (
                    <th key={e} className="py-2 pr-2 text-right font-medium">
                      {t.perfil.crear.etapas[e].nombre}
                    </th>
                  ))}
                  <th className="py-2 pr-2 text-right font-medium">{tsg.actividades}</th>
                  <th className="py-2 pr-2 text-right font-medium">{tsg.intentos}</th>
                  <th className="py-2 text-right font-medium">{t.perfil.seguimiento.caso}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seguimiento.map(({ f, p, casos: nc }) => (
                  <tr key={f.matricula}>
                    <td className="py-2 pr-3 font-medium">
                      {p.intentos > 0 ? (
                        <Link className="text-tinta-700 underline-offset-2 hover:underline" href={`/profesor/grupos/${grupo.id}/perfil/alumnos/${encodeURIComponent(f.matricula)}`}>
                          {f.nombre}
                        </Link>
                      ) : (
                        <span className="text-slate-900">{f.nombre}</span>
                      )}
                    </td>
                    {ETAPAS_CREAR.map((e) => {
                      const v = p.porEtapa[e];
                      return (
                        <td key={e} className={`py-2 pr-2 text-right tabular-nums ${v === undefined ? "text-slate-400" : v >= 70 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}`}>
                          {v === undefined ? "—" : `${v}%`}
                        </td>
                      );
                    })}
                    <td className="py-2 pr-2 text-right tabular-nums">{p.actividades}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{p.intentos}</td>
                    <td className="py-2 text-right tabular-nums">{nc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={tarjeta}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{tt.grupo.titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{tt.grupo.subtitulo}</p>
          </div>
          <BotonLink variante="secundario" href={`/profesor/grupos/${grupo.id}/perfil/reflexiones`}>
            {tt.reflexiones.boton}
          </BotonLink>
        </div>
        {grupoR.alumnos === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{tsg.sinDatos}</p>
        ) : (
          <div className="mt-4 space-y-5">
            <p className="text-sm font-medium text-slate-800">
              {formato(tt.grupo.alumnos, { n: grupoR.alumnos })}
              {grupoR.calificacion !== null && ` · ${tt.resumen.calificacion}: ${grupoR.calificacion}`}
            </p>
            <EtapasLogro porEtapa={grupoR.porEtapa} nombres={t.perfil.crear.etapas} sinDatos={t.perfil.seguimiento.sinDatosEtapa} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">{tt.grupo.niveles}</h3>
                <ul className="space-y-1 text-sm">
                  {nivelesOrden.map(([n, c]) => (
                    <li key={n} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2">
                      <span className="text-slate-700 first-letter:uppercase">{t.perfil.crear.solo[n]}</span>
                      <span className="h-2 rounded-full bg-slate-100">
                        <span className="block h-2 rounded-full bg-tinta-500" style={{ width: `${(c / grupoR.alumnos) * 100}%` }} />
                      </span>
                      <span className="text-right font-semibold tabular-nums">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">{tt.grupo.areasComunes}</h3>
                {areasOrden.length === 0 ? (
                  <p className="text-sm text-slate-600">{tt.grupo.sinAreas}</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {areasOrden.map(([e, c]) => (
                      <li key={e} className="flex justify-between gap-2">
                        <span className="text-slate-700">▲ {t.perfil.crear.etapas[e].nombre}</span>
                        <span className="font-semibold tabular-nums">{formato(tt.grupo.nAlumnos, { n: c })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{tt.grupo.horario}</h3>
              <MapaHorario
                celdas={grupoR.horario.celdas}
                maximo={grupoR.horario.maximo}
                dias={tt.diasCortos}
                franjas={tt.franjas}
                texto={(dia, franja, n) => formato(tt.celda, { dia, franja, n })}
              />
            </div>
          </div>
        )}
        {reflexiones.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{tt.reflexiones.titulo}</h3>
            <ul className="space-y-2 text-sm">
              {reflexiones.map((x) => (
                <li key={`${x.alcance}-${x.unidad ?? ""}`}>
                  <p className="font-medium text-slate-800">{x.alcance === "cierre" ? tt.reflexiones.cierre : x.unidad}</p>
                  <p className="line-clamp-3 whitespace-pre-line text-slate-600">{x.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={tarjeta}>
        <p className="text-sm font-medium text-slate-800">
          {formato(tp.resumen, { c: r.consentimiento, n: r.alumnos, a: r.autodiagnostico, s: r.stroopInicio, f: r.stroopFin })}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">{tp.columnas.alumno}</th>
                <th className="py-2 pr-3 font-medium">{tp.columnas.consentimiento}</th>
                <th className="py-2 pr-3 font-medium">{tp.columnas.autodiagnostico}</th>
                <th className="py-2 pr-3 font-medium">{tp.columnas.stroopInicio}</th>
                <th className="py-2 font-medium">{tp.columnas.stroopFin}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => {
                const dx = f.diagnostico;
                const con = Boolean(dx?.consentimiento);
                return (
                  <tr key={f.matricula}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-900">{f.nombre}</p>
                      <p className="text-xs text-slate-500">{f.matricula}</p>
                    </td>
                    <td className="py-2 pr-3">
                      {!f.alumnoId ? (
                        <span className="text-slate-400">{tp.sinCuenta}</span>
                      ) : con ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">{tp.si}</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{tp.sinConsentimiento}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{con ? (dx!.autodiagnostico === "hecho" ? tp.si : dx!.autodiagnostico === "sin_temario" ? "—" : tp.no) : <span className="text-slate-400">—</span>}</td>
                    <td className="py-2 pr-3">{con ? celdaStroop(dx!.stroop.inicio) : <span className="text-slate-400">—</span>}</td>
                    <td className="py-2">{con ? celdaStroop(dx!.stroop.fin) : <span className="text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">{tp.nota}</p>
      </section>
    </>
  );
}
