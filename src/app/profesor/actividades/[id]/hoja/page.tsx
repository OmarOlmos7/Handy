import { ConFlujo } from "@/components/flujo-actividad";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconoLapiz } from "@/components/iconos";
import { BotonImprimir } from "@/components/boton-imprimir";
import { EditarHoja } from "@/components/editar-hoja";
import { Hoja } from "@/components/hoja";
import { HojaActividad } from "@/components/hoja-actividad";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { qrDataUrl, urlBase } from "@/lib/qr";
import { textos } from "@/lib/i18n/servidor";

export default async function HojaImprimible({ params }: PageProps<"/profesor/actividades/[id]/hoja">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const th = t.profesor.hoja;
  const curso = `${grupo.materia} · ${grupo.nombre}`;
  const qr = await qrDataUrl(`${await urlBase()}/entregar/${id}`);
  const siguiente = actividad.sinSolucion ? (
    <BotonLink href={`/profesor/actividades/${id}/rubrica`} variante="secundario">
      {th.irRubrica}
    </BotonLink>
  ) : actividad.reactivos.some((r) => r.respuesta.trim()) ? null : (
    <BotonLink href={`/profesor/actividades/${id}/solucion`} variante="secundario">
      {th.siguiente}
    </BotonLink>
  );
  const editar = (
    <Link
      href={`/profesor/actividades/${id}/editar`}
      title={th.modificar}
      aria-label={th.modificar}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-300 transition hover:bg-tinta-50 hover:text-tinta-700"
    >
      <IconoLapiz />
    </Link>
  );
  const migas = [
    { texto: t.profesor.comun.panel, href: "/profesor" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
    { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
  ];

  if (actividad.origen === "escaneada") {
    return (
      <>
        <Encabezado
          migas={migas}
          titulo={th.titulo}
          subtitulo={th.escaneadaTexto}
          acciones={
            <>
              <BotonLink href={`/api/hoja/${id}`} target="_blank">
                {th.descargar}
              </BotonLink>
              {editar}
              {siguiente}
            </>
          }
        />
        <ConFlujo vista={1} db={db} actividad={actividad}>
          <Tarjeta className="mx-auto max-w-3xl p-2">
            <iframe src={`/api/hoja/${id}`} title={th.titulo} className="h-[80vh] w-full rounded-lg" />
          </Tarjeta>
        </ConFlujo>
      </>
    );
  }

  return (
    <>
      <div className="no-imprimir">
      <Encabezado
        migas={migas}
        titulo={th.titulo}
        subtitulo={th.texto}
        acciones={
          <>
            <BotonImprimir texto={th.imprimir} />
            {editar}
            {siguiente}
          </>
        }
      />
      </div>
      <ConFlujo vista={1} db={db} actividad={actividad}>
      {actividad.origen === "ia" ? (
        <>
          <EditarHoja
            actividadId={id}
            puedeDeshacer={!!actividad.hojaAnterior}
            bloqueada={db.entregas.some((e) => e.actividadId === id && e.estado !== "sin_entregar")}
          />
          <HojaActividad actividad={actividad} curso={curso} qrSrc={qr} />
        </>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {Array.from({ length: actividad.paginas }, (_, i) => (
            <div key={i} className="break-after-page">
              <Hoja actividad={actividad} pagina={i + 1} modo="en_blanco" qrSrc={qr} grupoTexto={curso} />
            </div>
          ))}
        </div>
      )}
      </ConFlujo>
    </>
  );
}
