import { idiomaDeActividad } from "@/lib/i18n/detectar";
import { notFound } from "next/navigation";
import { EditarActividad } from "@/components/editar-actividad";
import { Encabezado } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { aCampoFechaHora } from "@/lib/resultados";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";

/** Modificar una actividad ya creada (se llega con el lápiz de la hoja imprimible). */
export default async function Editar({ params }: PageProps<"/profesor/actividades/[id]/editar">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const te = t.profesor.editarActividad;
  const recibidas = entregasDe(db, id).filter((e) => e.estado !== "sin_entregar").length;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}/hoja` },
        ]}
        titulo={te.titulo}
        subtitulo={te.subtitulo}
      />
      <EditarActividad
        id={id}
        recibidas={recibidas}
        escaneada={actividad.origen === "escaneada" && actividad.reactivos.length > 0}
        inicial={{
          titulo: actividad.titulo,
          fecha: actividad.fechaAplicacion,
          resultadosDesde: aCampoFechaHora(actividad.resultadosDesde),
          escala: actividad.escala === 10 ? 10 : 100,
          sinSolucion: !!actividad.sinSolucion,
          idioma: idiomaDeActividad(actividad),
          estiloCorreccion: actividad.estiloCorreccion === "subrayado" ? "subrayado" : "margen",
          instruccionesAlumno: actividad.origen === "ia" ? (actividad.instruccionesAlumno ?? []) : undefined,
          reactivos: actividad.reactivos.map((r) => ({
            numero: r.numero,
            tipo: r.tipo,
            enunciado: r.enunciado,
            tema: r.tema,
            puntos: r.puntos,
            opciones: r.tipo === "opcion_multiple" ? (r.opciones ?? []) : undefined,
          })),
        }}
      />
    </>
  );
}
