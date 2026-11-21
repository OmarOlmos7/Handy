"use client";

// Al terminar, el alumno puede contar cómo se sintió (opcional) y elegir una carita.
import { useState, useTransition } from "react";
import { guardarSentir } from "@/app/acciones-autoestudio";
import { ANIMOS, LARGO_SENTIR } from "@/lib/autoestudio";
import { useTextos } from "./proveedor-textos";

export function SentirAutoestudio({ id, sentir, animo }: { id: string; sentir?: string; animo?: string }) {
  const ta = useTextos().t.autoestudio;
  const [texto, setTexto] = useState(sentir ?? "");
  const [carita, setCarita] = useState(animo ?? "");
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await guardarSentir(id, texto, carita);
          // Ante textos de agresión, tristeza profunda, enojo o violencia: solo la frase de apoyo.
          setRespuesta(r.bloqueado ? ta.apoyo : ta.hacer.gracias);
        });
      }}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"
    >
      <p className="text-sm font-medium text-slate-700">{ta.hacer.sentir}</p>
      <div className="mt-2 flex gap-2" role="radiogroup">
        {ANIMOS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={carita === a} onClick={() => setCarita(a)} className={`rounded-full p-1.5 text-2xl transition ${carita === a ? "scale-110 bg-tinta-50 ring-2 ring-tinta-500" : "opacity-70 hover:opacity-100"}`}>
            {a}
          </button>
        ))}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={LARGO_SENTIR}
        rows={2}
        placeholder={ta.hacer.sentirEjemplo}
        className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className="rounded-lg bg-tinta-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-tinta-700 disabled:opacity-60">
          {ta.hacer.guardarSentir}
        </button>
        {respuesta && (
          <p className="text-sm text-slate-700" aria-live="polite">
            {respuesta}
          </p>
        )}
      </div>
    </form>
  );
}
