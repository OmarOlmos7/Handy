import type { Metadata } from "next";
import { conPuntaje } from "@/lib/modalidad";
import { notFound } from "next/navigation";
import { FilaActividad } from "@/components/fila-actividad";
import { IconoCuaderno, IconoGrafica, IconoMapa } from "@/components/iconos";
import { BotonLink, Encabezado, Tarjeta, colorCalificacion } from "@/components/ui";
import { entregasDe, estadoActividad, grupoDe } from "@/lib/almacen";
import { agruparPorEtiqueta } from "@/lib/colores";
import { reporteGrupo } from "@/lib/estadisticas";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.curso.meta };
}

/** Vista de un curso: sus actividades, con editar, borrar y nueva actividad. */
export default async function VistaCurso({ params }: PageProps<"/profesor/grupos/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const { t } = await textos();
  const c = t.profesor.comun;
  const tc = t.profesor.curso;
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const alumnos = new Set(grupo.alumnos.map((a) => a.matricula)).size;
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
            <BotonLink variante="secundario" href={`/profesor/grupos/${grupo.id}/analiticas`}>
              <IconoGrafica /> {tc.analiticas}
            </BotonLink>
            <BotonLink variante="secundario" href={`/profesor/grupos/${grupo.id}/avance`}>
              <IconoMapa /> {tc.avanceTemario}
            </BotonLink>
            <BotonLink variante="secundario" href={`/profesor/grupos/${grupo.id}/cuaderno`}>
              <IconoCuaderno /> {tc.cuaderno}
            </BotonLink>
            <BotonLink href={`/profesor/actividades/nueva?grupo=${grupo.id}`}>{tc.nuevaActividad}</BotonLink>
          </>
        }
      />
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          {tc.sinActividadesAntes}
          <strong>{tc.sinActividadesBoton}</strong>
          {tc.sinActividadesDespues}
        </Tarjeta>
      ) : (
        <div className="space-y-6">
          {agruparPorEtiqueta(actividades).map(({ etiqueta, items }) => (
            <section key={etiqueta ?? "sin-etiqueta"}>
              <h2 className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
                {etiqueta ?? tc.sinEtiqueta}
                <span className="text-sm font-normal text-slate-500">
                  {formato(items.length === 1 ? c.actividad1 : c.actividadN, { n: items.length })}
                </span>
              </h2>
              <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
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
                        entregas={formato(tc.entregas, { n: rep.entregadas, total: grupo.alumnos.length })}
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
            </section>
          ))}
        </div>
      )}
    </>
  );
}
