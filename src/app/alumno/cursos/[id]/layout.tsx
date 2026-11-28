import { Lateral } from "@/components/franja-lateral";
import { HerramientasCursoAlumno } from "@/components/herramientas-curso";
import { alumnoActual } from "@/lib/sesion";

/** Las vistas de un curso del alumno llevan sus botones en la franja izquierda. */
export default async function LayoutCursoAlumno({ children, params }: LayoutProps<"/alumno/cursos/[id]">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  const grupo = alumno?.cursos.find((c) => c.grupo.id === id)?.grupo;
  return (
    <>
      {grupo && (
        <Lateral>
          <HerramientasCursoAlumno grupoId={grupo.id} nombre={`${grupo.materia} · ${grupo.nombre}`} />
        </Lateral>
      )}
      {children}
    </>
  );
}
