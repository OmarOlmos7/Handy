import { notFound } from "next/navigation";
import Link from "next/link";
import { AprobarTodo } from "@/components/aprobar-todo";
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
import { actividades, entregasDeActividad, obtenerActividad, obtenerGrupo } from "@/lib/datos-ejemplo";
import { calificacion } from "@/lib/estadisticas";

export function generateStaticParams() {
  return actividades.map((a) => ({ id: a.id }));
}

export default async function EntregasActividad({ params }: PageProps<"/profesor/actividades/[id]">) {
  const { id } = await params;
  const actividad = obtenerActividad(id);
  if (!actividad) notFound();
  const grupo = obtenerGrupo(actividad.grupoId)!;
  const entregas = entregasDeActividad(id);
  const recibidas = entregas.filter((e) => e.estado !== "sin_entregar");
  const porAprobar = entregas.filter((e) => e.estado === "evaluada");
  const bajaConfianza = entregas.reduce(
    (s, e) => s + e.resultados.filter((r) => r.confianza === "baja").length,
    0,
  );

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: "/profesor" },
        ]}
        titulo={actividad.titulo}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            Aplicada {fechaLarga(actividad.fechaAplicacion)} · {actividad.paginas} páginas por alumno
            <InsigniaActividad estado={actividad.estado} />
          </span>
        }
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              Hoja imprimible con QR
            </BotonLink>
            {porAprobar.length > 0 && (
              <AprobarTodo pendientes={porAprobar.length} paginas={actividad.paginas} />
            )}
          </>
        }
      />
      <PestanasActividad id={id} activa="entregas" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
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
          <p className="text-sm text-slate-500">Reactivos con baja confianza</p>
          <p className={`mt-1 text-2xl font-semibold ${bajaConfianza ? "text-aviso" : ""}`}>{bajaConfianza}</p>
          {bajaConfianza > 0 && <p className="text-xs text-slate-500">Revísalos primero: la IA no pudo leerlos bien.</p>}
        </Tarjeta>
      </div>

      {actividad.reactivos.length === 0 && (
        <Tarjeta className="mb-6 border-l-4 border-aviso">
          <p className="font-medium">Falta tu solución</p>
          <p className="mt-1 text-sm text-slate-600">
            Escanea la actividad resuelta por ti para que la IA prepare la rúbrica. Mientras tanto, los alumnos ya
            pueden subir sus hojas.
          </p>
          <BotonLink href={`/profesor/actividades/${id}/rubrica`} className="mt-3">
            Subir solución
          </BotonLink>
        </Tarjeta>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Páginas</th>
              <th className="px-4 py-3 font-medium">Calificación sugerida</th>
              <th className="px-4 py-3 font-medium">Revisar</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entregas.map((e) => {
              const alumno = grupo.alumnos.find((a) => a.matricula === e.matricula)!;
              const cal = calificacion(actividad, e);
              const baja = e.resultados.filter((r) => r.confianza === "baja").length;
              const evaluada = e.resultados.length > 0;
              return (
                <tr key={e.matricula} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{alumno.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{alumno.matricula}</td>
                  <td className="px-4 py-3">
                    <InsigniaEntrega estado={e.estado} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.paginasRecibidas}/{actividad.paginas}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${evaluada ? colorCalificacion(cal) : "text-slate-400"}`}>
                    {evaluada ? cal.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {baja > 0 ? <Insignia tono="ambar">{baja} con baja confianza</Insignia> : evaluada ? <span className="text-slate-400">—</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {evaluada ? (
                      <Link
                        href={`/profesor/actividades/${id}/revision/${e.matricula}`}
                        className="font-medium text-tinta-700 hover:underline"
                      >
                        {e.estado === "aprobada" ? "Ver" : "Revisar"}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Recordar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
