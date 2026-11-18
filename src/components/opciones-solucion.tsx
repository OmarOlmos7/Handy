"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubirSolucion } from "./subir-solucion";
import { Boton, campo } from "./ui";
import { useTextos } from "./proveedor-textos";

/** Paso 3: escanear la solución del profesor o generarla con IA. */
export function OpcionesSolucion({
  actividadId,
  puedeGenerar,
  reemplazar = false,
  instruccionesIniciales = "",
  condicionesIniciales = "",
}: {
  actividadId: string;
  puedeGenerar: boolean;
  reemplazar?: boolean;
  instruccionesIniciales?: string;
  condicionesIniciales?: string;
}) {
  const to = useTextos().t.profesor.solucionOpciones;
  const [opcion, setOpcion] = useState<"escanear" | "ia">(puedeGenerar ? "ia" : "escanear");
  const pestana = (valor: "escanear" | "ia", texto: string, deshabilitada = false) => (
    <button
      type="button"
      onClick={() => setOpcion(valor)}
      disabled={deshabilitada}
      aria-pressed={opcion === valor}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40 ${
        opcion === valor ? "bg-white text-tinta-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {texto}
    </button>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {pestana("escanear", to.escanear)}
        {pestana("ia", to.generarIA, !puedeGenerar)}
      </div>
      {opcion === "escanear" ? (
        <SubirSolucion actividadId={actividadId} reemplazar={reemplazar} instruccionesIniciales={instruccionesIniciales} />
      ) : (
        <GenerarSolucion
          actividadId={actividadId}
          reemplazar={reemplazar}
          instruccionesIniciales={instruccionesIniciales}
          condicionesIniciales={condicionesIniciales}
        />
      )}
      {!puedeGenerar && (
        <p className="text-xs text-slate-500">
          {to.soloIA}
        </p>
      )}
    </div>
  );
}

function GenerarSolucion({
  actividadId,
  reemplazar,
  instruccionesIniciales,
  condicionesIniciales,
}: {
  actividadId: string;
  reemplazar: boolean;
  instruccionesIniciales: string;
  condicionesIniciales: string;
}) {
  const router = useRouter();
  const to = useTextos().t.profesor.solucionOpciones;
  const [condiciones, setCondiciones] = useState(condicionesIniciales);
  const [instrucciones, setInstrucciones] = useState(instruccionesIniciales);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function generar() {
    setEstado("enviando");
    setMensaje("");
    try {
      const r = await fetch(`/api/actividades/${actividadId}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condiciones, instrucciones }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      setEstado("listo");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : to.noSeGenero);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {to.condiciones}
        <textarea rows={4} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} className={campo} placeholder={to.ejemploCondiciones} />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {to.condicionesAyuda}
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {to.criterios}
        <textarea rows={4} value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} className={campo} placeholder={to.plantillaCriterios} />
      </label>
      {estado === "enviando" && (
        <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
          {to.resolviendo}
        </p>
      )}
      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton onClick={generar} disabled={estado === "enviando"}>
        {estado === "enviando" ? to.generandoSolucion : reemplazar ? to.volverGenerar : to.generar}
      </Boton>
    </div>
  );
}
