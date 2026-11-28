"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui";

/** Pide (o retoma) el caso equivalente de una actividad y lleva al alumno a resolverlo. */
export function BotonCaso({ actividadId, texto, generando, errorGeneral, secundario = false }: { actividadId: string; texto: string; generando: string; errorGeneral: string; secundario?: boolean }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");

  async function pedir() {
    setEnCurso(true);
    setError("");
    try {
      const r = await fetch("/api/perfil/casos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actividadId }) });
      const datos = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (datos.id) {
        router.push(`/alumno/autoestudio/${datos.id}`);
        return;
      }
      setError(datos.error || errorGeneral);
    } catch {
      setError(errorGeneral);
    }
    setEnCurso(false);
  }

  return (
    <div className="space-y-1">
      <Boton type="button" variante={secundario ? "secundario" : "primario"} onClick={pedir} disabled={enCurso}>
        {enCurso ? generando : texto}
      </Boton>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
