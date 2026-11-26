"use client";

// Cerrar (publicar) o reabrir una etapa del proyecto. Solo el profesor del curso.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cerrarEtapa } from "@/app/acciones-proyecto";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

export function CerrarEtapa({ proyectoId, etapaId, cerrada }: { proyectoId: string; etapaId: string; cerrada: boolean }) {
  const te = useTextos().t.proyecto.evaluacion;
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      type="button"
      variante={cerrada ? "secundario" : "primario"}
      disabled={pendiente}
      onClick={() => {
        if (!cerrada && !confirm(te.confirmarCerrar)) return;
        iniciar(async () => {
          await cerrarEtapa(proyectoId, etapaId, !cerrada);
          router.refresh();
        });
      }}
    >
      {cerrada ? te.reabrir : te.cerrar}
    </Boton>
  );
}
