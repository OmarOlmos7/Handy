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
  const filas = filasDiagnostico(datosPerfilGrupo(await leer(), grupo), grupo, conTemario, new Date());
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
