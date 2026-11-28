import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { LineaTiempoCurso } from "@/components/linea-tiempo-curso";
import { BarraUnidades, SeccionUnidad, SeleccionUnidades } from "@/components/unidades-curso";
import { FilaActividadAlumno } from "@/components/fila-actividad-alumno";
import { TablaAutoestudio } from "@/components/tabla-autoestudio";
import { IconoCuaderno, IconoGrafica, IconoMapa, IconoRuta } from "@/components/iconos";
import { ResumenCategoria } from "@/components/resumen-categoria";
import { BotonLink, Encabezado, Tarjeta, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { ahoraEnMexico } from "@/lib/asesorias";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { avanceDelPeriodo, iconoUnidad, lineaTiempoCurso } from "@/lib/linea-tiempo";
import { colorUnidad } from "@/lib/mapa-temario";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { iconoTipoActividad } from "@/lib/iconos-tipo";
import { estadoEnvio } from "@/lib/periodo";
import { actividadesVisibles, categoriasAlumno, resumenAvance, seccionesAlumno, unidadesAlumno, type CategoriaAlumno } from "@/lib/portal-alumno";
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
  const evaluadas = secciones.entregadas.filter((x) => x.entrega?.estado === "aprobada").length;
  // Línea de tiempo del curso: las unidades del temario repartidas entre el inicio y el término,
  // con el avance propio del alumno en cada una; debajo, sus actividades agrupadas por unidad.
  const hoy = ahoraEnMexico(ahora).fecha;
  const linea = conTemario ? lineaTiempoCurso(asignatura!.unidades.map((u) => u.nombre), grupo.inicio, grupo.fin, hoy) : null;
  const porUnidad = conTemario ? unidadesAlumno(asignatura!, items, ahora) : null;
  const tu = t.marco.unidades;
  const resumenPropias = resumenAvance(propias.map((a) => (a.estado === "completada" ? "terminada" : a.estado === "evaluando" ? "en_proceso" : "sin_iniciar")));

  return (
    <SeleccionUnidades>
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
          </div>
        }
      />
      {sinValoracion && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">{t.ruta.valoracion.titulo}</p>
            <p className="mt-1 text-[15px] font-semibold text-slate-900">{t.ruta.valoracion.aviso}</p>
          </div>
          <BotonLink href={`/alumno/cursos/${grupo.id}/valoracion`}>{t.ruta.valoracion.avisoBoton} →</BotonLink>
        </div>
      )}
      <CompaneroDelAlumno db={db} alumno={alumno} grupoId={grupo.id} />
      {conTemario && (
        <LineaTiempoCurso
          grupoId={grupo.id}
          inicio={grupo.inicio}
          fin={grupo.fin}
          unidades={linea?.map((u) => ({ ...u, icono: iconoUnidad(u.nombre, u.indice), avance: porUnidad?.[u.indice]?.avance ?? null })) ?? null}
          transcurrido={avanceDelPeriodo(grupo.inicio, grupo.fin, hoy)}
          hoy={hoy}
          hayTemario
          t={t}
          locale={locale}
          conteos={porUnidad && actividades.length > 0 ? asignatura!.unidades.map((_, i) => porUnidad[i]?.resumen.total ?? 0) : undefined}
          vista="alumno"
        />
      )}
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{tc.sinActividadesCurso}</Tarjeta>
      ) : porUnidad ? (
        <div className="space-y-3">
          <BarraUnidades nombres={asignatura!.unidades.map((u) => u.nombre)} />
          {/* Una sección plegable por unidad, en el orden del temario; dentro, las actividades por tipo. */}
          {porUnidad.map(({ indice, categorias: deUnidad, resumen, porEntregar }) => {
            const color = indice === null ? null : colorUnidad(indice);
            const tramo = indice === null ? undefined : linea?.[indice];
            return (
              <SeccionUnidad
                key={indice ?? "sin-unidad"}
                indice={indice}
                abierta={tramo?.estado === "en_curso" || porEntregar}
                encabezado={
                  <>
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                      style={color ? { background: tramo?.estado === "pendiente" ? color.fondo : color.nodo, color: tramo?.estado === "pendiente" ? color.nodo : "#fff" } : { background: "#e2e8f0", color: "#475569" }}
                    >
                      {indice === null ? "–" : indice + 1}
                    </span>
                    <span className="min-w-0">
                      <h2 className="text-base font-semibold leading-snug text-slate-900">{indice === null ? tu.sinUnidad : asignatura!.unidades[indice].nombre}</h2>
                      {tramo && (
                        <span className="block text-xs text-slate-500">
                          {fechaLarga(tramo.desde, locale)} – {fechaLarga(tramo.hasta, locale)}
                        </span>
                      )}
                    </span>
                    {resumen.total > 0 ? (
                      <ResumenCategoria resumen={resumen} t={t} />
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{formato(tu.actividadesN, { n: 0 })}</span>
                    )}
                  </>
                }
              >
                {deUnidad.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-500">{tu.vaciaAlumno}</p>
                ) : (
                  deUnidad.map((c) => (
                    <div key={c.etiqueta || "-"}>
                      <p className="flex items-center gap-2 bg-slate-50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span aria-hidden className="text-sm normal-case">
                          {c.etiqueta ? iconoTipoActividad(c.etiqueta) : "🏷️"}
                        </span>
                        {c.etiqueta || tc.categoriaSinTipo}
                        <span className="font-normal normal-case text-slate-400">· {c.items.length}</span>
                      </p>
                      <Filas categoria={c} ahora={ahora} />
                    </div>
                  ))
                )}
              </SeccionUnidad>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sin temario: una sección plegable por tipo de actividad. */}
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
                <div className="border-t border-slate-100">
                  <Filas categoria={c} ahora={ahora} />
                </div>
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
    </SeleccionUnidades>
  );
}

/** Renglones de las actividades de una categoría. */
function Filas({ categoria, ahora }: { categoria: CategoriaAlumno; ahora: Date }) {
  return (
    <ul className="divide-y divide-slate-100">
      {categoria.items.map(({ actividad, entrega }) => (
        <FilaActividadAlumno key={actividad.id} actividad={actividad} entrega={entrega} ahora={ahora} />
      ))}
    </ul>
  );
}
