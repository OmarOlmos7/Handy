import { redirect } from "next/navigation";

/** El reporte del grupo se reemplazó por las analíticas de la actividad. */
export default async function ReporteGrupo({ params }: PageProps<"/profesor/actividades/[id]/reporte">) {
  const { id } = await params;
  redirect(`/profesor/actividades/${id}/analiticas`);
}
