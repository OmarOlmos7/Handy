import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonEstudio } from "@/components/boton-estudio";
import { ReporteAlumno } from "@/components/reporte-alumno";
import { BotonLink, Encabezado } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.revisionPagina.formato };
}

/** El mismo formato de retroalimentación que ve el alumno, desde la cuenta del profesor. */
export default async function Retroalimentacion({ params }: PageProps<"/profesor/actividades/[id]/revision/[matricula]/retroalimentacion">) {
  const { id, matricula: m } = await params;
  const matricula = decodeURIComponent(m);
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const entrega = entregasDe(db, id).find((e) => e.matricula === matricula);
  const alumno = grupo.alumnos.find((a) => a.matricula === matricula);
  if (!entrega || !alumno || entrega.resultados.length === 0) notFound();
  const { t } = await textos();
  const tr = t.profesor.revisionPagina;
  const pdf = `/api/pdf/${id}/${encodeURIComponent(matricula)}`;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
          { texto: alumno.nombre, href: `/profesor/actividades/${id}/revision/${encodeURIComponent(matricula)}` },
        ]}
        titulo={tr.formato}
        subtitulo={formato(tr.asiLoVe, { nombre: alumno.nombre })}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/revision/${encodeURIComponent(matricula)}`} variante="secundario">
              {tr.corregir}
            </BotonLink>
            <BotonLink href={pdf} target="_blank">
              {tr.descargarPdf}
            </BotonLink>
          </>
        }
      />
      <ReporteAlumno
        actividad={actividad}
        alumno={alumno}
        entrega={entrega}
        grupo={grupo}
        accionEstudio={<BotonEstudio actividadId={id} matricula={matricula} hay={Boolean(entrega.estudio)} />}
      />
    </>
  );
}
