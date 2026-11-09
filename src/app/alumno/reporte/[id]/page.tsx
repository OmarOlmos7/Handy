import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ReporteAlumno } from "@/components/reporte-alumno";
import { BotonLink, Encabezado } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";

const MATRICULA_DEMO = "A0231";

export default async function ReporteDeAlumno({ params, searchParams }: PageProps<"/alumno/reporte/[id]">) {
  const { id } = await params;
  const { m } = await searchParams;
  const matricula = typeof m === "string" ? m : MATRICULA_DEMO;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const entrega = db.entregas.find((e) => e.actividadId === id && e.matricula === matricula);
  if (!actividad || !entrega || entrega.estado !== "aprobada") notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const alumno = grupo.alumnos.find((a) => a.matricula === matricula);
  if (!alumno) notFound();
  const q = matricula === MATRICULA_DEMO ? "" : `?m=${encodeURIComponent(matricula)}`;
  return (
    <>
      <Encabezado
        migas={[{ texto: "Mis actividades", href: `/alumno${q}` }]}
        titulo="Reporte de retroalimentación"
        subtitulo={actividad.titulo}
        acciones={
          entrega.imagenes?.length ? (
            <BotonLink href={`/api/pdf/${id}/${encodeURIComponent(matricula)}`} target="_blank">
              Descargar PDF
            </BotonLink>
          ) : (
            <BotonImprimir texto="Descargar PDF" />
          )
        }
      />
      <ReporteAlumno actividad={actividad} alumno={alumno} entrega={entrega} grupo={grupo} />
    </>
  );
}
