"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "./ui";

/** Evalúa con IA, una por una, las entregas pendientes y muestra el avance. */
export function EvaluarTodo({ actividadId, pendientes }: { actividadId: string; pendientes: { matricula: string; nombre: string }[] }) {
  const router = useRouter();
  const [hechas, setHechas] = useState(0);
  const [actual, setActual] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  async function evaluar() {
    setErrores([]);
    setHechas(0);
    for (const p of pendientes) {
      setActual(p.nombre);
      try {
        const r = await fetch(`/api/evaluar/${actividadId}/${p.matricula}`, { method: "POST" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErrores((e) => [...e, `${p.nombre}: ${j.error ?? "error"}`]);
          if (r.status === 402 || r.status === 409) break;
        }
      } catch {
        setErrores((e) => [...e, `${p.nombre}: sin conexión`]);
      }
      setHechas((n) => n + 1);
      router.refresh();
    }
    setActual(null);
  }

  if (pendientes.length === 0 && !actual) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <Boton onClick={evaluar} disabled={actual !== null}>
        {actual ? `Evaluando ${hechas + 1} de ${pendientes.length + hechas}…` : `Evaluar con IA (${pendientes.length})`}
      </Boton>
      {actual && <p className="text-xs text-slate-500">Leyendo la hoja de {actual}</p>}
      {errores.map((e) => (
        <p key={e} className="max-w-sm text-right text-xs text-error">{e}</p>
      ))}
    </div>
  );
}
