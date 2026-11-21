import { notFound, redirect } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { ReporteAlumno } from "@/components/reporte-alumno";
import { IconoGrafica } from "@/components/iconos";
import { calificada } from "@/lib/estadisticas";
import { conPuntaje } from "@/lib/modalidad";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, leer } from "@/lib/almacen";
import { textos } from "@/lib/i18n/servidor";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export default async function ReporteDeAlumno({ params }: PageProps<"/alumno/reporte/[id]">) {
  const { id } = await params;
  const { t, locale } = await textos();
  const tr = t.alumno.reporte;
  const sesion = await alumnoActual();
  if (!sesion) redirect("/alumno");
  const db = await leer();
  const actividad = actividadDe(db, id);
  // Solo sus propias actividades: la del curso donde está inscrito con su correo.
  const curso = actividad && sesion.cursos.find((c) => c.grupo.id === actividad.grupoId);
  if (!actividad || !curso) notFound();
  const { grupo, alumno } = curso;
  const migas = [
    { texto: t.alumno.panel.titulo, href: "/alumno" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
  ];
  const matricula = alumno.matricula;
  const entrega = db.entregas.find((e) => e.actividadId === id && e.matricula === matricula);
  if (!entrega || entrega.estado !== "aprobada") notFound();
  if (!resultadosDisponibles(actividad)) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={tr.titulo} subtitulo={actividad.titulo} />
        <Tarjeta className="text-sm text-slate-700">
          {tr.noDisponibleAntes} <strong>{fechaHoraLarga(actividad.resultadosDesde!, locale)}</strong> {tr.noDisponibleDespues}
        </Tarjeta>
      </>
    );
  }
  return (
    <>
      <Encabezado
        migas={migas}
        titulo={tr.titulo}
        subtitulo={actividad.titulo}
        acciones={
          <>
            {conPuntaje(actividad) && calificada(entrega) && (
              <BotonLink variante="secundario" href={`/alumno/reporte/${id}/analiticas`}>
                <IconoGrafica /> {t.alumno.analiticas.boton}
              </BotonLink>
            )}
            {entrega.imagenes?.length || entrega.pdf ? (
              <BotonLink href={`/api/pdf/${id}/${encodeURIComponent(matricula)}`} target="_blank">
                {tr.descargarPdf}
              </BotonLink>
            ) : (
              <BotonImprimir texto={tr.descargarPdf} />
            )}
          </>
        }
      />
      <ReporteAlumno actividad={actividad} alumno={alumno} entrega={entrega} grupo={grupo} />
    </>
  );
}
