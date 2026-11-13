import { notFound, redirect } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ReporteAlumno } from "@/components/reporte-alumno";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, leer } from "@/lib/almacen";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export default async function ReporteDeAlumno({ params }: PageProps<"/alumno/reporte/[id]">) {
  const { id } = await params;
  const sesion = await alumnoActual();
  if (!sesion) redirect("/alumno");
  const db = await leer();
  const actividad = actividadDe(db, id);
  // Solo sus propias actividades: la del curso donde está inscrito con su correo.
  const curso = actividad && sesion.cursos.find((c) => c.grupo.id === actividad.grupoId);
  if (!actividad || !curso) notFound();
  const { grupo, alumno } = curso;
  const matricula = alumno.matricula;
  const entrega = db.entregas.find((e) => e.actividadId === id && e.matricula === matricula);
  if (!entrega || entrega.estado !== "aprobada") notFound();
  if (!resultadosDisponibles(actividad)) {
    return (
      <>
        <Encabezado migas={[{ texto: "Mis actividades", href: "/alumno" }]} titulo="Reporte de retroalimentación" subtitulo={actividad.titulo} />
        <Tarjeta className="text-sm text-slate-700">
          Tus resultados todavía no están disponibles. Fecha de visualización de resultados:{" "}
          <strong>{fechaHoraLarga(actividad.resultadosDesde!)}</strong> (hora del centro de México).
        </Tarjeta>
      </>
    );
  }
  return (
    <>
      <Encabezado
        migas={[{ texto: "Mis actividades", href: "/alumno" }]}
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
