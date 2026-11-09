"use client";

import { useState, useTransition } from "react";
import { aprobarTodas } from "@/app/acciones";
import { Boton } from "./ui";

export function AprobarTodo({ actividadId, pendientes }: { actividadId: string; pendientes: number }) {
  const [hechas, setHechas] = useState<number | null>(null);
  const [guardando, iniciar] = useTransition();
  if (hechas !== null) {
    return (
      <p className="rounded-lg bg-acierto-suave px-4 py-2 text-sm font-medium text-acierto" role="status">
        Se aprobaron {hechas} reportes. Los alumnos ya pueden verlos.
      </p>
    );
  }
  return (
    <Boton variante="secundario" onClick={() => iniciar(async () => setHechas(await aprobarTodas(actividadId)))} disabled={pendientes === 0 || guardando}>
      Aprobar {pendientes} sin cambios
    </Boton>
  );
}
