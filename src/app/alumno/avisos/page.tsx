import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListaAvisos, SobreAvisos } from "@/components/avisos";
import { Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { avisosDelAlumno, avisosDelGrupo, sinLeerAlumno } from "@/lib/avisos";
import { vistaAlumno } from "@/lib/avisos-vista";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.avisos.meta };
}

/** Avisos de todos los cursos del alumno. */
export default async function AvisosAlumno() {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const { t, locale } = await textos();
  const ta = t.avisos;
  const db = await leer();
  const cursos = alumno.cursos.map(({ grupo, alumno: enCurso }) => {
    const todos = avisosDelGrupo(db.avisos ?? [], grupo.id);
    const nombreProfesor = db.profesores.find((p) => p.id === grupo.profesorId)?.nombre ?? ta.tuProfesor;
    return {
      grupo,
      sinLeer: sinLeerAlumno(todos, grupo.id, enCurso.matricula),
      avisos: avisosDelAlumno(todos, grupo.id, enCurso.matricula).map((a) => ({
        orden: a.enviadoEn,
        vista: { ...vistaAlumno(a, { grupo, todos, nombreProfesor, locale, conCurso: true }, enCurso.matricula), cursoHref: `/alumno/cursos/${grupo.id}/avisos` },
      })),
    };
  });
  const avisos = cursos
    .flatMap((c) => c.avisos)
    .sort((a, b) => b.orden.localeCompare(a.orden))
    .map((x) => x.vista);

  return (
    <>
      <Encabezado titulo={ta.titulo} subtitulo={ta.alumnoPanel.subtitulo} />
      {cursos.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {cursos.map(({ grupo, sinLeer }) => (
            <li key={grupo.id} className="flex items-center gap-1 rounded-xl bg-white py-1 pr-3 pl-1 shadow-sm ring-1 ring-slate-200">
              <SobreAvisos href={`/alumno/cursos/${grupo.id}/avisos`} sinLeer={sinLeer} />
              <Link href={`/alumno/cursos/${grupo.id}/avisos`} className="text-sm font-medium text-slate-800 hover:text-tinta-700 hover:underline">
                {grupo.materia} · {grupo.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ListaAvisos avisos={avisos} vacio={ta.alumnoPanel.ninguno} />
    </>
  );
}
