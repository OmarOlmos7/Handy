import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EncabezadoProyecto } from "@/components/encabezado-proyecto";
import { ConFlujoProyecto } from "@/components/flujo-proyecto";
import { ModeloProyecto } from "@/components/modelo-proyecto";
import { leer } from "@/lib/almacen";
import { textos } from "@/lib/i18n/servidor";
import { accesoProyecto, evaluadoresConNombre } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.altaProyecto.flujo.pasos.informacion[0] };
}

/** Paso A de la ruta del proyecto: información general, etapas con fechas y entregables, ponderación, evaluadores y equipos. Solo el profesor del curso. */
export default async function ModeloDelProyecto({ params }: PageProps<"/profesor/proyectos/[id]/modelo">) {
  const { id } = await params;
  const profesor = await requerirProfesor();
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso?.esDueno) notFound();
  const { proyecto, grupo } = acceso;
  const { t } = await textos();
  return (
    <>
      <EncabezadoProyecto t={t} proyecto={proyecto} grupo={grupo} esDueno activa="modelo" />
      <ConFlujoProyecto vista="informacion" proyecto={proyecto} t={t}>
      <ModeloProyecto
        key={proyecto.etapas.map((e) => e.id).join()}
        proyectoId={proyecto.id}
        grupoId={grupo.id}
        inicial={{
          titulo: proyecto.titulo,
          descripcion: proyecto.descripcion,
          objetivo: proyecto.objetivo,
          competencias: proyecto.competencias,
          etapas: proyecto.etapas,
          equipos: proyecto.equipos,
        }}
        alumnos={grupo.alumnos.filter((a, i) => grupo.alumnos.findIndex((x) => x.matricula === a.matricula) === i).map((a) => ({ matricula: a.matricula, nombre: a.nombre }))}
        evaluadoresIniciales={evaluadoresConNombre(db, proyecto)}
      />
      </ConFlujoProyecto>
    </>
  );
}
