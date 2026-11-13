import { notFound } from "next/navigation";
import { RevisionAlumno } from "@/components/revision-alumno";
import { Encabezado } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";

export default async function Revision({ params }: PageProps<"/profesor/actividades/[id]/revision/[matricula]">) {
  const { id, matricula } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const evaluadas = entregasDe(db, id).filter((e) => e.resultados.length > 0);
  const i = evaluadas.findIndex((e) => e.matricula === matricula);
  if (i < 0) notFound();
  const entrega = evaluadas[i];
  const alumno = grupo.alumnos.find((a) => a.matricula === matricula)!;
  const siguiente = evaluadas[i + 1];

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo={alumno.nombre}
        subtitulo={`Matrícula ${alumno.matricula} · alumno ${i + 1} de ${evaluadas.length}`}
      />
      <RevisionAlumno
        key={matricula}
        actividad={actividad}
        alumno={alumno}
        entregaInicial={entrega}
        grupoTexto={`${grupo.materia} · ${grupo.nombre}`}
        siguienteHref={siguiente ? `/profesor/actividades/${id}/revision/${siguiente.matricula}` : undefined}
      />
    </>
  );
}
