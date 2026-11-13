"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton, campo } from "./ui";

const EJEMPLO = `Ejemplo:
Quita las figuras de todos los problemas.
Cambia el texto de cada problema por "Resuelve la integral a través del método de integración más adecuado".
Elimina los textos guía.`;

/** Recuadro para mejorar o reeditar la hoja imprimible con un prompt (no se imprime). */
export function EditarHoja({ actividadId, puedeDeshacer, bloqueada }: { actividadId: string; puedeDeshacer: boolean; bloqueada: boolean }) {
  const router = useRouter();
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
        setAviso({ tono: "ok", texto: "Se recuperó la versión anterior de la hoja." });
      } else {
        setPeticion("");
        setAviso({
          tono: "ok",
          texto: j.cambioSolucion
            ? "Hoja actualizada. Cambiaron reactivos que ya tenían solución: vuelve a preparar la solución y confirma la rúbrica."
            : j.revisarSolucion
              ? "Hoja actualizada. Revisa y confirma de nuevo la rúbrica."
              : "Hoja actualizada. Revisa el resultado abajo; puedes deshacer el cambio.",
        });
      }
      router.refresh();
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : "No se pudo editar la hoja" });
    } finally {
      setEstado("listo");
    }
  }

  if (bloqueada) {
    return (
      <p className="no-imprimir mx-auto mb-6 max-w-[8.5in] rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
        Esta hoja ya tiene entregas de alumnos, por eso ya no se puede editar.
      </p>
    );
  }

  return (
    <section className="no-imprimir mx-auto mb-6 max-w-[8.5in] rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <label className="block text-sm font-semibold text-slate-800">
        ✨ Mejorar o reeditar la hoja con IA
        <textarea
          rows={3}
          value={peticion}
          onChange={(e) => setPeticion(e.target.value)}
          className={campo}
          placeholder={EJEMPLO}
          disabled={estado !== "listo"}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Describe qué cambiar: textos, figuras, instrucciones, puntos, reactivos nuevos o eliminados. Lo demás se conserva igual.
        </span>
      </label>
      {estado === "editando" && (
        <p className="mt-3 rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
          Claude está aplicando tus cambios. Tarda entre 30 segundos y 2 minutos…
        </p>
      )}
      {aviso && (
        <p className={`mt-3 rounded-lg p-3 text-sm ${aviso.tono === "ok" ? "bg-acierto-suave text-acierto" : "bg-error-suave text-error"}`} role="status">
          {aviso.texto}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton onClick={() => enviar({ peticion })} disabled={estado !== "listo" || !peticion.trim()}>
          {estado === "editando" ? "Aplicando cambios…" : "Aplicar cambios con IA"}
        </Boton>
        {puedeDeshacer && (
          <Boton variante="secundario" onClick={() => enviar({ deshacer: true })} disabled={estado !== "listo"}>
            {estado === "deshaciendo" ? "Deshaciendo…" : "Deshacer último cambio"}
          </Boton>
        )}
      </div>
    </section>
  );
}
