import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { FilaActividadAlumno } from "@/components/fila-actividad-alumno";
import { TablaAutoestudio } from "@/components/tabla-autoestudio";
import { IconoCuaderno, IconoGrafica, IconoMapa } from "@/components/iconos";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { actividadesVisibles, seccionesAlumno, type SeccionActividad } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.cursos.misCursos };
}

/** Vista de un curso del alumno: sus actividades por entregar, entregadas y sin programar. */
export default async function CursoAlumno({ params }: PageProps<"/alumno/cursos/[id]">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const ta = t.autoestudio;
  const tc = t.alumno.cursos;
  const db = await leer();
  const ahora = new Date();
  const actividades = actividadesVisibles(db.actividades, grupo.id, ahora);
  const secciones = seccionesAlumno(
    actividades.map((a) => ({ actividad: a, entrega: db.entregas.find((e) => e.actividadId === a.id && e.matricula === enCurso.matricula) })),
    ahora,
  );
  const propias = (db.autoactividades ?? [])
    .filter((a) => a.alumnoId === alumno.id && a.grupoId === grupo.id)
    .sort((a, b) => (b.completadaEn ?? b.creadaEn).localeCompare(a.completadaEn ?? a.creadaEn));
  const evaluadas = secciones.entregadas.filter((x) => x.entrega?.estado === "aprobada").length;
  const orden: { clave: SeccionActividad; titulo: string; nota: string }[] = [
    { clave: "por_entregar", titulo: tc.porEntregar, nota: tc.porEntregarNota },
    { clave: "entregadas", titulo: tc.entregadas, nota: tc.entregadasNota },
    { clave: "sin_programar", titulo: tc.sinProgramar, nota: tc.sinProgramarNota },
  ];

  return (
    <>
      <Encabezado
        migas={[{ texto: t.alumno.panel.titulo, href: "/alumno" }]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`${grupo.materia} · ${grupo.nombre}`}
        subtitulo={formato(tc.resumen, {
          a: formato(actividades.length === 1 ? tc.actividad1 : tc.actividadN, { n: actividades.length }),
          b: formato(evaluadas === 1 ? tc.evaluadas1 : tc.evaluadasN, { n: evaluadas }),
        })}
        acciones={
          <>
            <BotonLink variante="secundario" href={`/alumno/cursos/${grupo.id}/analiticas`}>
              <IconoGrafica /> {tc.analiticas}
            </BotonLink>
            <BotonLink variante="secundario" href={`/alumno/cursos/${grupo.id}/cuaderno`}>
              <IconoCuaderno /> {tc.cuaderno}
            </BotonLink>
            <BotonLink variante="secundario" href={`/alumno/cursos/${grupo.id}/mapa`}>
              <IconoMapa /> {tc.mapa}
            </BotonLink>
            <BotonLink variante="secundario" href={`/alumno/cursos/${grupo.id}/autoestudio`}>
              ✨ {ta.tabla.ver}
            </BotonLink>
          </>
        }
      />
      <CompaneroDelAlumno db={db} alumno={alumno} grupoId={grupo.id} />
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{tc.sinActividadesCurso}</Tarjeta>
      ) : (
        <div className="space-y-6">
          {orden.map(({ clave, titulo, nota }) => (
            <section key={clave} aria-labelledby={`seccion-${clave}`}>
              <h2 id={`seccion-${clave}`} className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
                {titulo}
                <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-600">{secciones[clave].length}</span>
                <span className="text-sm font-normal text-slate-500">{nota}</span>
              </h2>
              {secciones[clave].length === 0 ? (
                <p className="rounded-xl bg-white px-5 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tc.vacioSeccion}</p>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  {secciones[clave].map(({ actividad, entrega }) => (
                    <FilaActividadAlumno key={actividad.id} actividad={actividad} entrega={entrega} ahora={ahora} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <section aria-labelledby="seccion-autoestudio" className="mt-6">
        <h2 id="seccion-autoestudio" className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
          {ta.tabla.seccion}
          <span className="rounded-full bg-violet-100 px-2 text-xs font-medium text-violet-800">{propias.length}</span>
          <span className="text-sm font-normal text-slate-500">{ta.tabla.seccionNota}</span>
        </h2>
        <TablaAutoestudio lista={propias.slice(0, 5)} t={t} locale={locale} enlaces />
      </section>
    </>
  );
}
