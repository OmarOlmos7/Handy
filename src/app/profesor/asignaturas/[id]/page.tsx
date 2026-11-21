import { notFound } from "next/navigation";
import { EditorTemario } from "@/components/editor-temario";
import { Encabezado } from "@/components/ui";
import { resumenTemario } from "@/lib/asignaturas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export default async function PaginaAsignatura({ params }: PageProps<"/profesor/asignaturas/[id]">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const asignatura = db.asignaturas?.find((a) => a.id === id);
  if (!asignatura) notFound();
  const { t } = await textos();
  const ta = t.profesor.asignaturas;
  const r = resumenTemario(asignatura.unidades);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: ta.titulo, href: "/profesor/asignaturas" },
        ]}
        titulo={asignatura.nombre}
        subtitulo={`${asignatura.nivel ? `${asignatura.nivel} · ` : ""}${formato(ta.resumen, { u: r.unidades, t: r.temas, s: r.subtemas })}. ${ta.editarAyuda}`}
      />
      <div className="mx-auto max-w-4xl">
        <EditorTemario key={asignatura.id} asignatura={asignatura} />
      </div>
    </>
  );
}
