import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ReporteAlumno } from "@/components/reporte-alumno";
import { Encabezado } from "@/components/ui";
import { actividades, obtenerActividad, obtenerAlumno, obtenerEntrega, obtenerGrupo } from "@/lib/datos-ejemplo";

const MATRICULA_DEMO = "A0231";

export function generateStaticParams() {
  return actividades
    .filter((a) => obtenerEntrega(a.id, MATRICULA_DEMO)?.estado === "aprobada")
    .map((a) => ({ id: a.id }));
}

export default async function ReporteDeAlumno({ params }: PageProps<"/alumno/reporte/[id]">) {
  const { id } = await params;
  const actividad = obtenerActividad(id);
  const entrega = obtenerEntrega(id, MATRICULA_DEMO);
  if (!actividad || !entrega || entrega.estado !== "aprobada") notFound();
  const grupo = obtenerGrupo(actividad.grupoId)!;
  const alumno = obtenerAlumno(MATRICULA_DEMO)!;
  return (
    <>
      <Encabezado
        migas={[{ texto: "Mis actividades", href: "/alumno" }]}
        titulo="Reporte de retroalimentación"
        subtitulo={actividad.titulo}
        acciones={<BotonImprimir texto="Descargar PDF" />}
      />
      <ReporteAlumno actividad={actividad} alumno={alumno} entrega={entrega} grupo={grupo} />
    </>
  );
}
