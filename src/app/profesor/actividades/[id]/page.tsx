import { IconoGrafica } from "@/components/iconos";
import { ConFlujo } from "@/components/flujo-actividad";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AprobarTodo } from "@/components/aprobar-todo";
import { AutoActualizar } from "@/components/auto-actualizar";
import { EvaluarTodo } from "@/components/evaluar-todo";
import { PestanasActividad } from "@/components/pestanas-actividad";
import {
  BotonLink,
  Encabezado,
  Insignia,
  InsigniaActividad,
  InsigniaEntrega,
  Tarjeta,
  colorCalificacion,
  fechaLarga,
} from "@/components/ui";
import { actividadDe, entregasDe, estadoActividad, grupoDe } from "@/lib/almacen";
import { evaluandoAhora } from "@/lib/evaluacion";
import { datosProfesor } from "@/lib/sesion";
import { calificacion, calificada, escalaDe, formatoCal } from "@/lib/estadisticas";
import { qrDataUrl, urlBase } from "@/lib/qr";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";

export default async function EntregasActividad({ params }: PageProps<"/profesor/actividades/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const entregas = entregasDe(db, id);
  const recibidas = entregas.filter((e) => e.estado !== "sin_entregar");
  const porAprobar = entregas.filter((e) => e.estado === "evaluada");
  const evaluando = entregas.filter((e) => e.estado === "entregada" && evaluandoAhora(e.evaluandoDesde));
  // Las entregas se evalúan solas; el botón queda para reintentar las que fallaron.
  const porEvaluar = entregas.filter((e) => e.estado === "entregada" && e.imagenes?.length && !evaluandoAhora(e.evaluandoDesde));
  const bajaConfianza = entregas.reduce((s, e) => s + e.resultados.filter((r) => r.confianza === "baja").length, 0);
  const enlace = `${await urlBase()}/entregar/${id}`;
  const qr = await qrDataUrl(enlace);
  const nombre = (m: string) => grupo.alumnos.find((a) => a.matricula === m)?.nombre ?? m;

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={actividad.titulo}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            Aplicada {fechaLarga(actividad.fechaAplicacion)}
            <InsigniaActividad estado={estadoActividad(db, actividad)} />
            {actividad.resultadosDesde && (
              <Insignia tono={resultadosDisponibles(actividad) ? "verde" : "ambar"}>
                Resultados visibles desde {fechaHoraLarga(actividad.resultadosDesde)}
              </Insignia>
            )}
          </span>
        }
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/analiticas`} variante="secundario">
              <IconoGrafica /> Analíticas Actividad
            </BotonLink>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              Hoja imprimible con QR
            </BotonLink>
            {porAprobar.length > 0 && <AprobarTodo actividadId={id} pendientes={porAprobar.length} />}
            {actividad.rubricaConfirmada && (
              <EvaluarTodo
                actividadId={id}
                pendientes={porEvaluar.map((e) => ({ matricula: e.matricula, nombre: nombre(e.matricula) }))}
              />
            )}
          </>
        }
      />
      <ConFlujo vista={4} db={db} actividad={actividad}>
      <PestanasActividad id={id} activa="entregas" />
      <AutoActualizar activo={evaluando.length > 0} />

      {actividad.rubricaConfirmada && (
        <p className="mb-4 rounded-lg bg-tinta-50 px-4 py-2.5 text-sm text-tinta-900">
          {evaluando.length > 0
            ? `La IA está evaluando ${evaluando.length} entrega${evaluando.length > 1 ? "s" : ""}. Esta página se actualiza sola.`
            : "Evaluación automática activada: cada entrega se califica con IA en cuanto el alumno envía sus fotos."}
        </p>
      )}

      {!actividad.rubricaConfirmada && (
        <Tarjeta className="mb-6 border-l-4 border-aviso">
          <p className="font-medium">{actividad.reactivos.some((r) => r.respuesta.trim()) ? "Confirma la rúbrica" : "Falta la solución"}</p>
          <p className="mt-1 text-sm text-slate-600">
            {actividad.reactivos.some((r) => r.respuesta.trim())
              ? "La IA ya propuso la rúbrica. Revísala y confírmala: las entregas que ya llegaron se evaluarán solas."
              : "Escanea tu solución o genérala con IA para preparar la rúbrica. Mientras tanto, los alumnos ya pueden entregar."}
          </p>
          <BotonLink href={`/profesor/actividades/${id}/rubrica`} className="mt-3">
            {actividad.reactivos.some((r) => r.respuesta.trim()) ? "Revisar rúbrica" : "Preparar solución"}
          </BotonLink>
        </Tarjeta>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
        <Tarjeta>
          <p className="text-sm text-slate-500">Entregas recibidas</p>
          <p className="mt-1 text-2xl font-semibold">
            {recibidas.length} <span className="text-base font-normal text-slate-400">de {entregas.length}</span>
          </p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Por revisar y aprobar</p>
          <p className="mt-1 text-2xl font-semibold">{porAprobar.length}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Baja confianza</p>
          <p className={`mt-1 text-2xl font-semibold ${bajaConfianza ? "text-aviso" : ""}`}>{bajaConfianza}</p>
          {bajaConfianza > 0 && <p className="text-xs text-slate-500">Reactivos que la IA no leyó bien.</p>}
        </Tarjeta>
        <Tarjeta className="flex min-w-0 items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR para entregar" className="h-24 w-24 shrink-0" />
          <div className="min-w-0 text-sm">
            <p className="font-medium">Entregas desde el celular</p>
            <p className="text-slate-500">Los alumnos escanean este código o abren el enlace:</p>
            <a href={enlace} target="_blank" className="block truncate text-tinta-700 hover:underline">
              {enlace}
            </a>
          </div>
        </Tarjeta>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Páginas</th>
              <th className="px-4 py-3 font-medium">Calificación</th>
              <th className="px-4 py-3 font-medium">Revisar</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entregas.map((e) => {
              const cal = calificacion(actividad, e);
              const baja = e.resultados.filter((r) => r.confianza === "baja").length;
              const evaluada = calificada(e);
              return (
                <tr key={e.matricula} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{nombre(e.matricula)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.matricula}</td>
                  <td className="px-4 py-3">
                    {e.estado === "entregada" && evaluandoAhora(e.evaluandoDesde) ? (
                      <Insignia tono="azul">Evaluando con IA…</Insignia>
                    ) : (
                      <InsigniaEntrega estado={e.estado} />
                    )}
                    {e.error && <p className="mt-1 max-w-48 text-xs text-error">{e.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.paginasRecibidas || "—"}</td>
                  <td className={`px-4 py-3 font-semibold ${evaluada ? colorCalificacion(cal, escalaDe(actividad)) : "text-slate-400"}`}>
                    {evaluada ? `${formatoCal(cal, escalaDe(actividad))} / ${escalaDe(actividad)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {baja > 0 ? <Insignia tono="ambar">{baja} con baja confianza</Insignia> : evaluada ? <span className="text-slate-400">—</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {e.resultados.length > 0 ? (
                      <Link href={`/profesor/actividades/${id}/revision/${e.matricula}`} className="font-medium text-tinta-700 hover:underline">
                        {e.estado === "aprobada" ? "Ver" : "Revisar"}
                      </Link>
                    ) : (
                      <Link href={`/entregar/${id}?m=${encodeURIComponent(e.matricula)}&n=${encodeURIComponent(nombre(e.matricula))}`} className="text-xs text-tinta-700 hover:underline">
                        {e.estado === "sin_entregar" ? "Subir sus hojas" : "Reemplazar hojas"}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </ConFlujo>
    </>
  );
}
