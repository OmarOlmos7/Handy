import { notFound } from "next/navigation";
import { RevisionAlumno } from "@/components/revision-alumno";
import { Encabezado } from "@/components/ui";
import { actividades, entregasDeActividad, obtenerActividad, obtenerGrupo } from "@/lib/datos-ejemplo";

export function generateStaticParams() {
  return actividades.flatMap((a) =>
    entregasDeActividad(a.id)
      .filter((e) => e.resultados.length > 0)
      .map((e) => ({ id: a.id, matricula: e.matricula })),
  );
}

export default async function Revision({ params }: PageProps<"/profesor/actividades/[id]/revision/[matricula]">) {
  const { id, matricula } = await params;
  const actividad = obtenerActividad(id);
  if (!actividad) notFound();
  const grupo = obtenerGrupo(actividad.grupoId)!;
  const evaluadas = entregasDeActividad(id).filter((e) => e.resultados.length > 0);
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
