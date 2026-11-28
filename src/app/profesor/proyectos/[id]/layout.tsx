import { LateralCurso } from "@/components/lateral-curso";
import { datosProfesor } from "@/lib/sesion";

/** Las vistas de un proyecto llevan las herramientas de su curso en la franja izquierda. */
export default async function LayoutProyecto({ children, params }: LayoutProps<"/profesor/proyectos/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  return (
    <>
      <LateralCurso grupoId={(db.proyectos ?? []).find((p) => p.id === id)?.grupoId} />
      {children}
    </>
  );
}
