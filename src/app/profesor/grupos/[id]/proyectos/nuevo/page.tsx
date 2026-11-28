import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AltaProyectoCurso } from "@/components/alta-proyecto-curso";
import { ConFlujoProyecto } from "@/components/flujo-proyecto";
import { Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.altaProyecto.nuevo.titulo };
}

/** Alta de un proyecto desde "Proyectos del grupo": inicio del paso A de su ruta. */
export default async function NuevoProyecto({ params }: PageProps<"/profesor/grupos/[id]/proyectos/nuevo">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t } = await textos();
  const c = t.profesor.comun;
  return (
    <>
      <Encabezado
        migas={[
          { texto: c.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.proyecto.grupo.titulo, href: `/profesor/grupos/${grupo.id}/proyectos` },
        ]}
        rutaEtiqueta={c.ruta}
        titulo={`🏆 ${t.altaProyecto.nuevo.titulo}`}
        subtitulo={t.altaProyecto.nuevo.subtitulo}
      />
      <ConFlujoProyecto vista="informacion" t={t}>
        <Tarjeta>
          <AltaProyectoCurso grupoId={grupo.id} idioma={await idiomaPublico()} />
        </Tarjeta>
      </ConFlujoProyecto>
    </>
  );
}
