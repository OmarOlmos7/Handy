"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton, campo } from "./ui";
import { useTextos } from "./proveedor-textos";

/** Recuadro para mejorar o reeditar la hoja imprimible con un prompt (no se imprime). */
export function EditarHoja({ actividadId, puedeDeshacer, bloqueada }: { actividadId: string; puedeDeshacer: boolean; bloqueada: boolean }) {
  const router = useRouter();
  const te = useTextos().t.profesor.editarHoja;
  const [peticion, setPeticion] = useState("");
  const [estado, setEstado] = useState<"listo" | "editando" | "deshaciendo">("listo");
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  async function enviar(cuerpo: { peticion?: string; deshacer?: boolean }) {
    setEstado(cuerpo.deshacer ? "deshaciendo" : "editando");
    setAviso(null);
    try {
      const r = await fetch(`/api/actividades/${actividadId}/editar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      if (cuerpo.deshacer) {
        setAviso({ tono: "ok", texto: te.recuperada });
      } else {
        setPeticion("");
        setAviso({
          tono: "ok",
          texto: j.cambioSolucion
            ? te.cambioSolucion
            : j.revisarSolucion
              ? te.revisarRubrica
              : te.actualizada,
        });
      }
      router.refresh();
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : te.noSeEdito });
    } finally {
      setEstado("listo");
    }
  }

  if (bloqueada) {
    return (
      <p className="no-imprimir mx-auto mb-6 max-w-[8.5in] rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
        {te.bloqueada}
      </p>
    );
  }

  return (
    <section className="no-imprimir mx-auto mb-6 max-w-[8.5in] rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <label className="block text-sm font-semibold text-slate-800">
        {te.titulo}
        <textarea
          rows={3}
          value={peticion}
          onChange={(e) => setPeticion(e.target.value)}
          className={campo}
          placeholder={te.ejemplo}
          disabled={estado !== "listo"}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {te.ayuda}
        </span>
      </label>
      {estado === "editando" && (
        <p className="mt-3 rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
          {te.aplicando}
        </p>
      )}
      {aviso && (
        <p className={`mt-3 rounded-lg p-3 text-sm ${aviso.tono === "ok" ? "bg-acierto-suave text-acierto" : "bg-error-suave text-error"}`} role="status">
          {aviso.texto}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton onClick={() => enviar({ peticion })} disabled={estado !== "listo" || !peticion.trim()}>
          {estado === "editando" ? te.aplicandoCorto : te.aplicar}
        </Boton>
        {puedeDeshacer && (
          <Boton variante="secundario" onClick={() => enviar({ deshacer: true })} disabled={estado !== "listo"}>
            {estado === "deshaciendo" ? te.deshaciendo : te.deshacer}
          </Boton>
        )}
      </div>
    </section>
  );
}
