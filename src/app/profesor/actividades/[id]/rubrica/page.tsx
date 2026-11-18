import { notFound } from "next/navigation";
import { ConFlujo } from "@/components/flujo-actividad";
import { PropuestaEvaluacion } from "@/components/propuesta-evaluacion";
import { RubricaEditor } from "@/components/rubrica-editor";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";

/** Paso 3 del flujo: la propuesta de evaluación y la rúbrica, para revisarla y confirmarla. */
export default async function Rubrica({ params }: PageProps<"/profesor/actividades/[id]/rubrica">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const tr = t.profesor.rubrica;
  // La rúbrica existe cuando los reactivos ya tienen respuesta (los generados en el paso 1 llegan sin ella).
  const conSolucion = actividad.reactivos.some((r) => r.respuesta.trim());

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={actividad.titulo}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/solucion`} variante="secundario">
              {tr.verSolucion}
            </BotonLink>
            {actividad.rubricaConfirmada && <BotonLink href={`/profesor/actividades/${id}/entregas`}>{tr.siguiente}</BotonLink>}
          </>
        }
      />
      <ConFlujo vista={3} db={db} actividad={actividad}>
        {!conSolucion ? (
          <Tarjeta className="mx-auto max-w-2xl">
            <h2 className="text-lg font-semibold">{tr.primero}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {tr.primeroTexto}
            </p>
            <BotonLink href={`/profesor/actividades/${id}/solucion`} className="mt-4">
              {tr.irSolucion}
            </BotonLink>
          </Tarjeta>
        ) : (
          <div className="space-y-6">
            <PropuestaEvaluacion actividad={actividad} />
            <RubricaEditor actividadId={id} reactivosIniciales={actividad.reactivos} confirmadaInicial={!!actividad.rubricaConfirmada} />
          </div>
        )}
      </ConFlujo>
    </>
  );
}
