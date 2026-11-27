import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AjustesCurso, BitacoraAsesorias } from "@/components/asesorias";
import { IconoCalendario } from "@/components/iconos";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { asesoriasDelCurso, asesoriasPorAlumno, duracionTexto, resumenAsesorias } from "@/lib/asesorias";
import { fechaCorta, textoPeriodo, vistaAsesoria } from "@/lib/asesorias-vista";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asesorias.meta };
}

/** Asesorías del curso: cuántas y cuánto tiempo, tiempo por alumno y la bitácora con lo revisado. */
export default async function AsesoriasCursoProfesor({ params, searchParams }: PageProps<"/profesor/grupos/[id]/asesorias">) {
  const { id } = await params;
  const { abrir } = await searchParams;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.asesorias;
  const tc = ta.curso;
  const ahora = new Date();
  const agenda = (db.agendas ?? [])[0];
  const asesorias = db.asesorias ?? [];
  const r = resumenAsesorias(asesorias, grupo, undefined, ahora);
  const porAlumno = asesoriasPorAlumno(asesorias, grupo);
  const vistas = asesoriasDelCurso(asesorias, grupo.id).map((a) => vistaAsesoria(a, { grupo, locale, agenda, paraProfesor: true }, ahora));
  const periodo = textoPeriodo(ta, grupo.inicio, grupo.fin, locale);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`🙋 ${ta.meta} · ${grupo.materia} · ${grupo.nombre}`}
        subtitulo={tc.subtituloProfesor}
        acciones={
          <BotonLink href={`/profesor/agenda?vista=editar&curso=${grupo.id}`}>
            <IconoCalendario /> {ta.profesor.abrirAgenda}
          </BotonLink>
        }
      />
      <Tarjeta className="relative mb-5 !p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">{tc.periodoCurso}</p>
            <p className="font-medium text-slate-900">{periodo ?? ta.sinPeriodo}</p>
            <p className="text-xs text-slate-500">{tc.soloDentro}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-tinta-700">
            {!periodo && <span>{tc.definirFechas}</span>}
            <AjustesCurso grupoId={grupo.id} inicio={grupo.inicio} fin={grupo.fin} />
          </div>
        </div>
      </Tarjeta>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { titulo: tc.realizadas, valor: String(r.realizadas), clase: "text-acierto" },
          { titulo: tc.tiempo, valor: duracionTexto(r.minutos), clase: "text-slate-900" },
          { titulo: tc.promedio, valor: r.realizadas ? duracionTexto(r.promedio) : "—", clase: "text-slate-900" },
          { titulo: tc.alumnosAtendidos, valor: `${r.alumnos} / ${grupo.alumnos.length}`, clase: "text-slate-900" },
        ].map((x) => (
          <Tarjeta key={x.titulo} className="!p-4">
            <p className="text-xs text-slate-500">{x.titulo}</p>
            <p className={`mt-1 text-2xl font-semibold ${x.clase}`}>{x.valor}</p>
          </Tarjeta>
        ))}
      </div>
      <p className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        <span>
          {tc.proximas}: <b>{r.proximas}</b>
        </span>
        <span className={r.porRegistrar ? "text-aviso" : ""}>
          {ta.estado.porRegistrar}: <b>{r.porRegistrar}</b>
        </span>
        <span>
          {tc.noAsistio}: <b>{r.noAsistio}</b>
        </span>
        <span>
          {tc.canceladas}: <b>{r.canceladas}</b>
        </span>
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">{tc.bitacora}</h2>
          <BitacoraAsesorias asesorias={vistas} abrir={typeof abrir === "string" ? abrir : undefined} />
        </section>
        <aside>
          <h2 className="mb-3 text-lg font-semibold">{tc.porAlumno}</h2>
          {porAlumno.length === 0 ? (
            <p className="text-sm text-slate-500">—</p>
          ) : (
            <table className="w-full overflow-hidden rounded-xl bg-white text-sm shadow-sm ring-1 ring-slate-200">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{tc.alumno}</th>
                  <th className="px-3 py-2 text-right font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">{tc.tiempo}</th>
                </tr>
              </thead>
              <tbody>
                {porAlumno.map((x) => (
                  <tr key={x.matricula} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <span className="block font-medium text-slate-800">{x.nombre}</span>
                      {x.ultima && (
                        <span className="text-xs text-slate-500">
                          {tc.ultima}: {fechaCorta(x.ultima, locale)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{x.realizadas}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{duracionTexto(x.minutos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      </div>
    </>
  );
}
