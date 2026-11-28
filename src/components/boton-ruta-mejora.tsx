"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui";

/** Pide a la IA la ruta de mejora del alumno (la paga el alumno o, con matrícula, su profesor). */
export function BotonRutaMejora({
  grupoId,
  matricula,
  texto,
  generando,
  errorGeneral,
  secundario = false,
}: {
  grupoId: string;
  matricula?: string;
  texto: string;
  generando: string;
  errorGeneral: string;
  secundario?: boolean;
}) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState("");

  async function pedir() {
    setEnCurso(true);
    setError("");
    try {
      const r = await fetch("/api/perfil/ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matricula ? { grupoId, como: "profesor", matricula } : { grupoId }),
      });
      const datos = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (datos.ok) router.refresh();
      else setError(datos.error || errorGeneral);
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
        <p role="alert" className="text-left text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
