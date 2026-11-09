import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Hoja } from "@/components/hoja";
import { Encabezado } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";
import { qrDataUrl, urlBase } from "@/lib/qr";

export default async function HojaImprimible({ params }: PageProps<"/profesor/actividades/[id]/hoja">) {
  const { id } = await params;
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const qr = await qrDataUrl(`${await urlBase()}/entregar/${id}`);
  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo="Hoja imprimible"
        subtitulo="Cada página lleva el código QR de entrega: el alumno lo escanea con su celular, toma las fotos de sus hojas y las envía."
        acciones={<BotonImprimir texto={`Imprimir ${actividad.paginas} páginas`} />}
      />
      <div className="mx-auto max-w-3xl space-y-6">
        {Array.from({ length: actividad.paginas }, (_, i) => (
          <div key={i} className="break-after-page">
            <Hoja actividad={actividad} pagina={i + 1} modo="en_blanco" qrSrc={qr} grupoTexto={`${grupo.materia} · ${grupo.nombre}`} />
          </div>
        ))}
      </div>
    </>
  );
}
