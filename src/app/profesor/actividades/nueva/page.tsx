import type { Metadata } from "next";
import { NuevaActividad } from "@/components/nueva-actividad";
import { Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nueva actividad" };

export default function Nueva() {
  return (
    <>
      <Encabezado titulo="Nueva actividad" subtitulo="Registra la actividad que aplicarás en papel." migas={[{ texto: "Panel", href: "/profesor" }]} />
      <NuevaActividad />
    </>
  );
}
