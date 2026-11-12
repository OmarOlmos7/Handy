import type { Metadata } from "next";
import { NuevaActividad } from "@/components/nueva-actividad";
import { Encabezado } from "@/components/ui";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function Nueva() {
  const { db } = await datosProfesor();
  return (
    <>
      <Encabezado titulo="Nueva actividad" subtitulo="Paso 1 · Crea la actividad que aplicarás en papel: genérala con IA o carga la tuya escaneada." migas={[{ texto: "Panel", href: "/profesor" }]} />
      <NuevaActividad grupos={db.grupos.map((g) => ({ id: g.id, materia: g.materia, nombre: g.nombre }))} hoy={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
