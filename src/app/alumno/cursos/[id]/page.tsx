import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { FilaActividadAlumno } from "@/components/fila-actividad-alumno";
import { TablaAutoestudio } from "@/components/tabla-autoestudio";
import { IconoCuaderno, IconoGrafica, IconoMapa, IconoRuta } from "@/components/iconos";
import { ResumenCategoria } from "@/components/resumen-categoria";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { iconoTipoActividad } from "@/lib/iconos-tipo";
import { estadoEnvio } from "@/lib/periodo";
import { actividadesVisibles, categoriasAlumno, resumenAvance, seccionesAlumno } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";
import { perfilActivo } from "@/lib/banderas";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { diagnosticoInicial, finesDeCursos } from "@/lib/perfil/diagnostico-inicial";

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
  const items = actividades.map((a) => ({ actividad: a, entrega: db.entregas.find((e) => e.actividadId === a.id && e.matricula === enCurso.matricula) }));
  const secciones = seccionesAlumno(items, ahora);
  // Actividades agrupadas por categoría (tipo de actividad), cada una plegable con su resumen.
  const categorias = categoriasAlumno(items, ahora);
  const propias = (db.autoactividades ?? [])
    .filter((a) => a.alumnoId === alumno.id && a.grupoId === grupo.id)
    .sort((a, b) => (b.completadaEn ?? b.creadaEn).localeCompare(a.completadaEn ?? a.creadaEn));
  // Al empezar el curso, el alumno hace su valoración inicial (base de su ruta de aprendizaje).
  const asignatura = asignaturaDelCurso(db, grupo);
  const conTemario = Boolean(asignatura && asignatura.unidades.length > 0);
  const sinValoracion =
    conTemario && !(db.valoraciones ?? []).some((v) => v.alumnoId === alumno.id && v.grupoId === grupo.id && v.asignaturaId === asignatura!.id);
  // Con el perfil de aprendizaje activo, aviso mientras falte algo del diagnóstico inicial.
  const perfil = perfilActivo();
  const cuenta = perfil ? db.cuentasAlumno.find((c) => c.id === alumno.id) : undefined;
  const diagnostico =
    perfil && cuenta
      ? diagnosticoInicial(db, alumno.id, grupo.id, conTemario ? asignatura!.id : undefined, ahora, finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))))
      : undefined;
  const evaluadas = secciones.entregadas.filter((x) => x.entrega?.estado === "aprobada").length;
  const resumenPropias = resumenAvance(propias.map((a) => (a.estado === "completada" ? "terminada" : a.estado === "evaluando" ? "en_proceso" : "sin_iniciar")));

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
          // Tres columnas de botones por tipo: datos (Analíticas, Cuaderno), avance (Ruta, Mapa del
          // temario) y retos (Proyecto, Autoasignadas). En el teléfono cada par queda en un renglón.
          // En la computadora van en la franja izquierda.
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-flow-col sm:grid-cols-3 sm:grid-rows-2 lg:hidden">
            <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/analiticas`}>
              <IconoGrafica /> {tc.analiticas}
            </BotonLink>
            <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/cuaderno`}>
              <IconoCuaderno /> {tc.cuaderno}
            </BotonLink>
            <BotonLink className="justify-start" href={`/alumno/cursos/${grupo.id}/ruta`}>
              <IconoRuta /> {t.ruta.boton}
            </BotonLink>
            <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/mapa`}>
              <IconoMapa /> {tc.mapa}
            </BotonLink>
            <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/proyecto`}>
              <span aria-hidden>🏆</span> {t.proyecto.alumno.boton}
            </BotonLink>
            <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/autoestudio`}>
              <span aria-hidden>✨</span> {ta.tabla.ver}
            </BotonLink>
            {perfil && (
              <BotonLink variante="secundario" className="justify-start" href={`/alumno/cursos/${grupo.id}/perfil`}>
                <span aria-hidden>🧠</span> {t.perfil.boton}
              </BotonLink>
            )}
          </div>
        }
      />
      {diagnostico && !diagnostico.completo ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{t.perfil.aviso}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{t.perfil.avisoTexto}</p>
          </div>
          <BotonLink href={`/alumno/cursos/${grupo.id}/perfil`}>{t.perfil.avisoBoton} →</BotonLink>
        </div>
      ) : sinValoracion && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{t.ruta.valoracion.titulo}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{t.ruta.valoracion.aviso}</p>
          </div>
          <BotonLink href={`/alumno/cursos/${grupo.id}/valoracion`}>{t.ruta.valoracion.avisoBoton} →</BotonLink>
        </div>
      )}
      <CompaneroDelAlumno db={db} alumno={alumno} grupoId={grupo.id} />
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{tc.sinActividadesCurso}</Tarjeta>
      ) : (
        <div className="space-y-3">
          {categorias.map((c) => {
            // Abierta si tiene algo que puede entregar ya; si no, plegada con su resumen.
            const abierta = c.items.some((x) => x.avance === "sin_iniciar" && estadoEnvio(x.actividad, ahora) === "abierto");
            const titulo = c.etiqueta || tc.categoriaSinTipo;
            return (
              <details key={c.etiqueta || "-"} open={abierta} className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-90">▸</span>
                  <span className="text-xl" aria-hidden>
                    {c.etiqueta ? iconoTipoActividad(c.etiqueta) : "🏷️"}
                  </span>
                  <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
                  <ResumenCategoria resumen={c.resumen} t={t} />
                </summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {c.items.map(({ actividad, entrega }) => (
                    <FilaActividadAlumno key={actividad.id} actividad={actividad} entrega={entrega} ahora={ahora} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
      <details className="group mt-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="text-slate-400 transition group-open:rotate-90">▸</span>
          <span className="text-xl" aria-hidden>
            ✨
          </span>
          <h2 className="text-base font-semibold text-slate-900">{tc.autoasignadas}</h2>
          <ResumenCategoria resumen={resumenPropias} t={t} />
        </summary>
        <div className="border-t border-slate-100 p-4">
          <p className="mb-3 text-sm text-slate-500">{ta.tabla.seccionNota}</p>
          <TablaAutoestudio lista={propias.slice(0, 5)} t={t} locale={locale} enlaces />
        </div>
      </details>
    </>
  );
}
