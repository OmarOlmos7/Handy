import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Hoja } from "@/components/hoja";
import { Encabezado } from "@/components/ui";
import { actividades, obtenerActividad, obtenerGrupo } from "@/lib/datos-ejemplo";

export function generateStaticParams() {
  return actividades.map((a) => ({ id: a.id }));
}

export default async function HojaImprimible({ params }: PageProps<"/profesor/actividades/[id]/hoja">) {
  const { id } = await params;
  const actividad = obtenerActividad(id);
  if (!actividad) notFound();
  const grupo = obtenerGrupo(actividad.grupoId)!;
  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo="Hoja imprimible"
        subtitulo="Cada página lleva un código QR y cuatro marcas en las esquinas. Así la plataforma reconoce la página, la endereza y sabe dónde marcar cada reactivo."
        acciones={<BotonImprimir texto={`Imprimir ${actividad.paginas} páginas`} />}
      />
      <div className="mx-auto max-w-3xl space-y-6">
        {Array.from({ length: actividad.paginas }, (_, i) => (
          <div key={i} className="break-after-page">
            <Hoja actividad={actividad} pagina={i + 1} modo="en_blanco" grupoTexto={`${grupo.materia} · ${grupo.nombre}`} />
          </div>
        ))}
      </div>
    </>
  );
}
