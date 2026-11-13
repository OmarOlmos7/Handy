"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { aprobarTodas } from "@/app/acciones";
import { Boton } from "./ui";

export function AprobarTodo({
  actividadId,
  pendientes,
  visiblesDesde,
}: {
  actividadId: string;
  pendientes: number;
  /** Si los resultados tienen fecha de visualización futura, texto de esa fecha. */
  visiblesDesde?: string;
}) {
  const router = useRouter();
  const [hechas, setHechas] = useState<number | null>(null);
  const [guardando, iniciar] = useTransition();
  if (hechas !== null) {
    return (
      <p className="rounded-lg bg-acierto-suave px-4 py-2 text-sm font-medium text-acierto" role="status">
        Se aprobaron {hechas} {hechas === 1 ? "reporte" : "reportes"}.{" "}
        {visiblesDesde ? `Los alumnos los verán a partir del ${visiblesDesde}.` : "Los alumnos ya pueden verlos."}
      </p>
    );
  }
  return (
    <Boton
      className="w-full"
      onClick={() => {
        if (!window.confirm(`¿Aprobar las ${pendientes} entregas evaluadas sin cambios? Los alumnos podrán ver sus resultados.`)) return;
        iniciar(async () => {
          setHechas(await aprobarTodas(actividadId));
          router.refresh();
        });
      }}
      disabled={pendientes === 0 || guardando}
    >
      {guardando ? "Aprobando…" : pendientes === 0 ? "No hay entregas por aprobar" : `Aprobar todas las entregas (${pendientes})`}
    </Boton>
  );
}
