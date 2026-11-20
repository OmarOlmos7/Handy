import { notFound } from "next/navigation";
import { RevisionAlumno } from "@/components/revision-alumno";
import { Encabezado } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";
import { actividadDeVersion } from "@/lib/versiones";

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
  const { t } = await textos();

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo={alumno.nombre}
        subtitulo={`${formato(t.profesor.revisionPagina.subtitulo, { m: alumno.matricula, i: i + 1, n: evaluadas.length })}${
          actividad.versiones?.length ? ` · ${formato(t.comun.version, { v: entrega.version ?? "A" })}` : ""
        }`}
      />
      <RevisionAlumno
        key={matricula}
        actividad={actividadDeVersion(actividad, entrega.version)}
        alumno={alumno}
        entregaInicial={entrega}
        grupoTexto={`${grupo.materia} · ${grupo.nombre}`}
        siguienteHref={siguiente ? `/profesor/actividades/${id}/revision/${siguiente.matricula}` : undefined}
      />
    </>
  );
}
