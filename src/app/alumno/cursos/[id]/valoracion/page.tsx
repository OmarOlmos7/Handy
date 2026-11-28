import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Encabezado, Tarjeta } from "@/components/ui";
import { ValoracionInicial } from "@/components/valoracion-inicial";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { textos } from "@/lib/i18n/servidor";
import { descripcionUnidad } from "@/lib/ruta-aprendizaje";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.ruta.valoracion.titulo };
}

/**
 * Valoración inicial del curso: por cada unidad del temario, el alumno dice su nivel de
 * conocimiento (Avanzado, Bueno, Básico, Requiero apoyo, No tengo idea). Se puede rehacer.
 */
export default async function ValoracionCurso({ params }: PageProps<"/alumno/cursos/[id]/valoracion">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t } = await textos();
  const db = await leer();
  const asignatura = asignaturaDelCurso(db, grupo);
  const migas = [
    { texto: t.alumno.panel.titulo, href: "/alumno" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
  ];
  if (!asignatura || asignatura.unidades.length === 0) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={t.ruta.valoracion.titulo} />
        <Tarjeta className="text-sm text-slate-600">{t.alumno.cursos.sinMapa}</Tarjeta>
      </>
    );
  }
  const previa = (db.valoraciones ?? []).find((v) => v.alumnoId === alumno.id && v.grupoId === grupo.id && v.asignaturaId === asignatura.id);
  return (
    <>
      <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={`${t.ruta.valoracion.titulo} · ${asignatura.nombre}`} subtitulo={t.ruta.valoracion.intro} />
      <div className="mx-auto max-w-4xl">
        <ValoracionInicial grupoId={grupo.id} unidades={asignatura.unidades.map((u) => ({ nombre: u.nombre, descripcion: descripcionUnidad(u) }))} inicial={previa?.niveles} />
      </div>
    </>
  );
}
