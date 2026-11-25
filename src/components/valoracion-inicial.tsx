"use client";

// Valoración inicial del alumno: una pregunta por unidad del temario con cinco niveles. Con las
// respuestas se arma su ruta de aprendizaje.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarValoracion } from "@/app/acciones-ruta";
import { formato } from "@/lib/i18n/idiomas";
import { NIVELES_CONOCIMIENTO, colorRuta } from "@/lib/ruta-aprendizaje";
import type { NivelConocimiento } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";

/** Tono de cada opción, de avanzado (verde) a "no tengo idea" (rojo). */
const TONO: Record<NivelConocimiento, string> = {
  avanzado: "peer-checked:bg-emerald-600 peer-checked:ring-emerald-600",
  bueno: "peer-checked:bg-teal-600 peer-checked:ring-teal-600",
  basico: "peer-checked:bg-sky-600 peer-checked:ring-sky-600",
  apoyo: "peer-checked:bg-orange-500 peer-checked:ring-orange-500",
  sin_idea: "peer-checked:bg-rose-600 peer-checked:ring-rose-600",
};

export function ValoracionInicial({
  grupoId,
  unidades,
  inicial,
}: {
  grupoId: string;
  unidades: { nombre: string; descripcion: string }[];
  inicial?: Record<string, NivelConocimiento>;
}) {
  const { t } = useTextos();
  const tv = t.ruta.valoracion;
  const router = useRouter();
  const [niveles, setNiveles] = useState<Record<string, NivelConocimiento>>(inicial ?? {});
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const faltan = unidades.filter((u) => !niveles[u.nombre]).length;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (faltan > 0) return setError(formato(tv.faltan, { n: faltan }));
    setError("");
    iniciar(async () => {
      const r = await guardarValoracion(grupoId, niveles);
      if ("error" in r) return setError(r.error === "incompleta" ? formato(tv.faltan, { n: faltan }) : tv.error);
      router.push(`/alumno/cursos/${grupoId}/ruta`);
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {unidades.map((u, i) => (
        <fieldset
          key={u.nombre}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.05)] sm:p-5"
          style={{ borderLeft: `6px solid ${colorRuta(i)}` }}
        >
          <legend className="sr-only">{u.nombre}</legend>
          <p className="text-[15px] leading-snug text-slate-800">
            {formato(tv.pregunta, { n: i + 1, descripcion: "\u0000" })
              .split("\u0000")
              .flatMap((parte, k) => (k === 0 ? [parte] : [<strong key={k} className="font-semibold text-slate-900">{u.descripcion}</strong>, parte]))}
          </p>
          <p className="mt-0.5 text-xs font-medium" style={{ color: colorRuta(i) }}>
            {u.nombre}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {NIVELES_CONOCIMIENTO.map((n) => (
              <label key={n} className="cursor-pointer">
                <input
                  type="radio"
                  name={`unidad-${i}`}
                  value={n}
                  checked={niveles[u.nombre] === n}
                  onChange={() => setNiveles((x) => ({ ...x, [u.nombre]: n }))}
                  className="peer sr-only"
                />
                <span
                  className={`block rounded-xl bg-white px-2 py-2 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta-500 hover:ring-slate-400 ${TONO[n]}`}
                >
                  {tv.niveles[n]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-60">
          {pendiente ? tv.guardando : tv.guardar}
        </button>
        {error && (
          <span role="alert" className="text-sm text-error">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
