"use client";

import { useTransition } from "react";
import { cambiarRecepcion } from "@/app/acciones";
import { useTextos } from "./proveedor-textos";

/**
 * Interruptor de recepción de entregas: "Recibir entregas" (verde) o "Suspender entregas" (rojo).
 * Con las entregas suspendidas, el QR no recibe actividades de los alumnos.
 */
export function RecepcionEntregas({ actividadId, suspendidas }: { actividadId: string; suspendidas: boolean }) {
  const te = useTextos().t.profesor.entregas;
  const [pendiente, iniciar] = useTransition();
  const cambiar = (suspender: boolean) => {
    if (suspender !== suspendidas) iniciar(() => cambiarRecepcion(actividadId, suspender));
  };
  const base = "rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-wait";
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 ${
        suspendidas ? "bg-error-suave ring-error/30" : "bg-acierto-suave ring-acierto/30"
      }`}
    >
      <div className="text-sm">
        <p className="font-medium text-slate-900">{te.recepcion}</p>
        <p className={suspendidas ? "text-error" : "text-acierto"}>{suspendidas ? te.suspendidasTexto : te.activasTexto}</p>
      </div>
      <div role="group" aria-label={te.recepcion} className="inline-flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
        <button
          type="button"
          aria-pressed={!suspendidas}
          disabled={pendiente}
          onClick={() => cambiar(false)}
          className={`${base} ${!suspendidas ? "bg-acierto text-white shadow-sm" : "text-slate-600 hover:bg-acierto-suave hover:text-acierto"}`}
        >
          {te.recibir}
        </button>
        <button
          type="button"
          aria-pressed={suspendidas}
          disabled={pendiente}
          onClick={() => cambiar(true)}
          className={`${base} ${suspendidas ? "bg-error text-white shadow-sm" : "text-slate-600 hover:bg-error-suave hover:text-error"}`}
        >
          {te.suspender}
        </button>
      </div>
    </div>
  );
}
