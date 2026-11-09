import type { Metadata } from "next";
import { NuevaActividad } from "@/components/nueva-actividad";
import { Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function Nueva() {
  const db = await leer();
  return (
    <>
      <Encabezado titulo="Nueva actividad" subtitulo="Registra la actividad que aplicarás en papel." migas={[{ texto: "Panel", href: "/profesor" }]} />
      <NuevaActividad grupos={db.grupos} hoy={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
