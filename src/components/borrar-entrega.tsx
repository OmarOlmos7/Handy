"use client";

import { useTransition } from "react";
import { borrarEntrega } from "@/app/acciones";
import { BotonIcono, IconoBasura } from "./iconos";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

/** Bote de basura de la lista de entregas: borra la entrega para que el alumno vuelva a entregar. */
export function BorrarEntrega({ actividadId, matricula, nombre }: { actividadId: string; matricula: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition();
  const tb = useTextos().t.profesor.borrarEntrega;
  return (
    <BotonIcono
      etiqueta={formato(tb.etiqueta, { nombre })}
      peligro
      disabled={pendiente}
      onClick={() => {
        const ok = window.confirm(formato(tb.confirmar, { nombre }));
        if (ok) iniciar(() => borrarEntrega(actividadId, matricula));
      }}
    >
      <IconoBasura />
    </BotonIcono>
  );
}
