import { ConFlujo } from "@/components/flujo-actividad";
import type { Metadata } from "next";
import { NuevaActividad } from "@/components/nueva-actividad";
import { Encabezado } from "@/components/ui";
import { configuracionDe } from "@/lib/configuracion";
import { etiquetasPorGrupo } from "@/lib/etiquetas";
import { datosProfesor } from "@/lib/sesion";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.nueva.titulo };
}

export default async function Nueva({ searchParams }: PageProps<"/profesor/actividades/nueva">) {
  const { db, profesor } = await datosProfesor();
  const conf = configuracionDe(profesor.config);
  const { grupo } = await searchParams;
  const { t } = await textos();
  const tn = t.profesor.nueva;
  return (
    <>
      <Encabezado titulo={tn.titulo} subtitulo={tn.subtitulo} migas={[{ texto: t.profesor.comun.panel, href: "/profesor" }]} />
      <ConFlujo vista={1}>
      <NuevaActividad
        grupos={db.grupos.map((g) => ({ id: g.id, materia: g.materia, nombre: g.nombre }))} hoy={new Date().toISOString().slice(0, 10)}
        grupoInicial={typeof grupo === "string" ? grupo : undefined}
        motorInicial={conf.motor}
        esfuerzos={conf.esfuerzos}
        idiomaInicial={await idiomaPublico()}
        etiquetasCurso={etiquetasPorGrupo(db.grupos, db.actividades)}
      />
      </ConFlujo>
    </>
  );
}
