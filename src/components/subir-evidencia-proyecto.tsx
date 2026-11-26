"use client";

// El alumno sube (o reemplaza) la evidencia de una etapa del proyecto: documento, presentación,
// hoja de cálculo, PDF, imagen, audio o video. En una etapa por equipo, la sube por todo el equipo.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACEPTA_ARCHIVOS, MAX_BYTES_ARCHIVO, MAX_EVIDENCIAS } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import { useErrorArchivos } from "./alta-contenido";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

export function SubirEvidenciaProyecto({ proyectoId, etapaId, yaEntregada }: { proyectoId: string; etapaId: string; yaEntregada: boolean }) {
  const ta = useTextos().t.proyecto.alumno;
  const router = useRouter();
  const errorArchivos = useErrorArchivos();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function enviar() {
    const problema = errorArchivos(archivos, MAX_EVIDENCIAS);
    if (problema) {
      setEstado("error");
      setMensaje(problema);
      return;
    }
    setEstado("enviando");
    setMensaje("");
    const datos = new FormData();
    datos.set("etapa", etapaId);
    archivos.forEach((f) => datos.append("archivos", f));
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/entrega`, { method: "POST", body: datos });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || ta.noSeEnvio);
      setArchivos([]);
      setEstado("listo");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : ta.noSeEnvio);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
        {archivos.length ? archivos.map((f) => f.name).join(", ") : ta.elegir}
        <input type="file" multiple accept={ACEPTA_ARCHIVOS} className="sr-only" onChange={(e) => setArchivos(Array.from(e.target.files ?? []))} />
        <span className="mt-1 block text-xs text-slate-400">{formato(ta.formatos, { n: MAX_EVIDENCIAS, mb: Math.round(MAX_BYTES_ARCHIVO / 1024 / 1024) })}</span>
      </label>
      {estado === "error" && <p className="rounded-lg bg-error-suave p-2 text-sm text-error">{mensaje}</p>}
      <Boton type="button" onClick={enviar} disabled={!archivos.length || estado === "enviando"}>
        {estado === "enviando" ? ta.enviando : yaEntregada ? ta.reemplazar : ta.subir}
      </Boton>
    </div>
  );
}
