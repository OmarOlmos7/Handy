"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

/** Sube la solución del profesor y espera a que la IA proponga la rúbrica. */
export function SubirSolucion({
  actividadId,
  reemplazar = false,
  instruccionesIniciales = "",
}: {
  actividadId: string;
  reemplazar?: boolean;
  instruccionesIniciales?: string;
}) {
  const to = useTextos().t.profesor.solucionOpciones;
  const [instrucciones, setInstrucciones] = useState(instruccionesIniciales);
  const router = useRouter();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function enviar() {
    setEstado("enviando");
    setMensaje("");
    const datos = new FormData();
    archivos.forEach((f) => datos.append("archivos", f));
    datos.append("instrucciones", instrucciones);
    try {
      const r = await fetch(`/api/actividades/${actividadId}/solucion`, { method: "POST", body: datos });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Error");
      router.refresh();
      setEstado("listo");
      setArchivos([]);
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : to.noSeSubio);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
        {archivos.length
          ? formato(archivos.length > 1 ? to.archivoN : to.archivo1, { n: archivos.length, lista: archivos.map((f) => f.name).join(", ") })
          : to.elegir}
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {to.criterios}
        <textarea
          rows={4}
          value={instrucciones}
          onChange={(e) => setInstrucciones(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
          placeholder={to.plantillaCriterios}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {to.criteriosAyuda}
        </span>
      </label>
      {estado === "enviando" && (
        <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
          {to.leyendo}
        </p>
      )}
      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton onClick={enviar} disabled={archivos.length === 0 || estado === "enviando"}>
        {estado === "enviando" ? to.generandoRubrica : reemplazar ? to.volverConSolucion : to.generarRubrica}
      </Boton>
    </div>
  );
}
