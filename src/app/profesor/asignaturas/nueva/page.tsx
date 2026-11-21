import { Encabezado } from "@/components/ui";
import { NuevaAsignatura } from "@/components/nueva-asignatura";
import { textos } from "@/lib/i18n/servidor";

export default async function PaginaNuevaAsignatura({ searchParams }: PageProps<"/profesor/asignaturas/nueva">) {
  const { t } = await textos();
  const ta = t.profesor.asignaturas;
  const { nombre } = await searchParams;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: ta.titulo, href: "/profesor/asignaturas" },
        ]}
        titulo={ta.nueva}
        subtitulo={ta.subtitulo}
      />
      <NuevaAsignatura nombreInicial={typeof nombre === "string" ? nombre.slice(0, 120) : ""} />
    </>
  );
}
