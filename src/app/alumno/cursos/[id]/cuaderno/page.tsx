import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TablaCuadernoAlumno } from "@/components/tabla-cuaderno-alumno";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { cuadernoAlumno } from "@/lib/portal-alumno";
import { columnasDeProyectos } from "@/lib/proyectos";
import { resumenAutoestudio } from "@/lib/autoestudio";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.cuaderno.titulo };
}

/** Cuaderno de calificaciones del alumno: solo su fila, con el promedio del grupo como referencia. */
export default async function CuadernoAlumno({ params }: PageProps<"/alumno/cursos/[id]/cuaderno">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t } = await textos();
  const tq = t.alumno.cuaderno;
  const db = await leer();
  const auto = resumenAutoestudio(db.autoactividades ?? [], grupo.id, curso.alumno.matricula);
  // Los proyectos entran como columnas con el promedio de sus etapas ya cerradas.
  const deProyectos = columnasDeProyectos((db.proyectos ?? []).filter((p) => p.grupoId === grupo.id), db.evaluacionesProyecto ?? [], grupo.alumnos, t.proyecto.chip);
  const c = cuadernoAlumno(
    grupo,
    [...db.actividades, ...deProyectos.actividades],
    [...db.entregas, ...deProyectos.entregas],
    curso.alumno.matricula,
    new Date(),
    t.profesor.calculo.sinEtiqueta,
    auto.promedio,
  );
  const nombreCurso = `${grupo.materia} · ${grupo.nombre}`;
  const actividades = c.grupos.reduce((n, g) => n + g.columnas.length, 0);
  const tc = t.profesor.comun;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: nombreCurso, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={tc.ruta}
        titulo={tq.titulo}
        subtitulo={formato(tq.subtitulo, {
          curso: nombreCurso,
          a: formato(actividades === 1 ? tc.actividad1 : tc.actividadN, { n: actividades }),
          e: c.escala,
        })}
      />
      {(grupo.pesoAutoestudio ?? 0) > 0 && (
        <p className="mb-3 rounded-lg bg-violet-50 px-4 py-2 text-sm text-violet-900">
          ✨ {formato(t.autoestudio.tabla.peso, { n: grupo.pesoAutoestudio! })} {t.autoestudio.profesor.promedio}: {auto.promedio ?? "—"}
        </p>
      )}
      {actividades === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{tq.vacio}</Tarjeta>
      ) : (
        <TablaCuadernoAlumno cuaderno={c} nombre={curso.alumno.nombre || alumno.nombre} matricula={curso.alumno.matricula} grupoId={grupo.id} />
      )}
    </>
  );
}
