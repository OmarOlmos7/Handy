"use client";

import { useState, useTransition } from "react";
import { guardarReflexionPerfil } from "@/app/acciones-perfil";
import { TextoAjustable } from "@/components/texto-ajustable";
import { Boton } from "@/components/ui";

/** Cuadro de la reflexión del profesor para una unidad o el cierre del curso. */
export function EditorReflexion({
  grupoId,
  alcance,
  unidad = "",
  inicial,
  largo,
  t,
}: {
  grupoId: string;
  alcance: "unidad" | "cierre";
  unidad?: string;
  inicial: string;
  largo: number;
  t: { placeholder: string; guardar: string; guardando: string; guardado: string; error: string };
}) {
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"" | "guardado" | "error">("");
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setEstado("");
        iniciar(async () => {
          const r = await guardarReflexionPerfil(grupoId, alcance, unidad, texto);
          setEstado("ok" in r ? "guardado" : "error");
        });
      }}
    >
      <TextoAjustable
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEstado("");
        }}
        maxLength={largo}
        minFilas={4}
        placeholder={t.placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-tinta-500 focus:ring-2 focus:ring-tinta-200 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <Boton type="submit" variante="secundario" disabled={pendiente || texto === inicial}>
          {pendiente ? t.guardando : t.guardar}
        </Boton>
        <span className="text-xs text-slate-500 tabular-nums">
          {texto.length}/{largo}
        </span>
        {estado === "guardado" && <span className="text-sm text-emerald-700">{t.guardado}</span>}
        {estado === "error" && (
          <span role="alert" className="text-sm text-error">
            {t.error}
          </span>
        )}
      </div>
    </form>
  );
}
