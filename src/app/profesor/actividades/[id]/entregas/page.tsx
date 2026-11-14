import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoActualizar } from "@/components/auto-actualizar";
import { BorrarEntrega } from "@/components/borrar-entrega";
import { ConFlujo } from "@/components/flujo-actividad";
import { QrEntregas } from "@/components/qr-entregas";
import { BotonLink, Encabezado, Insignia, Tarjeta, fechaLarga } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { evaluandoAhora } from "@/lib/evaluacion";
import { qrDataUrl, urlBase } from "@/lib/qr";
import { fechaHoraLarga } from "@/lib/resultados";
import { datosProfesor } from "@/lib/sesion";

/** Paso 4 del flujo: quién ya entregó, el QR para entregar (proyectable) y las acciones sobre cada entrega. */
export default async function Entregas({ params }: PageProps<"/profesor/actividades/[id]/entregas">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const entregas = entregasDe(db, id);
  const recibidas = entregas.filter((e) => e.estado !== "sin_entregar");
  const paginas = recibidas.reduce((s, e) => s + (e.paginasRecibidas || 0), 0);
  const evaluando = entregas.some((e) => e.estado === "entregada" && evaluandoAhora(e.evaluandoDesde));
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
        subtitulo={`Aplicada ${fechaLarga(actividad.fechaAplicacion)}`}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              Hoja imprimible con QR
            </BotonLink>
            <BotonLink href={`/profesor/actividades/${id}`}>Siguiente: evaluación</BotonLink>
          </>
        }
      />
      <ConFlujo vista={4} db={db} actividad={actividad}>
        <AutoActualizar activo={evaluando} />
        {!actividad.rubricaConfirmada && (
          <p className="mb-4 rounded-lg bg-aviso-suave px-4 py-2.5 text-sm text-slate-800">
            Los alumnos ya pueden entregar. Las entregas se evaluarán solas en cuanto confirmes la{" "}
            <Link href={`/profesor/actividades/${id}/rubrica`} className="font-medium text-tinta-700 underline">
              rúbrica
            </Link>
            .
          </p>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)]">
          <Tarjeta>
            <p className="text-sm text-slate-500">Entregas recibidas</p>
            <p className="mt-1 text-2xl font-semibold">
              {recibidas.length} <span className="text-base font-normal text-slate-400">de {entregas.length}</span>
            </p>
            <p className="text-xs text-slate-500">{paginas} páginas en total</p>
          </Tarjeta>
          <Tarjeta>
            <p className="text-sm text-slate-500">Faltan por entregar</p>
            <p className={`mt-1 text-2xl font-semibold ${entregas.length - recibidas.length ? "text-aviso" : "text-acierto"}`}>
              {entregas.length - recibidas.length}
            </p>
          </Tarjeta>
          <QrEntregas qr={qr} enlace={enlace} titulo={actividad.titulo} />
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium">Matrícula</th>
                <th className="px-4 py-3 font-medium">Entrega</th>
                <th className="px-4 py-3 font-medium">Páginas</th>
                <th className="px-4 py-3 font-medium">Recibida</th>
                <th className="px-4 py-3" />
                <th className="w-12 px-2 py-3">
                  <span className="sr-only">Borrar entrega</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entregas.map((e) => {
                const entrego = e.estado !== "sin_entregar";
                return (
                  <tr key={e.matricula} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{nombre(e.matricula)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.matricula}</td>
                    <td className="px-4 py-3">{entrego ? <Insignia tono="verde">Entregó</Insignia> : <Insignia>Sin entregar</Insignia>}</td>
                    <td className="px-4 py-3 text-slate-600">{e.paginasRecibidas || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.entregadaEn ? fechaHoraLarga(e.entregadaEn) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {e.resultados.length === 0 && (
                        <Link
                          href={`/entregar/${id}?m=${encodeURIComponent(e.matricula)}&n=${encodeURIComponent(nombre(e.matricula))}`}
                          className="text-xs text-tinta-700 hover:underline"
                        >
                          {entrego ? "Reemplazar hojas" : "Subir sus hojas"}
                        </Link>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {entrego && <BorrarEntrega actividadId={id} matricula={e.matricula} nombre={nombre(e.matricula)} />}
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
