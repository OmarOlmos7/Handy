import { ConFlujo } from "@/components/flujo-actividad";
import { notFound } from "next/navigation";
import type { Reactivo } from "@/lib/tipos";
import { Hoja } from "@/components/hoja";
import { HojaActividad } from "@/components/hoja-actividad";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { OpcionesSolucion } from "@/components/opciones-solucion";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { srcLogo } from "@/lib/logo";
import { datosProfesor } from "@/lib/sesion";
import { TextoMat } from "@/components/texto-mat";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";
import { versionesCompletas } from "@/lib/versiones";
import { respuestaMat } from "@/lib/notacion";

/** Paso 2 del flujo: preparar la solución (escaneada o con IA) y verla escrita sobre la hoja. */
export default async function Solucion({ params }: PageProps<"/profesor/actividades/[id]/solucion">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const ts = t.profesor.solucion;
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
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={actividad.titulo}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              {ts.hojaQr}
            </BotonLink>
            {conSolucion && <BotonLink href={`/profesor/actividades/${id}/rubrica`}>{ts.siguiente}</BotonLink>}
          </>
        }
      />
      <ConFlujo vista={2} db={db} actividad={actividad}>

      {actividad.sinSolucion ? (
        <Tarjeta className="mx-auto max-w-2xl">
          <h2 className="text-lg font-semibold">{t.profesor.modalidad.sinSolucionTitulo}</h2>
          <p className="mt-2 text-sm text-slate-600">{t.profesor.modalidad.sinSolucionTexto}</p>
          <p className="mt-2 text-sm text-slate-600">{t.profesor.modalidad.sinSolucionCambiar}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <BotonLink href={`/profesor/actividades/${id}/rubrica`}>{ts.siguiente}</BotonLink>
            <BotonLink href={`/profesor/actividades/${id}/editar`} variante="secundario">
              {t.profesor.hoja.modificar}
            </BotonLink>
          </div>
        </Tarjeta>
      ) : !conSolucion ? (
        <Tarjeta className="mx-auto max-w-2xl">
          <h2 className="text-lg font-semibold">{ts.paso2}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {ts.paso2Texto}
          </p>
          <div className="mt-5">{opciones(false)}</div>
          <p className="mt-3 text-xs text-slate-400">{ts.sinCreditos}</p>
        </Tarjeta>
      ) : (
        <div className="space-y-6">
          {/* Cambios a la solución, arriba de todo. */}
          <Tarjeta>
            <p className="mb-3 text-sm font-medium">{ts.rehacer}</p>
            {opciones(true)}
          </Tarjeta>

          {/* Versiones con reactivos por revisar: la segunda resolución no coincidió. */}
          {(actividad.versiones ?? [])
            .filter((v) => v.revisar?.length)
            .map((v) => (
              <div key={v.letra} className="rounded-xl bg-aviso-suave px-4 py-3 text-sm text-slate-800" role="status">
                <p className="font-semibold">{formato(ts.revisarTitulo, { v: v.letra })}</p>
                <ul className="mt-1 list-disc pl-5">
                  {v.revisar!.map((x) => (
                    <li key={x.numero}>{formato(ts.revisarReactivo, { n: x.numero, r: x.otra || "—" })}</li>
                  ))}
                </ul>
              </div>
            ))}

          {/* La solución propuesta, sobre el formato de la hoja que se imprimió. */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              {actividad.solucionIA ? ts.propuestaIA : ts.tuSolucion}
              {actividad.versiones?.length ? ` · ${formato(t.comun.version, { v: "A" })}` : ""}
            </h2>
            {enHoja ? (
              <HojaActividad logo={srcLogo(profesor.config)} actividad={actividad} curso={`${grupo.materia} · ${grupo.nombre}`} solucion version={actividad.versiones?.length ? "A" : undefined} />
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
                        {formato(ts.verPdf, { n: i + 1 })}
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={ruta}
                        src={`/api/archivos/${ruta}`}
                        alt={formato(ts.altPagina, { n: i + 1 })}
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

          {/* Soluciones de las demás versiones (mismo método, otros valores). */}
          {versionesCompletas(actividad)
            .slice(1)
            .map((v) => (
              <section key={v.letra}>
                <h2 className="mb-3 text-lg font-semibold">{formato(ts.solucionVersion, { v: v.letra })}</h2>
                {enHoja ? (
                  <HojaActividad logo={srcLogo(profesor.config)} actividad={v.actividad} curso={`${grupo.materia} · ${grupo.nombre}`} solucion version={v.letra} />
                ) : (
                  <div className="mx-auto max-w-3xl">
                    <SolucionTexto reactivos={v.actividad.reactivos} />
                  </div>
                )}
              </section>
            ))}

          <div className="flex justify-end">
            <BotonLink href={`/profesor/actividades/${id}/rubrica`}>{ts.siguiente}</BotonLink>
          </div>
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
            <p className="mt-1 font-semibold text-acierto">
              <TextoMat texto={respuestaMat(r.respuesta)} negritas="font-semibold" />
            </p>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}
