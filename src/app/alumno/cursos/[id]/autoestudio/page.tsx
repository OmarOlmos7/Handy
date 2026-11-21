import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { ResumenAutoestudioTexto, TablaAutoestudio } from "@/components/tabla-autoestudio";
import { Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.autoestudio.tabla.titulo };
}

/** Tabla de las actividades que el alumno se asignó en un curso. */
export default async function AutoestudioAlumno({ params }: PageProps<"/alumno/cursos/[id]/autoestudio">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t, locale } = await textos();
  const tt = t.autoestudio.tabla;
  const db = await leer();
  const lista = (db.autoactividades ?? []).filter((a) => a.alumnoId === alumno.id && a.grupoId === grupo.id);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tt.titulo}
        subtitulo={<ResumenAutoestudioTexto lista={lista} grupoId={grupo.id} matricula={curso.alumno.matricula} t={t} />}
      />
      <CompaneroDelAlumno db={db} alumno={alumno} grupoId={grupo.id} />
      {(grupo.pesoAutoestudio ?? 0) > 0 && <p className="mb-3 rounded-lg bg-tinta-50 px-4 py-2 text-sm text-tinta-900">{formato(tt.peso, { n: grupo.pesoAutoestudio! })}</p>}
      <TablaAutoestudio lista={lista} t={t} locale={locale} enlaces />
    </>
  );
}
