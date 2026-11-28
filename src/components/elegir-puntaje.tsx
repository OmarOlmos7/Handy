"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cambiarPuntaje } from "@/app/acciones";
import { OpcionPuntaje } from "./opcion-solucion";
import { useTextos } from "./proveedor-textos";

/** En la rúbrica: evaluar los criterios con puntaje o sin puntaje. Se guarda al elegir. */
export function ElegirPuntaje({ actividadId, sinPuntajeInicial }: { actividadId: string; sinPuntajeInicial: boolean }) {
  const router = useRouter();
  const { t } = useTextos();
  const [sinPuntaje, setSinPuntaje] = useState(sinPuntajeInicial);
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <OpcionPuntaje
        sinPuntaje={sinPuntaje}
        onCambio={(v) => {
          setSinPuntaje(v);
          setError("");
          iniciar(async () => {
            try {
              await cambiarPuntaje(actividadId, v);
              router.refresh();
            } catch {
              setSinPuntaje(!v);
              setError(t.profesor.comun.noSeGuardo);
            }
          });
        }}
      />
      {guardando && <p className="mt-2 text-xs text-slate-500">{t.profesor.modalidad.guardando}</p>}
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
