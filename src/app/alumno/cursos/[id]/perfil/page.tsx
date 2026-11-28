import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConsentimientoPerfil } from "@/components/consentimiento-perfil";
import { BotonLink, Encabezado, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { perfilActivo } from "@/lib/banderas";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { consentimientoVigente } from "@/lib/perfil/consentimiento";
import { diagnosticoInicial, finesDeCursos } from "@/lib/perfil/diagnostico-inicial";
import { alumnoActual } from "@/lib/sesion";
import type { AplicacionStroop } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.titulo };
}

const tarjeta = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]";

function Paso({ n, titulo, hecho, etiqueta, children }: { n: number; titulo: string; hecho: boolean; etiqueta: string; children: React.ReactNode }) {
  return (
    <section className={tarjeta}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-bold ${hecho ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{hecho ? "✓" : n}</span>
        <h2 className="flex-1 text-base font-semibold text-slate-900">{titulo}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${hecho ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{etiqueta}</span>
      </div>
      {children}
    </section>
  );
}

/**
 * Perfil de aprendizaje del alumno en el curso. Etapa 1 (diagnóstico inicial): consentimiento,
 * autodiagnóstico de las unidades y prueba de Stroop del semestre.
 */
export default async function PerfilCurso({ params }: PageProps<"/alumno/cursos/[id]/perfil">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t, locale } = await textos();
  const tp = t.perfil;
  const ts = tp.stroop;
  const db = await leer();
  const asignatura = asignaturaDelCurso(db, grupo);
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const fines = cuenta ? finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))) : [];
  const conTemario = asignatura && asignatura.unidades.length > 0 ? asignatura.id : undefined;
  const ahora = new Date();
  const dx = diagnosticoInicial(db, alumno.id, grupo.id, conTemario, ahora, fines);
  const consentimiento = consentimientoVigente(db.consentimientosPerfil, alumno.id);
  const fecha = (iso: string) => fechaLarga(iso.slice(0, 10), locale);
  const base = `/alumno/cursos/${grupo.id}`;

  const resultado = (a: AplicacionStroop) => (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{ts.momento[a.momento]}</p>
      {a.omitida ? (
        <p className="mt-1 text-sm text-slate-700">{ts.omitida}</p>
      ) : (
        a.resumen && (
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-600">{ts.resultados.congruente}</dt>
            <dd className="text-right font-medium text-slate-900">{a.resumen.msCongruente === null ? "—" : formato(ts.ms, { n: a.resumen.msCongruente })}</dd>
            <dt className="text-slate-600">{ts.resultados.incongruente}</dt>
            <dd className="text-right font-medium text-slate-900">{a.resumen.msIncongruente === null ? "—" : formato(ts.ms, { n: a.resumen.msIncongruente })}</dd>
            <dt className="text-slate-600">{ts.resultados.efecto}</dt>
            <dd className="text-right font-semibold text-tinta-800">{a.resumen.efectoMs === null ? "—" : formato(ts.ms, { n: a.resumen.efectoMs })}</dd>
            <dt className="text-slate-600">{ts.resultados.errores}</dt>
            <dd className="text-right font-medium text-slate-900">{Math.round((a.resumen.erroresCongruente + a.resumen.erroresIncongruente) / 2)} %</dd>
          </dl>
        )
      )}
      <p className="mt-2 text-xs text-slate-500">{formato(ts.hecha, { f: fecha(a.fecha) })}</p>
    </div>
  );

  const stroopHecho = Boolean(dx.stroop.inicio) && dx.stroopPendiente === null;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: base },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tp.titulo}
        subtitulo={tp.subtitulo}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {dx.completo && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">{tp.completo}</p>}

        <Paso n={1} titulo={tp.pasos.consentimiento} hecho={dx.consentimiento} etiqueta={dx.consentimiento ? tp.estado.hecho : tp.estado.pendiente}>
          <ConsentimientoPerfil dado={consentimiento ? fecha(consentimiento.fecha) : undefined} />
        </Paso>

        <Paso
          n={2}
          titulo={tp.pasos.autodiagnostico}
          hecho={dx.autodiagnostico === "hecho"}
          etiqueta={dx.autodiagnostico === "hecho" ? tp.estado.hecho : dx.autodiagnostico === "sin_temario" ? "—" : tp.estado.pendiente}
        >
          {!dx.consentimiento ? (
            <p className="text-sm text-slate-500">{tp.estado.bloqueado}</p>
          ) : dx.autodiagnostico === "sin_temario" ? (
            <p className="text-sm text-slate-600">{tp.estado.sinTemario}</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">{tp.autodiagnostico.texto}</p>
              <BotonLink variante={dx.autodiagnostico === "hecho" ? "secundario" : "primario"} href={`${base}/valoracion`}>
                {dx.autodiagnostico === "hecho" ? tp.autodiagnostico.revisar : tp.autodiagnostico.boton}
              </BotonLink>
            </div>
          )}
        </Paso>

        <Paso n={3} titulo={tp.pasos.stroop} hecho={stroopHecho} etiqueta={stroopHecho ? tp.estado.hecho : tp.estado.pendiente}>
          {!dx.consentimiento ? (
            <p className="text-sm text-slate-500">{tp.estado.bloqueado}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">{ts.unaVez}</p>
              {(dx.stroop.inicio || dx.stroop.fin) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {dx.stroop.inicio && resultado(dx.stroop.inicio)}
                  {dx.stroop.fin && resultado(dx.stroop.fin)}
                </div>
              )}
              {dx.stroopPendiente ? (
                <BotonLink href={`${base}/perfil/stroop`}>
                  {ts.presentar} · {ts.momento[dx.stroopPendiente]}
                </BotonLink>
              ) : (
                !dx.stroop.fin && <p className="text-sm text-slate-500">{tp.estado.proximo}</p>
              )}
              <p className="text-xs text-slate-500">{ts.nota}</p>
            </div>
          )}
        </Paso>

        <section className={`${tarjeta} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">{tp.seguimiento.titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{tp.seguimiento.subtitulo}</p>
          </div>
          <BotonLink variante={dx.consentimiento ? "primario" : "secundario"} href={`${base}/perfil/seguimiento`}>
            {tp.seguimiento.titulo}
          </BotonLink>
        </section>
      </div>
    </>
  );
}
