import { ConFlujo } from "@/components/flujo-actividad";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { EditarHoja } from "@/components/editar-hoja";
import { Hoja } from "@/components/hoja";
import { HojaActividad } from "@/components/hoja-actividad";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { qrDataUrl, urlBase } from "@/lib/qr";

export default async function HojaImprimible({ params }: PageProps<"/profesor/actividades/[id]/hoja">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const curso = `${grupo.materia} · ${grupo.nombre}`;
  const qr = await qrDataUrl(`${await urlBase()}/entregar/${id}`);
  const siguiente = actividad.reactivos.some((r) => r.respuesta.trim()) ? null : (
    <BotonLink href={`/profesor/actividades/${id}/rubrica`} variante="secundario">
      Siguiente: preparar la solución
    </BotonLink>
  );
  const migas = [
    { texto: "Panel", href: "/profesor" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
    { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
  ];

  if (actividad.origen === "escaneada") {
    return (
      <>
        <Encabezado
          migas={migas}
          titulo="Hoja imprimible"
          subtitulo="Tu actividad escaneada con encabezado para nombre, matrícula y calificación, y el código QR de entrega en cada página."
          acciones={
            <>
              <BotonLink href={`/api/hoja/${id}`} target="_blank">
                Descargar PDF para imprimir
              </BotonLink>
              {siguiente}
            </>
          }
        />
        <ConFlujo vista={1} db={db} actividad={actividad}>
          <Tarjeta className="mx-auto max-w-3xl p-2">
            <iframe src={`/api/hoja/${id}`} title="Hoja imprimible" className="h-[80vh] w-full rounded-lg" />
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
        titulo="Hoja imprimible"
        subtitulo="El alumno escribe su nombre y matrícula, resuelve, escanea el QR con su celular y envía la foto de cada hoja."
        acciones={
          <>
            <BotonImprimir texto="Imprimir o guardar PDF" />
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
