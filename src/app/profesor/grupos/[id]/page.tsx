import type { Metadata } from "next";
import Link from "next/link";
import { conPuntaje } from "@/lib/modalidad";
import { notFound } from "next/navigation";
import { CodigoCurso } from "@/components/codigo-curso";
import { DirectorioActividades } from "@/components/copiar-elemento";
import { directorioActividades } from "@/lib/copiar";
import { FilaActividad } from "@/components/fila-actividad";
import { IconoCuaderno, IconoGrafica, IconoMapa, IconoRuta } from "@/components/iconos";
import { ResumenCategoria } from "@/components/resumen-categoria";
import { BotonLink, Encabezado, Tarjeta, colorCalificacion } from "@/components/ui";
import { entregasDe, estadoActividad, grupoDe } from "@/lib/almacen";
import { avanceActividadGrupo, resumenActividadesGrupo } from "@/lib/avance-actividades-grupo";
import { agruparPorEtiqueta } from "@/lib/colores";
import { iconoTipoActividad } from "@/lib/iconos-tipo";
import { reporteGrupo } from "@/lib/estadisticas";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { evaluadoresDe } from "@/lib/proyectos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.curso.meta };
}

/** Vista de un curso: sus actividades, con editar, borrar y nueva actividad. */
export default async function VistaCurso({ params }: PageProps<"/profesor/grupos/[id]">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const { t } = await textos();
  const c = t.profesor.comun;
  const tc = t.profesor.curso;
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const proyectos = (db.proyectos ?? []).filter((p) => p.grupoId === id);
  const tpr = t.proyecto;
  const alumnos = new Set(grupo.alumnos.map((a) => a.matricula)).size;
  const ahora = new Date();
  // Etiquetas propias del profesor en todos sus cursos, para sugerirlas.
  const etiquetasCurso = [...new Set(db.actividades.map((a) => a.etiqueta?.trim()).filter((e): e is string => !!e))];

  return (
    <>
      <Encabezado
        migas={[{ texto: c.panel, href: "/profesor" }]}
        rutaEtiqueta={c.ruta}
        titulo={`${grupo.materia} · ${grupo.nombre}`}
        subtitulo={`${formato(c.ciclo, { c: grupo.ciclo })} · ${formato(actividades.length === 1 ? c.actividad1 : c.actividadN, { n: actividades.length })} · ${formato(alumnos === 1 ? c.alumno1 : c.alumnoN, { n: alumnos })}`}
        acciones={
          <>
            {/* Dos columnas: Analíticas y Cuaderno a la izquierda; Rutas y Avance del temario a la derecha. */}
            <div className="grid w-full grid-flow-col grid-cols-2 grid-rows-2 gap-2 sm:w-auto">
              <BotonLink variante="secundario" className="justify-start" href={`/profesor/grupos/${grupo.id}/analiticas`}>
                <IconoGrafica /> {tc.analiticas}
              </BotonLink>
              <BotonLink variante="secundario" className="justify-start" href={`/profesor/grupos/${grupo.id}/cuaderno`}>
                <IconoCuaderno /> {tc.cuaderno}
              </BotonLink>
              <BotonLink variante="secundario" className="justify-start" href={`/profesor/grupos/${grupo.id}/rutas`}>
                <IconoRuta /> {t.ruta.profesor.boton}
              </BotonLink>
              <BotonLink variante="secundario" className="justify-start" href={`/profesor/grupos/${grupo.id}/avance`}>
                <IconoMapa /> {tc.avanceTemario}
              </BotonLink>
            </div>
            {/* Proyecto y Copiar elemento (traer actividades de otros cursos) arriba de Nueva actividad. */}
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-1">
              <BotonLink variante="secundario" className="justify-start" href={`/profesor/grupos/${grupo.id}/proyectos`}>
                <span aria-hidden>🏆</span> {tpr.grupo.boton}
                {proyectos.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{proyectos.length}</span>}
              </BotonLink>
              <DirectorioActividades grupoId={grupo.id} cursos={directorioActividades(db, profesor.id)} />
              <BotonLink className="col-span-2 sm:col-span-1" href={`/profesor/actividades/nueva?grupo=${grupo.id}`}>{tc.nuevaActividad}</BotonLink>
            </div>
          </>
        }
      />
      {grupo.codigo && (
        <CodigoCurso
          codigo={grupo.codigo}
          titulo={t.licencias.profesor.codigoCurso}
          ayuda={t.licencias.profesor.codigoAyuda}
          copiar={t.licencias.profesor.copiar}
          copiado={t.licencias.profesor.copiado}
        />
      )}
      {proyectos.length > 0 && (
        <section className="mb-6" aria-labelledby="seccion-proyectos">
          <h2 id="seccion-proyectos" className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
            🛠️ {tpr.seccionCurso}
            <span className="text-sm font-normal text-slate-500">{proyectos.length}</span>
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {proyectos.map((p) => {
              const cerradas = p.etapas.filter((e) => e.cerradaEn).length;
              const ev = evaluadoresDe(p).length;
              return (
                <li key={p.id}>
                  <Link href={`/profesor/proyectos/${p.id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-slate-50 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{p.titulo}</span>
                      <span className="block text-xs text-slate-500">
                        {formato(p.etapas.length === 1 ? tpr.etapas1 : tpr.etapasN, { n: p.etapas.length })} · {formato(ev === 1 ? tpr.evaluadores1 : tpr.evaluadoresN, { n: ev })}
                      </span>
                    </span>
                    {/* Avance: una barrita por etapa (verde si ya se cerró). */}
                    <span className="flex items-center gap-2">
                      <span className="flex gap-1" aria-hidden>
                        {p.etapas.map((e) => (
                          <span key={e.id} className={`h-2 w-6 rounded-full ${e.cerradaEn ? "bg-acierto" : "bg-slate-200"}`} />
                        ))}
                      </span>
                      <span className="text-xs text-slate-600">{formato(tpr.cerradasDe, { c: cerradas, n: p.etapas.length })}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          {tc.sinActividadesAntes}
          <strong>{tc.sinActividadesBoton}</strong>
          {tc.sinActividadesDespues}
        </Tarjeta>
      ) : (
        <div className="space-y-3">
          {/* Una sección plegable por tipo de actividad, con su resumen de avance del grupo. */}
          {agruparPorEtiqueta(actividades).map(({ etiqueta, items }) => {
            const resumen = resumenActividadesGrupo(items, db.entregas, alumnos, ahora);
            // Abierta si tiene actividades en proceso (recibiendo entregas o por revisar).
            const abierta = items.some((a) => avanceActividadGrupo(a, db.entregas, alumnos, ahora) === "en_proceso");
            return (
              <details key={etiqueta ?? "sin-etiqueta"} open={abierta} className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-90">
                    ▸
                  </span>
                  <span className="text-xl" aria-hidden>
                    {etiqueta ? iconoTipoActividad(etiqueta) : "🏷️"}
                  </span>
                  <h2 className="text-base font-semibold text-slate-900">{etiqueta ?? tc.sinEtiqueta}</h2>
                  <ResumenCategoria resumen={resumen} t={t} />
                </summary>
                <div className="border-t border-slate-100">
                  <ul className="divide-y divide-slate-100">
                    {items.map((a) => {
                      const entregas = entregasDe(db, a.id);
                      const rep = reporteGrupo(a, entregas, grupo.alumnos);
                      return (
                        <FilaActividad
                          key={a.id}
                          id={a.id}
                          titulo={a.titulo}
                          fecha={a.fechaAplicacion}
                          resultadosDesde={a.resultadosDesde}
                          envioDesde={a.envioDesde}
                          envioHasta={a.envioHasta}
                          paginas={a.paginas}
                          entregas={formato(tc.entregas, {
                            n: rep.entregadas,
                            total: grupo.alumnos.length,
                          })}
                          promedio={rep.entregadas > 0 && conPuntaje(a) ? `${rep.promedio} / ${rep.escala}` : undefined}
                          colorPromedio={colorCalificacion(rep.promedio, rep.escala)}
                          estado={estadoActividad(db, a)}
                          recibidas={entregas.filter((e) => e.estado !== "sin_entregar").length}
                          color={a.color}
                          etiqueta={a.etiqueta}
                          etiquetasCurso={etiquetasCurso}
                        />
                      );
                    })}
                  </ul>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
