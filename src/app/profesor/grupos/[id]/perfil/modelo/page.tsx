import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorModeloCrear } from "@/components/editor-modelo-crear";
import { Encabezado, fechaLarga } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { modeloDelCurso } from "@/lib/perfil/crear";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.crear.titulo };
}

/** El profesor adapta el Modelo CREAR a la disciplina de su curso. */
export default async function ModeloCrear({ params }: PageProps<"/profesor/grupos/[id]/perfil/modelo">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const tc = t.perfil.crear;
  const modelo = modeloDelCurso(db.modelosCrear, grupo);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.perfil.profesor.titulo, href: `/profesor/grupos/${grupo.id}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tc.titulo}
        subtitulo={
          <>
            {tc.subtitulo}{" "}
            <span className="font-medium text-slate-700">
              {modelo.guardado ? formato(tc.version, { v: modelo.version, f: fechaLarga(modelo.actualizadoEn.slice(0, 10), locale) }) : tc.sinGuardar}
            </span>
          </>
        }
      />
      <div className="mx-auto max-w-5xl">
        <EditorModeloCrear grupoId={grupo.id} disciplina={modelo.disciplina} etapas={modelo.etapas} />
      </div>
    </>
  );
}
