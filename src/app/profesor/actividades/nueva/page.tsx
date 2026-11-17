import { ConFlujo } from "@/components/flujo-actividad";
import type { Metadata } from "next";
import { NuevaActividad } from "@/components/nueva-actividad";
import { Encabezado } from "@/components/ui";
import { configuracionDe } from "@/lib/configuracion";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function Nueva({ searchParams }: PageProps<"/profesor/actividades/nueva">) {
  const { db, profesor } = await datosProfesor();
  const conf = configuracionDe(profesor.config);
  const { grupo } = await searchParams;
  return (
    <>
      <Encabezado titulo="Nueva actividad" subtitulo="Crea la actividad que aplicarás en papel: genérala con IA o carga la tuya escaneada." migas={[{ texto: "Panel", href: "/profesor" }]} />
      <ConFlujo vista={1}>
      <NuevaActividad
        grupos={db.grupos.map((g) => ({ id: g.id, materia: g.materia, nombre: g.nombre }))} hoy={new Date().toISOString().slice(0, 10)}
        grupoInicial={typeof grupo === "string" ? grupo : undefined}
        motorInicial={conf.motor}
        esfuerzos={conf.esfuerzos}
      />
      </ConFlujo>
    </>
  );
}
