import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TablaCuadernoAlumno } from "@/components/tabla-cuaderno-alumno";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { cuadernoAlumno } from "@/lib/portal-alumno";
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
  const c = cuadernoAlumno(grupo, db.actividades, db.entregas, curso.alumno.matricula, new Date(), t.profesor.calculo.sinEtiqueta);
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
      {actividades === 0 ? (
        <Tarjeta className="text-sm text-slate-600">{tq.vacio}</Tarjeta>
      ) : (
        <TablaCuadernoAlumno cuaderno={c} nombre={curso.alumno.nombre || alumno.nombre} matricula={curso.alumno.matricula} />
      )}
    </>
  );
}
