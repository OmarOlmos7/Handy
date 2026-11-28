import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncabezadoProyecto } from "@/components/encabezado-proyecto";
import { ConFlujoProyecto } from "@/components/flujo-proyecto";
import { RubricaProyecto } from "@/components/rubrica-proyecto";
import { Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { textos } from "@/lib/i18n/servidor";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.altaProyecto.rubrica.titulo };
}

/** Paso B de la ruta del proyecto: la rúbrica de cada etapa, asistida con IA. Solo el profesor del curso. */
export default async function RubricaDelProyecto({ params, searchParams }: PageProps<"/profesor/proyectos/[id]/rubrica">) {
  const { id } = await params;
  const { etapa } = await searchParams;
  const profesor = await requerirProfesor();
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso?.esDueno) notFound();
  const { proyecto, grupo } = acceso;
  const { t } = await textos();
  return (
    <>
      <EncabezadoProyecto t={t} proyecto={proyecto} grupo={grupo} esDueno activa="rubrica" />
      <ConFlujoProyecto vista="rubrica" proyecto={proyecto} t={t}>
        {proyecto.etapas.length === 0 ? (
          <Tarjeta className="text-sm text-aviso">{t.proyecto.errores.sinEtapas}</Tarjeta>
        ) : (
          <RubricaProyecto
            proyectoId={proyecto.id}
            titulo={proyecto.titulo}
            descripcion={proyecto.descripcion}
            etapas={proyecto.etapas}
            etapaInicial={typeof etapa === "string" ? etapa : undefined}
            evaluadasPorEtapa={Object.fromEntries(
              proyecto.etapas.map((e) => [e.id, (db.evaluacionesProyecto ?? []).filter((x) => x.proyectoId === proyecto.id && x.etapaId === e.id && x.terminada).length]),
            )}
          />
        )}
      </ConFlujoProyecto>
    </>
  );
}
