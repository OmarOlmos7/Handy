import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilaActividad } from "@/components/fila-actividad";
import { BotonLink, Encabezado, Tarjeta, colorCalificacion } from "@/components/ui";
import { entregasDe, estadoActividad, grupoDe } from "@/lib/almacen";
import { reporteGrupo } from "@/lib/estadisticas";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Curso" };

/** Vista de un curso: sus actividades, con editar, borrar y nueva actividad. */
export default async function VistaCurso({ params }: PageProps<"/profesor/grupos/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const alumnos = new Set(grupo.alumnos.map((a) => a.matricula)).size;

  return (
    <>
      <Encabezado
        migas={[{ texto: "Panel", href: "/profesor" }]}
        titulo={`${grupo.materia} · ${grupo.nombre}`}
        subtitulo={`Ciclo ${grupo.ciclo} · ${actividades.length} ${actividades.length === 1 ? "actividad" : "actividades"} · ${alumnos} ${alumnos === 1 ? "alumno" : "alumnos"}`}
        acciones={<BotonLink href={`/profesor/actividades/nueva?grupo=${grupo.id}`}>+ Nueva actividad</BotonLink>}
      />
      {actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          Aún no hay actividades en este curso. Crea la primera con el botón <strong>Nueva actividad</strong>: genérala con IA o
          carga la tuya escaneada.
        </Tarjeta>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            {actividades.map((a) => {
              const entregas = entregasDe(db, a.id);
              const rep = reporteGrupo(a, entregas, grupo.alumnos);
              return (
                <FilaActividad
                  key={a.id}
                  id={a.id}
                  titulo={a.titulo}
                  fecha={a.fechaAplicacion}
                  paginas={a.paginas}
                  entregas={`${rep.entregadas}/${grupo.alumnos.length} entregas`}
                  promedio={rep.entregadas > 0 ? `${rep.promedio} / ${rep.escala}` : undefined}
                  colorPromedio={colorCalificacion(rep.promedio, rep.escala)}
                  estado={estadoActividad(db, a)}
                  recibidas={entregas.filter((e) => e.estado !== "sin_entregar").length}
                />
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
