"use client";

import { useTransition } from "react";
import { borrarEntrega } from "@/app/acciones";
import { BotonIcono, IconoBasura } from "./iconos";

/** Bote de basura de la lista de entregas: borra la entrega para que el alumno vuelva a entregar. */
export function BorrarEntrega({ actividadId, matricula, nombre }: { actividadId: string; matricula: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <BotonIcono
      etiqueta={`Borrar la entrega de ${nombre} para que vuelva a entregar`}
      peligro
      disabled={pendiente}
      onClick={() => {
        const ok = window.confirm(
          `¿Borrar la entrega de ${nombre}?\n\nSe borran sus fotos y su evaluación, y podrá enviar una nueva entrega con el mismo QR. Los créditos ya usados no se devuelven.`,
        );
        if (ok) iniciar(() => borrarEntrega(actividadId, matricula));
      }}
    >
      <IconoBasura />
    </BotonIcono>
  );
}
