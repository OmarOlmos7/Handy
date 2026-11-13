"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { generoAlumno } from "@/app/acciones";

/** Lista desplegable para asignar el género de un alumno (solo para las analíticas). */
export function SelectorGenero({ grupoId, matricula, valor }: { grupoId: string; matricula: string; valor?: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <select
      aria-label="Género"
      defaultValue={valor ?? ""}
      disabled={pendiente}
      onChange={(e) => {
        const g = e.target.value;
        iniciar(async () => {
          await generoAlumno(grupoId, matricula, g);
          router.refresh();
        });
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-tinta-500 focus:outline-none disabled:opacity-60"
    >
      <option value="">Sin dato</option>
      <option value="F">Femenino</option>
      <option value="M">Masculino</option>
      <option value="X">Otro</option>
    </select>
  );
}
