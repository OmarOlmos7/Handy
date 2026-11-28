import { asignaturaDelCurso } from "@/lib/asignaturas";
import { idiomaDeActividad } from "@/lib/i18n/detectar";
import { notFound } from "next/navigation";
import { EditarActividad } from "@/components/editar-actividad";
import { Encabezado } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { aCampoFechaHora } from "@/lib/resultados";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { configuracionDe, ESCALA, indiceEscala } from "@/lib/configuracion";
import { etiquetasPorGrupo } from "@/lib/etiquetas";
import { esPlataforma } from "@/lib/plataforma";
import { formato } from "@/lib/i18n/idiomas";

/**
 * Reeditar una actividad ya creada con las opciones de su alta (se llega con "Editar actividad" en
 * la hoja o con "Reeditar actividad" en el renglón del curso).
 */
export default async function Editar({ params }: PageProps<"/profesor/actividades/[id]/editar">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const te = t.profesor.editarActividad;
  const recibidas = entregasDe(db, id).filter((e) => e.estado !== "sin_entregar").length;
  const tn = t.profesor.nuevaActividad;
  const tiposSugeridos = [...(etiquetasPorGrupo(db.grupos, db.actividades)[grupo.id] ?? []), ...t.profesor.etiquetas.sugeridas].filter(
    (e, i, xs) => xs.findIndex((x) => x.toLowerCase() === e.toLowerCase()) === i,
  );
  const precision = ESCALA[indiceEscala(actividad.precision)].precision;
  const noCambia = formato(te.noCambia, {
    formato: esPlataforma(actividad) ? tn.enPlataforma : tn.manuscrita,
    curso: `${grupo.materia} · ${grupo.nombre}`,
  });
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
        escaneada={actividad.origen === "escaneada" && actividad.reactivos.length > 0 && recibidas === 0}
        tiposSugeridos={tiposSugeridos}
        asignaturas={(db.asignaturas ?? []).map((a) => ({ id: a.id, nombre: a.nombre, unidades: a.unidades }))}
        materia={grupo.materia}
        asignaturaCurso={asignaturaDelCurso(db, grupo)?.id ?? ""}
        esfuerzos={configuracionDe(profesor.config).esfuerzos}
        noCambia={noCambia}
        inicial={{
          titulo: actividad.titulo,
          fecha: actividad.fechaAplicacion,
          visibleDesde: aCampoFechaHora(actividad.visibleDesde),
          envioDesde: aCampoFechaHora(actividad.envioDesde),
          envioHasta: aCampoFechaHora(actividad.envioHasta),
          resultadosDesde: aCampoFechaHora(actividad.resultadosDesde),
          escala: actividad.escala === 10 ? 10 : 100,
          sinPuntaje: !!actividad.sinPuntaje,
          sinSolucion: !!actividad.sinSolucion,
          idioma: idiomaDeActividad(actividad),
          estiloCorreccion: actividad.estiloCorreccion === "subrayado" ? "subrayado" : "margen",
          instruccionesAlumno: actividad.origen === "ia" ? (actividad.instruccionesAlumno ?? []) : undefined,
          etiqueta: actividad.etiqueta ?? "",
          temario: actividad.temario,
          motor: precision.motor,
          esfuerzo: precision.esfuerzo,
          reactivos: actividad.reactivos.map((r) => ({
            numero: r.numero,
            tipo: r.tipo,
            enunciado: r.enunciado,
            tema: r.tema,
            puntos: r.puntos,
            opciones: ["opcion_multiple", "seleccion_multiple", "orden"].includes(r.tipo) ? (r.opciones ?? []) : undefined,
          })),
        }}
      />
    </>
  );
}
