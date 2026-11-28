"use client";

// Alta de un proyecto (tipo "Proyecto", o "Nuevo proyecto" en Proyectos del grupo): contexto,
// objetivo, competencias y los tipos de evaluación con que empieza. Al crearlo se abre el paso A
// de su ruta (información general) para completar etapas, fechas, entregables y pesos.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearProyecto } from "@/app/acciones-proyecto";
import { ICONO_ETAPA, TIPOS_ETAPA } from "@/lib/proyectos";
import type { TipoEtapaProyecto } from "@/lib/tipos";
import { TextoAjustable } from "./texto-ajustable";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

export function AltaProyecto({
  datos,
  conTitulo = false,
}: {
  datos: () => { grupo: string; titulo: string; idioma: string };
  /** true si el título se escribe aquí (fuera del alta de actividad). */
  conTitulo?: boolean;
}) {
  const router = useRouter();
  const { t } = useTextos();
  const tp = t.proyecto;
  const ti = t.altaProyecto.info;
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [competencias, setCompetencias] = useState("");
  const [tipos, setTipos] = useState<TipoEtapaProyecto[]>([...TIPOS_ETAPA]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function crear() {
    const d = datos();
    setEstado("enviando");
    setMensaje("");
    const r = await crearProyecto({ grupoId: d.grupo, titulo: conTitulo ? titulo : d.titulo, descripcion, objetivo, competencias, tipos, idioma: d.idioma }).catch(() => ({ error: "general" as const }));
    if ("ok" in r) {
      router.push(`/profesor/proyectos/${r.id}/modelo`);
      return;
    }
    setEstado("error");
    setMensaje(r.error in tp.errores ? tp.errores[r.error as keyof typeof tp.errores] : tp.noSeCreo);
  }

  return (
    <div className="space-y-4">
      {conTitulo && (
        <label className="block text-sm font-medium text-slate-700">
          {tp.modelo.tituloProyecto}
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} required className={campo} />
        </label>
      )}
      <label className="block text-sm font-medium text-slate-700">
        {ti.contexto}
        <TextoAjustable minFilas={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={campo} placeholder={ti.ejemploContexto} />
        <span className="mt-1 block text-xs font-normal text-slate-500">{ti.contextoAyuda}</span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {ti.objetivo}
        <TextoAjustable minFilas={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={campo} placeholder={ti.ejemploObjetivo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {ti.competencias}
        <TextoAjustable minFilas={3} value={competencias} onChange={(e) => setCompetencias(e.target.value)} className={campo} placeholder={ti.ejemploCompetencias} />
        <span className="mt-1 block text-xs font-normal text-slate-500">{ti.competenciasAyuda}</span>
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
        <Boton type="button" onClick={crear} disabled={estado === "enviando" || tipos.length === 0 || (conTitulo && !titulo.trim())}>
          {estado === "enviando" ? tp.creando : tp.crear}
        </Boton>
      </div>
    </div>
  );
}
