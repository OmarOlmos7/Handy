"use client";

// El profesor adapta el Modelo CREAR a la disciplina de su curso: para cada etapa escribe los
// elementos característicos, los procesos, los modelos de trabajo y las evidencias del logro
// esperado. Parte de una plantilla según la materia.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarModeloCrear } from "@/app/acciones-perfil";
import { formato } from "@/lib/i18n/idiomas";
import { CAMPOS_ETAPA, DISCIPLINAS, ETAPAS_CREAR, LARGO_CAMPO, SOLO_DE_ETAPA, plantilla } from "@/lib/perfil/crear";
import type { DefinicionEtapaCrear, EtapaCrear } from "@/lib/tipos";
import { colorRuta } from "@/lib/ruta-aprendizaje";
import { TextoAjustable } from "./texto-ajustable";
import { Boton, campo } from "./ui";
import { useTextos } from "./proveedor-textos";

type Etapas = Record<EtapaCrear, DefinicionEtapaCrear>;

export function EditorModeloCrear({ grupoId, disciplina: inicial, etapas: inicialEtapas }: { grupoId: string; disciplina: string; etapas: Etapas }) {
  const { t } = useTextos();
  const tc = t.perfil.crear;
  const router = useRouter();
  const [disciplina, setDisciplina] = useState(inicial);
  const [etapas, setEtapas] = useState<Etapas>(inicialEtapas);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (e: EtapaCrear, c: keyof DefinicionEtapaCrear, v: string) => {
    setMensaje(null);
    setEtapas((x) => ({ ...x, [e]: { ...x[e], [c]: v } }));
  };

  function guardar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await guardarModeloCrear(grupoId, disciplina, etapas);
      if ("error" in r) return setMensaje({ texto: tc.error, error: true });
      setMensaje({ texto: r.cambio ? formato(tc.guardado, { v: r.version }) : tc.sinCambios });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-700">
          {tc.disciplina}
          <select className={campo} value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            {DISCIPLINAS.map((d) => (
              <option key={d} value={d}>
                {tc.disciplinas[d as keyof typeof tc.disciplinas] ?? d}
              </option>
            ))}
          </select>
        </label>
        <Boton
          type="button"
          variante="secundario"
          onClick={() => {
            if (window.confirm(tc.usarConfirma)) {
              setEtapas(plantilla(disciplina));
              setMensaje(null);
            }
          }}
        >
          {tc.usarPlantilla}
        </Boton>
      </div>

      {ETAPAS_CREAR.map((e, i) => (
        <fieldset
          key={e}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.05)] sm:p-5"
          style={{ borderLeft: `6px solid ${colorRuta(i)}` }}
        >
          <legend className="sr-only">{tc.etapas[e].nombre}</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: colorRuta(i) }}>
                {e === "transferencia" ? "+" : tc.etapas[e].nombre.charAt(0)}
              </span>
              {tc.etapas[e].nombre}
            </h2>
            <span className="text-xs font-medium text-slate-500">{formato(tc.nivel, { nivel: tc.solo[SOLO_DE_ETAPA[e]] })}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{tc.etapas[e].descripcion}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {CAMPOS_ETAPA.map((c) => (
              <label key={c} className="text-sm font-medium text-slate-700">
                {tc.campos[c]}
                <TextoAjustable className={`${campo} font-normal`} minFilas={2} maxLength={LARGO_CAMPO} value={etapas[e][c]} onChange={(ev) => cambiar(e, c, ev.target.value)} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-md ring-1 ring-slate-200">
        <Boton type="button" onClick={guardar} disabled={pendiente}>
          {pendiente ? tc.guardando : tc.guardar}
        </Boton>
        {mensaje && <p className={`text-sm ${mensaje.error ? "text-error" : "text-slate-700"}`}>{mensaje.texto}</p>}
      </div>
    </div>
  );
}
