import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumenAutoestudioTexto, TablaAutoestudio } from "@/components/tabla-autoestudio";
import { Encabezado } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.autoestudio.profesor.titulo };
}

/** Tabla de actividades autoasignadas de un alumno, desde el cuaderno del profesor. */
export default async function AutoestudioDeAlumno({ params }: PageProps<"/profesor/grupos/[id]/autoestudio/[matricula]">) {
  const { id, matricula: cruda } = await params;
  const matricula = decodeURIComponent(cruda);
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  const alumno = grupo?.alumnos.find((a) => a.matricula === matricula);
  if (!grupo || !alumno) notFound();
  const { t, locale } = await textos();
  const ta = t.autoestudio.profesor;
  const lista = (db.autoactividades ?? []).filter((a) => a.grupoId === grupo.id && a.matricula === matricula);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.profesor.cuaderno.titulo, href: `/profesor/grupos/${grupo.id}/cuaderno` },
          { texto: ta.titulo, href: `/profesor/grupos/${grupo.id}/autoestudio` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={formato(ta.tablaAlumno, { nombre: alumno.nombre })}
        subtitulo={<ResumenAutoestudioTexto lista={lista} grupoId={grupo.id} matricula={matricula} t={t} />}
      />
      <TablaAutoestudio lista={lista} t={t} locale={locale} profesor />
    </>
  );
}
