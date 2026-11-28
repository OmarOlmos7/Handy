"use client";

// Paso 1 y 3 del registro de rostros: quién entregó su consentimiento firmado y quién ya tiene rostro.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarRostros, consentimientoRostro } from "@/app/acciones-asistencia";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

export interface FilaRostro {
  matricula: string;
  nombre: string;
  /** Fecha ya formateada en que se registró el consentimiento. */
  consentimiento?: string;
  fotos: number;
}

export function ConsentimientosRostro({ grupoId, filas }: { grupoId: string; filas: FilaRostro[] }) {
  const router = useRouter();
  const tr = useTextos().t.asistencia.rostros;
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const sin = filas.filter((f) => !f.consentimiento);

  function correr(accion: () => Promise<{ ok: true } | { error: string }>) {
    setError("");
    iniciar(async () => {
      const r = await accion();
      if ("error" in r) setError(r.error);
      else {
        setElegidos(new Set());
        router.refresh();
      }
    });
  }

  function alternar(m: string) {
    const s = new Set(elegidos);
    if (s.has(m)) s.delete(m);
    else s.add(m);
    setElegidos(s);
  }

  return (
    <div>
      {sin.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={elegidos.size === sin.length}
              onChange={(e) => setElegidos(e.target.checked ? new Set(sin.map((f) => f.matricula)) : new Set())}
            />
            {tr.todos}
          </label>
          <Boton type="button" className="!py-1.5" disabled={!elegidos.size || pendiente} onClick={() => correr(() => consentimientoRostro(grupoId, [...elegidos], true))}>
            {formato(tr.seleccionados, { n: elegidos.size })}
          </Boton>
        </div>
      )}
      {error && <p className="mb-2 text-sm text-error">{error}</p>}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {filas.map((f) => (
          <li key={f.matricula} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            {!f.consentimiento ? (
              <input type="checkbox" aria-label={f.nombre} checked={elegidos.has(f.matricula)} onChange={() => alternar(f.matricula)} />
            ) : (
              <span aria-hidden className="w-[13px] text-center text-acierto">✓</span>
            )}
            <span className="min-w-[10rem] flex-1 font-medium text-slate-900">{f.nombre}</span>
            <span className={`text-xs ${f.consentimiento ? "text-acierto" : "text-slate-400"}`}>
              {f.consentimiento ? formato(tr.recibido, { fecha: f.consentimiento }) : tr.sinConsentimiento}
            </span>
            <span className={`w-20 text-right text-xs ${f.fotos ? "text-slate-700" : "text-slate-400"}`}>{f.fotos ? formato(tr.fotos, { n: f.fotos }) : tr.sinFotos}</span>
            <span className="flex w-40 justify-end gap-2">
              {f.fotos > 0 && (
                <button type="button" disabled={pendiente} onClick={() => correr(() => borrarRostros(grupoId, f.matricula))} className="text-xs text-slate-500 hover:text-error hover:underline">
                  {tr.borrar}
                </button>
              )}
              {f.consentimiento && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => confirm(formato(tr.confirmarRetirar, { nombre: f.nombre })) && correr(() => consentimientoRostro(grupoId, [f.matricula], false))}
                  className="text-xs text-slate-500 hover:text-error hover:underline"
                >
                  {tr.retirar}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BorrarTodosLosRostros({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const tr = useTextos().t.asistencia.rostros;
  const [pendiente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      className="text-sm text-slate-500 hover:text-error hover:underline"
      onClick={() =>
        confirm(tr.confirmarBorrarTodos) &&
        iniciar(async () => {
          await borrarRostros(grupoId);
          router.refresh();
        })
      }
    >
      🗑️ {tr.borrarTodos}
    </button>
  );
}
