import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoActualizar } from "@/components/auto-actualizar";
import { BorrarEntrega } from "@/components/borrar-entrega";
import { ConFlujo } from "@/components/flujo-actividad";
import { QrEntregas } from "@/components/qr-entregas";
import { RecepcionEntregas } from "@/components/recepcion-entregas";
import { BotonLink, Encabezado, Insignia, Tarjeta, fechaLarga } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { evaluandoAhora } from "@/lib/evaluacion";
import { qrDataUrl, urlBase } from "@/lib/qr";
import { fechaHoraLarga } from "@/lib/resultados";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

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
  const { t, locale } = await textos();
  const tc = t.profesor.comun;
  const te = t.profesor.entregas;
  const nombre = (m: string) => grupo.alumnos.find((a) => a.matricula === m)?.nombre ?? m;

  return (
    <>
      <Encabezado
        migas={[
          { texto: tc.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={actividad.titulo}
        subtitulo={formato(tc.aplicada, { f: fechaLarga(actividad.fechaAplicacion, locale) })}
        acciones={
          <>
            <BotonLink href={`/profesor/actividades/${id}/hoja`} variante="secundario">
              {tc.hojaQr}
            </BotonLink>
            {entregas.some((e) => e.resultados.length > 0 && (e.imagenes?.length || e.pdf)) && (
              <a
                href={`/api/pdf/${id}/grupo`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                {tc.descargarPdfGrupo}
              </a>
            )}
            <BotonLink href={`/profesor/actividades/${id}`}>{te.siguiente}</BotonLink>
          </>
        }
      />
      <ConFlujo vista={4} db={db} actividad={actividad}>
        <AutoActualizar activo={evaluando} />
        {!actividad.rubricaConfirmada && (
          <p className="mb-4 rounded-lg bg-aviso-suave px-4 py-2.5 text-sm text-slate-800">
            {te.yaPuedenAntes}
            <Link href={`/profesor/actividades/${id}/rubrica`} className="font-medium text-tinta-700 underline">
              {te.rubrica}
            </Link>
            {te.yaPuedenDespues}
          </p>
        )}

        <RecepcionEntregas actividadId={id} suspendidas={Boolean(actividad.entregasSuspendidas)} />

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)]">
          <Tarjeta>
            <p className="text-sm text-slate-500">{te.recibidas}</p>
            <p className="mt-1 text-2xl font-semibold">
              {recibidas.length} <span className="text-base font-normal text-slate-400">{formato(te.deTotal, { n: entregas.length })}</span>
            </p>
            <p className="text-xs text-slate-500">{formato(te.paginasTotal, { n: paginas })}</p>
          </Tarjeta>
          <Tarjeta>
            <p className="text-sm text-slate-500">{te.faltan}</p>
            <p className={`mt-1 text-2xl font-semibold ${entregas.length - recibidas.length ? "text-aviso" : "text-acierto"}`}>
              {entregas.length - recibidas.length}
            </p>
          </Tarjeta>
          <QrEntregas qr={qr} enlace={enlace} titulo={actividad.titulo} suspendidas={Boolean(actividad.entregasSuspendidas)} />
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{tc.alumno}</th>
                <th className="px-4 py-3 font-medium">{tc.matricula}</th>
                <th className="px-4 py-3 font-medium">{te.entrega}</th>
                <th className="px-4 py-3 font-medium">{tc.paginas}</th>
                <th className="px-4 py-3 font-medium">{te.recibida}</th>
                <th className="px-4 py-3" />
                <th className="w-12 px-2 py-3">
                  <span className="sr-only">{tc.borrarEntrega}</span>
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
                    <td className="px-4 py-3">{entrego ? <Insignia tono="verde">{te.entrego}</Insignia> : <Insignia>{t.profesor.estados.entrega.sin_entregar}</Insignia>}</td>
                    <td className="px-4 py-3 text-slate-600">{e.paginasRecibidas || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.entregadaEn ? fechaHoraLarga(e.entregadaEn, locale) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {e.resultados.length > 0 && (e.imagenes?.length || e.pdf) && (
                        <a
                          href={`/api/pdf/${id}/${encodeURIComponent(e.matricula)}`}
                          target="_blank"
                          className="text-xs text-tinta-700 hover:underline"
                        >
                          {tc.descargarPdf}
                        </a>
                      )}
                      {e.resultados.length === 0 && (
                        <Link
                          href={`/entregar/${id}?m=${encodeURIComponent(e.matricula)}&n=${encodeURIComponent(nombre(e.matricula))}`}
                          className="text-xs text-tinta-700 hover:underline"
                        >
                          {entrego ? tc.reemplazarHojas : tc.subirHojas}
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
