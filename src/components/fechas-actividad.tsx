"use client";

import { useTextos } from "./proveedor-textos";
import { campo } from "./ui";

export interface CamposFechas {
  visibleDesde?: string;
  envioDesde?: string;
  envioHasta?: string;
  resultadosDesde?: string;
}

/**
 * Fechas de la actividad para los alumnos (hora del centro de México). En azul, el alta y la
 * recepción de entregas (inicio y cierre); en ámbar, la liberación de resultados y calificación.
 * Valores en el formato de un campo `datetime-local`.
 */
export function FechasActividad({ inicial = {} }: { inicial?: CamposFechas }) {
  const tn = useTextos().t.profesor.nuevaActividad;
  const fecha = (nombre: keyof CamposFechas, etiqueta: string, ayuda: string, tono: "azul" | "ambar") => (
    <label className={`block text-sm font-medium ${tono === "azul" ? "text-tinta-800" : "text-aviso"}`}>
      {etiqueta}
      <input
        name={nombre}
        type="datetime-local"
        defaultValue={inicial[nombre] ?? ""}
        className={`${campo} ${tono === "azul" ? "border-tinta-200 bg-white" : "border-aviso/30 bg-white"}`}
      />
      <span className="mt-1 block text-xs font-normal text-slate-600">{ayuda}</span>
    </label>
  );
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">{tn.fechasTitulo}</legend>
      <div className="rounded-xl bg-tinta-50 p-4 ring-1 ring-tinta-200">
        <p className="mb-3 inline-flex rounded-full bg-tinta-600 px-2.5 py-0.5 text-xs font-medium text-white">{tn.fechasEntregas}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {fecha("visibleDesde", tn.visibleDesde, tn.visibleAyuda, "azul")}
          {fecha("envioDesde", tn.envioDesde, tn.envioDesdeAyuda, "azul")}
          {fecha("envioHasta", tn.envioHasta, tn.envioHastaAyuda, "azul")}
        </div>
      </div>
      <div className="rounded-xl bg-aviso-suave p-4 ring-1 ring-aviso/30">
        <p className="mb-3 inline-flex rounded-full bg-aviso px-2.5 py-0.5 text-xs font-medium text-white">{tn.fechasResultados}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">{fecha("resultadosDesde", tn.resultadosDesde, tn.resultadosAyuda, "ambar")}</div>
        </div>
      </div>
      <p className="text-xs text-slate-500">{tn.fechasZona}</p>
    </fieldset>
  );
}
