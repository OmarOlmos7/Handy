"use client";

// Consentimiento informado del alumno para construir su perfil de aprendizaje (Modelo CREAR).
// Si es menor de edad, también escribe el nombre y parentesco de su madre, padre o tutor.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { darConsentimientoPerfil, retirarConsentimientoPerfil } from "@/app/acciones-perfil";
import { formato } from "@/lib/i18n/idiomas";
import { Boton, campo } from "./ui";
import { useTextos } from "./proveedor-textos";

export function ConsentimientoPerfil({ dado }: { dado?: string }) {
  const { t } = useTextos();
  const tc = t.perfil.consentimiento;
  const router = useRouter();
  const [acepta, setAcepta] = useState(false);
  const [menor, setMenor] = useState(false);
  const [tutorNombre, setTutorNombre] = useState("");
  const [tutorParentesco, setTutorParentesco] = useState("");
  const [aceptaTutor, setAceptaTutor] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  if (dado) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">{formato(tc.dado, { f: dado })}</p>
        <Boton
          type="button"
          variante="fantasma"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm(tc.retirarConfirma)) return;
            iniciar(async () => {
              await retirarConsentimientoPerfil();
              router.refresh();
            });
          }}
        >
          {tc.retirar}
        </Boton>
      </div>
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    iniciar(async () => {
      const r = await darConsentimientoPerfil({ acepta, menor, tutorNombre, tutorParentesco, aceptaTutor });
      if ("error" in r) return setError(r.error === "sinAceptar" ? tc.errores.sinAceptar : r.error === "sinTutor" ? tc.errores.sinTutor : tc.errores.error);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">{tc.borrador}</p>
      <p className="text-sm text-slate-700">{tc.intro}</p>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
        {tc.puntos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Link href="/aviso-de-privacidad" target="_blank" className="inline-block text-sm font-medium text-tinta-700 underline">
        {tc.leerAviso}
      </Link>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" checked={menor} onChange={(e) => setMenor(e.target.checked)} className="mt-0.5 size-4" />
        {tc.menor}
      </label>
      {menor && (
        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            {tc.tutorNombre}
            <input className={campo} value={tutorNombre} onChange={(e) => setTutorNombre(e.target.value)} maxLength={120} />
          </label>
          <label className="text-sm text-slate-700">
            {tc.tutorParentesco}
            <input className={campo} value={tutorParentesco} onChange={(e) => setTutorParentesco(e.target.value)} maxLength={120} />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-800 sm:col-span-2">
            <input type="checkbox" checked={aceptaTutor} onChange={(e) => setAceptaTutor(e.target.checked)} className="mt-0.5 size-4" />
            {tc.aceptoTutor}
          </label>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm font-medium text-slate-900">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-4" />
        {tc.acepto}
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <Boton type="submit" disabled={pendiente}>
        {tc.boton}
      </Boton>
    </form>
  );
}
