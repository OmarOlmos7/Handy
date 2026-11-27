import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ListaAvisos, NuevoAviso } from "@/components/avisos";
import { Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { avisosDelAlumno, avisosDelGrupo, sinLeerAlumno } from "@/lib/avisos";
import { vistaAlumno } from "@/lib/avisos-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.avisos.meta };
}

/** Avisos del curso para el alumno: los que le llegaron y los que él le escribió a su profesor. */
export default async function AvisosCursoAlumno({ params }: PageProps<"/alumno/cursos/[id]/avisos">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const ta = t.avisos;
  const db = await leer();
  const nombreProfesor = db.profesores.find((p) => p.id === grupo.profesorId)?.nombre ?? ta.tuProfesor;
  const todos = avisosDelGrupo(db.avisos ?? [], grupo.id);
  const suyos = avisosDelAlumno(todos, grupo.id, enCurso.matricula);
  const avisos = suyos.map((a) => vistaAlumno(a, { grupo, todos, nombreProfesor, locale }, enCurso.matricula));
  const sinLeer = sinLeerAlumno(todos, grupo.id, enCurso.matricula);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`${ta.titulo} · ${grupo.materia} · ${grupo.nombre}`}
        subtitulo={sinLeer ? `${formato(ta.sinLeerN, { n: sinLeer })} · ${ta.subtituloAlumno}` : ta.subtituloAlumno}
      />
      <div className="space-y-6">
        <NuevoAviso grupoId={grupo.id} textoBoton={ta.nuevoAlProfesor} />
        <ListaAvisos avisos={avisos} vacio={ta.vacio} />
      </div>
    </>
  );
}
