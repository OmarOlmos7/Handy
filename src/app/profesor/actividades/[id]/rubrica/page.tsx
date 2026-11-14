import { IconoGrafica } from "@/components/iconos";
import { ConFlujo } from "@/components/flujo-actividad";
import { notFound } from "next/navigation";
import type { Reactivo } from "@/lib/tipos";
import { Hoja } from "@/components/hoja";
import { HojaActividad } from "@/components/hoja-actividad";
import { PestanasActividad } from "@/components/pestanas-actividad";
import { RubricaEditor } from "@/components/rubrica-editor";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { PropuestaEvaluacion } from "@/components/propuesta-evaluacion";
import { OpcionesSolucion } from "@/components/opciones-solucion";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { TextoMat } from "@/components/texto-mat";

export default async function Rubrica({
  params,
}: PageProps<"/profesor/actividades/[id]/rubrica">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  // La rúbrica existe cuando los reactivos ya tienen respuesta (los generados en el paso 1 llegan sin ella).
  const conSolucion = actividad.reactivos.some((r) => r.respuesta.trim());
  // La solución de la IA se muestra escrita sobre la misma hoja que se imprimió (actividades generadas con IA).
  const enHoja = Boolean(actividad.solucionIA && actividad.origen === "ia");
  const puedeGenerar = actividad.reactivos.length > 0 || Boolean(actividad.archivos?.length);
  const opciones = (reemplazar: boolean) => (
    <OpcionesSolucion
      actividadId={id}
      puedeGenerar={puedeGenerar}
      reemplazar={reemplazar}
      instruccionesIniciales={actividad.instrucciones ?? ""}
      condicionesIniciales={actividad.condicionesSolucion ?? ""}
    />
  );

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={actividad.titulo}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/analiticas`} variante="secundario">
              <IconoGrafica /> Analíticas Actividad
            </BotonLink>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              Hoja imprimible con QR
            </BotonLink>
          </>
        }
      />
      <ConFlujo vista={actividad.reactivos.some((r) => r.respuesta.trim()) ? 3 : 2} db={db} actividad={actividad}>
      <PestanasActividad id={id} activa="rubrica" />

      {!conSolucion ? (
        <Tarjeta className="mx-auto max-w-2xl">
          <h2 className="text-lg font-semibold">Paso 2 · Prepara la solución</h2>
          <p className="mt-2 text-sm text-slate-600">
            Elige cómo: sube fotos o un PDF de la actividad resuelta por ti, o deja que Claude la resuelva con las condiciones
            que indiques. Con la solución se arma la rúbrica, que después revisas y confirmas.
          </p>
          <div className="mt-5">{opciones(false)}</div>
          <p className="mt-3 text-xs text-slate-400">Preparar la solución y la rúbrica no consume créditos.</p>
        </Tarjeta>
      ) : (
        <div className="space-y-6">
          {/* 1. Cambios a la solución, arriba de todo. */}
          <Tarjeta>
            <p className="mb-3 text-sm font-medium">¿Quieres rehacer la solución o cambiar los criterios?</p>
            {opciones(true)}
          </Tarjeta>

          {/* 2. La solución propuesta, sobre el formato de la hoja que se imprimió. */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">{actividad.solucionIA ? "Solución propuesta por la IA" : "Tu solución"}</h2>
            {enHoja ? (
              <HojaActividad actividad={actividad} curso={`${grupo.materia} · ${grupo.nombre}`} solucion />
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {actividad.solucionIA ? (
                  <SolucionTexto reactivos={actividad.reactivos} />
                ) : actividad.solucion?.length ? (
                  actividad.solucion.map((ruta, i) =>
                    ruta.endsWith(".pdf") ? (
                      <a
                        key={ruta}
                        href={`/api/archivos/${ruta}`}
                        target="_blank"
                        className="block rounded-lg border border-slate-200 bg-white p-4 text-sm text-tinta-700 underline"
                      >
                        Ver PDF de la solución ({i + 1})
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={ruta}
                        src={`/api/archivos/${ruta}`}
                        alt={`Solución, página ${i + 1}`}
                        className="w-full rounded-md shadow-md ring-1 ring-slate-200"
                      />
                    ),
                  )
                ) : (
                  Array.from({ length: actividad.paginas }, (_, i) => (
                    <Hoja key={i} actividad={actividad} pagina={i + 1} modo="solucion" grupoTexto={`${grupo.materia} · ${grupo.nombre}`} />
                  ))
                )}
              </div>
            )}
          </section>

          {/* 3. La propuesta de rúbrica. */}
          <section className="space-y-6">
            <PropuestaEvaluacion actividad={actividad} />
            <RubricaEditor actividadId={id} reactivosIniciales={actividad.reactivos} confirmadaInicial={!!actividad.rubricaConfirmada} />
          </section>
        </div>
      )}
      </ConFlujo>
    </>
  );
}

/** Solución que generó la IA, reactivo por reactivo, para que el profesor la revise. */
function SolucionTexto({ reactivos }: { reactivos: Reactivo[] }) {
  return (
    <Tarjeta>
      <ol className="space-y-3 text-sm">
        {reactivos.map((r) => (
          <li key={r.numero}>
            <p className="font-medium text-slate-900">
              {r.numero}. <TextoMat texto={r.enunciado} />
            </p>
            {r.solucionPasos?.length ? (
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-600">
                {r.solucionPasos.map((p, i) => (
                  <li key={i}>
                    <TextoMat texto={p} />
                  </li>
                ))}
              </ol>
            ) : null}
            <p className="mt-1 font-semibold text-acierto">{r.respuesta}</p>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}
