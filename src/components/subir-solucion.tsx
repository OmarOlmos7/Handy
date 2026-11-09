"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "./ui";

/** Sube la solución del profesor y espera a que la IA proponga la rúbrica. */
export function SubirSolucion({ actividadId, reemplazar = false }: { actividadId: string; reemplazar?: boolean }) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function enviar() {
    setEstado("enviando");
    setMensaje("");
    const datos = new FormData();
    archivos.forEach((f) => datos.append("archivos", f));
    try {
      const r = await fetch(`/api/actividades/${actividadId}/solucion`, { method: "POST", body: datos });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Error");
      router.refresh();
      setEstado("listo");
      setArchivos([]);
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo subir la solución");
    }
  }

  return (
    <div className="space-y-3">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
        {archivos.length
          ? `${archivos.length} archivo${archivos.length > 1 ? "s" : ""}: ${archivos.map((f) => f.name).join(", ")}`
          : "Toca para elegir las fotos o el PDF de tu solución (una foto por página, en orden)"}
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
        />
      </label>
      {estado === "enviando" && (
        <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
          La IA está leyendo tu solución y preparando la rúbrica. Tarda entre 30 segundos y 2 minutos…
        </p>
      )}
      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton onClick={enviar} disabled={archivos.length === 0 || estado === "enviando"}>
        {estado === "enviando" ? "Generando rúbrica…" : reemplazar ? "Volver a generar con esta solución" : "Generar rúbrica con IA"}
      </Boton>
    </div>
  );
}
