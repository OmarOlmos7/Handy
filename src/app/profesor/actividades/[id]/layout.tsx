import { LateralCurso } from "@/components/lateral-curso";
import { actividadDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";

/** Las vistas de una actividad llevan las herramientas de su curso en la franja izquierda. */
export default async function LayoutActividad({ children, params }: LayoutProps<"/profesor/actividades/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  return (
    <>
      <LateralCurso grupoId={actividadDe(db, id)?.grupoId} />
      {children}
    </>
  );
}
