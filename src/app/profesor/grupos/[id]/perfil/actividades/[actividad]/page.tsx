import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorEtapasActividad } from "@/components/editor-etapas-actividad";
import { Encabezado } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { ETAPAS_CREAR } from "@/lib/perfil/crear";
import { etapaDeCriterio, etapaDePaso, etapaDeReactivo } from "@/lib/perfil/etapas";
import { datosProfesor } from "@/lib/sesion";
import type { EtapaCrear } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.etapasActividad.titulo };
}

/** Etapas CREAR de los reactivos, pasos y criterios de una actividad. */
export default async function EtapasDeActividad({ params }: PageProps<"/profesor/grupos/[id]/perfil/actividades/[actividad]">) {
  const { id, actividad: actividadId } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  const actividad = db.actividades.find((a) => a.id === actividadId && a.grupoId === id);
  if (!grupo || !actividad) notFound();
  const { t } = await textos();
  const te = t.perfil.etapasActividad;
  const corto = (s: string) => s.replace(/\s+/g, " ").slice(0, 160);
  const reactivos = actividad.reactivos.map((r) => {
    const sugerida = etapaDeReactivo({ ...r, etapaCrear: undefined });
    const propia = etapaDeReactivo(r);
    return {
      numero: r.numero,
      etiqueta: formato(te.reactivo, { n: r.numero }),
      texto: corto(r.enunciado),
      etapa: r.etapaCrear,
      sugerida,
      pasos: (r.pasos ?? []).map((p, i) => ({
        etiqueta: `${te.paso} ${r.numero}.${i + 1} · ${p.nombre}`,
        texto: "",
        etapa: p.etapaCrear,
        sugerida: etapaDePaso({ ...p, etapaCrear: undefined }, propia),
      })),
    };
  });
  const criterios = (actividad.criterios ?? []).map((c) => ({
    etiqueta: c.nombre,
    texto: corto(c.descripcion ?? ""),
    etapa: c.etapaCrear,
    sugerida: etapaDeCriterio({ ...c, etapaCrear: undefined }, "representar"),
  }));
  const nombres = Object.fromEntries(ETAPAS_CREAR.map((e) => [e, t.perfil.crear.etapas[e].nombre])) as Record<EtapaCrear, string>;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.perfil.profesor.titulo, href: `/profesor/grupos/${grupo.id}/perfil` },
          { texto: te.titulo, href: `/profesor/grupos/${grupo.id}/perfil/actividades` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={actividad.titulo}
        subtitulo={te.subtitulo}
      />
      <div className="mx-auto max-w-4xl">
        <EditorEtapasActividad
          actividadId={actividad.id}
          reactivos={reactivos}
          criterios={criterios}
          etapas={ETAPAS_CREAR}
          nombres={nombres}
          t={{ automatica: te.automatica, sugerida: te.sugerida, guardar: te.guardar, guardando: te.guardando, guardado: te.guardado, error: te.error, criterios: te.criterios }}
        />
      </div>
    </>
  );
}
