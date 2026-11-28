import { LateralCurso } from "@/components/lateral-curso";

/** Todas las vistas de un curso llevan sus herramientas en la franja izquierda. */
export default async function LayoutCurso({ children, params }: LayoutProps<"/profesor/grupos/[id]">) {
  const { id } = await params;
  return (
    <>
      <LateralCurso grupoId={id} />
      {children}
    </>
  );
}
