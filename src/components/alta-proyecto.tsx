"use client";

// Alta de un proyecto (tipo "Proyecto"): descripción y los tipos de evaluación con que empieza.
// Al crearlo se abre su "Modelo del proyecto" para definir etapas, rúbricas, evaluadores y pesos.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearProyecto } from "@/app/acciones-proyecto";
import { ICONO_ETAPA, TIPOS_ETAPA } from "@/lib/proyectos";
import type { TipoEtapaProyecto } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

export function AltaProyecto({ datos }: { datos: () => { grupo: string; titulo: string; idioma: string } }) {
  const router = useRouter();
  const tp = useTextos().t.proyecto;
  const [descripcion, setDescripcion] = useState("");
  const [tipos, setTipos] = useState<TipoEtapaProyecto[]>([...TIPOS_ETAPA]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function crear() {
    const d = datos();
    setEstado("enviando");
    setMensaje("");
    const r = await crearProyecto({ grupoId: d.grupo, titulo: d.titulo, descripcion, tipos, idioma: d.idioma }).catch(() => ({ error: "general" as const }));
    if ("ok" in r) {
      router.push(`/profesor/proyectos/${r.id}/modelo`);
      return;
    }
    setEstado("error");
    setMensaje(r.error in tp.errores ? tp.errores[r.error as keyof typeof tp.errores] : tp.noSeCreo);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        {tp.descripcion}
        <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={campo} placeholder={tp.ejemploDescripcion} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">{tp.etapasIniciales}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TIPOS_ETAPA.map((tipo) => {
            const activo = tipos.includes(tipo);
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={activo}
                onClick={() => setTipos((xs) => (activo ? xs.filter((x) => x !== tipo) : TIPOS_ETAPA.filter((x) => x === tipo || xs.includes(x))))}
                className={`flex items-start gap-3 rounded-xl p-3 text-left ring-2 transition ${activo ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`}
              >
                <span className="text-2xl" aria-hidden>
                  {ICONO_ETAPA[tipo]}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{tp.tipos[tipo]}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{tp.tiposAyuda[tipo]}</span>
                </span>
              </button>
            );
          })}
        </div>
        <span className="mt-1 block text-xs text-slate-500">{tp.etapasInicialesAyuda}</span>
      </fieldset>
      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{tp.sinCreditos}</p>
        <Boton type="button" onClick={crear} disabled={estado === "enviando" || tipos.length === 0}>
          {estado === "enviando" ? tp.creando : tp.crear}
        </Boton>
      </div>
    </div>
  );
}
