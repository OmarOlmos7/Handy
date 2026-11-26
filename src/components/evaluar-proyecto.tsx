"use client";

// Evaluación de un profesor en una etapa del proyecto: elige el nivel de cada elemento de la
// rúbrica (o escribe el puntaje), comenta cada elemento, da un comentario general y las áreas de
// mejora. Su evaluación es independiente de la de los demás evaluadores. La IA puede sugerirla.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarEvaluacion } from "@/app/acciones-proyecto";
import { formato } from "@/lib/i18n/idiomas";
import { NIVELES_RUBRICA, calificacionEvaluacion, nivelDePuntaje } from "@/lib/proyectos";
import type { EtapaProyecto, EvaluacionProyecto } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo, colorCalificacion } from "./ui";

type Puntajes = Record<string, { puntaje?: number; comentario: string }>;

export function EvaluarProyecto({
  proyectoId,
  etapa,
  sujeto,
  previa,
  cerrada,
  sugerible,
  costoSugerencia,
  volver,
}: {
  proyectoId: string;
  etapa: EtapaProyecto;
  sujeto: string;
  previa?: EvaluacionProyecto;
  cerrada: boolean;
  /** true si hay evidencia que la IA puede leer. */
  sugerible: boolean;
  costoSugerencia: number;
  volver: string;
}) {
  const tp = useTextos().t.proyecto;
  const tf = tp.formulario;
  const router = useRouter();
  const [puntajes, setPuntajes] = useState<Puntajes>(() =>
    Object.fromEntries(etapa.criterios.map((c) => {
      const p = previa?.criterios.find((x) => x.criterioId === c.id);
      return [c.id, { puntaje: p?.puntaje, comentario: p?.comentario ?? "" }];
    })),
  );
  const [comentario, setComentario] = useState(previa?.comentario ?? "");
  const [mejoras, setMejoras] = useState((previa?.mejoras ?? []).join("\n"));
  const [terminada, setTerminada] = useState(Boolean(previa?.terminada));
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "error" | "sugiriendo" | "sugerido">("listo");
  const [mensaje, setMensaje] = useState("");
  const [pendiente, iniciar] = useTransition();

  const lista = etapa.criterios.map((c) => ({ criterioId: c.id, puntaje: puntajes[c.id]?.puntaje, comentario: puntajes[c.id]?.comentario ?? "" }));
  const cal = calificacionEvaluacion(etapa, { criterios: lista });
  const faltan = lista.filter((c) => c.puntaje === undefined).length;
  const poner = (id: string, cambio: Partial<{ puntaje?: number; comentario: string }>) => {
    setPuntajes((x) => ({ ...x, [id]: { ...x[id], ...cambio } }));
    if (estado === "guardado" || estado === "sugerido") setEstado("listo");
  };

  function guardar(terminar: boolean) {
    setEstado("guardando");
    iniciar(async () => {
      const r = await guardarEvaluacion(proyectoId, etapa.id, sujeto, {
        criterios: lista.map((c) => ({ ...c, puntaje: c.puntaje ?? null })),
        comentario,
        mejoras,
        terminada: terminar,
      }).catch(() => ({ error: "general" as const }));
      if ("ok" in r) {
        setTerminada(r.terminada);
        setEstado("guardado");
        router.refresh();
      } else {
        setEstado("error");
        setMensaje(tp.errores[r.error] ?? tp.errores.general);
      }
    });
  }

  async function sugerir() {
    setEstado("sugiriendo");
    setMensaje("");
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/sugerir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapaId: etapa.id, sujeto }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.sugerencia) throw new Error(j.error || tf.noSeSugirio);
      const s = j.sugerencia as { criterios: { criterioId: string; puntaje: number; comentario: string }[]; comentario: string; mejoras: string[] };
      setPuntajes(Object.fromEntries(etapa.criterios.map((c) => {
        const x = s.criterios.find((y) => y.criterioId === c.id);
        return [c.id, { puntaje: x?.puntaje, comentario: x?.comentario ?? "" }];
      })));
      setComentario(s.comentario);
      setMejoras(s.mejoras.join("\n"));
      setEstado("sugerido");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : tf.noSeSugirio);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">🔒 {tf.independiente}</p>
      {cerrada && <p className="rounded-lg bg-aviso-suave px-3 py-2 text-sm text-aviso">{tf.cerradaAviso}</p>}
      {!cerrada && sugerible && (
        <div className="flex flex-col gap-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-violet-900">{formato(tf.sugerirCosto, { c: costoSugerencia })}</p>
          <Boton type="button" variante="secundario" onClick={sugerir} disabled={estado === "sugiriendo"}>
            {estado === "sugiriendo" ? tf.sugiriendo : tf.sugerir}
          </Boton>
        </div>
      )}
      {estado === "sugerido" && <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">✨ {tf.sugerencia}</p>}

      <ol className="space-y-3">
        {etapa.criterios.map((c, i) => {
          const actual = puntajes[c.id];
          const nivel = actual?.puntaje === undefined ? null : nivelDePuntaje(actual.puntaje);
          return (
            <li key={c.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  {i + 1}. {c.nombre} <span className="text-sm font-normal text-slate-500">· {c.porcentaje} %</span>
                </h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  {tf.puntaje}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={cerrada}
                    value={actual?.puntaje ?? ""}
                    onChange={(e) => poner(c.id, { puntaje: e.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(e.target.value))) })}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
              </div>
              {c.descripcion && <p className="mt-0.5 text-sm text-slate-600">{c.descripcion}</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-4" role="radiogroup" aria-label={c.nombre}>
                {NIVELES_RUBRICA.map((n, k) => {
                  const activo = nivel === n.clave;
                  return (
                    <button
                      key={n.clave}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      disabled={cerrada}
                      onClick={() => poner(c.id, { puntaje: n.valor })}
                      className={`rounded-lg p-2 text-left text-xs ring-2 transition disabled:cursor-not-allowed ${
                        activo ? "bg-tinta-50 ring-tinta-500" : "bg-slate-50 ring-slate-200 hover:ring-slate-300"
                      }`}
                    >
                      <span className="block font-semibold text-slate-900">
                        {tp.niveles[n.clave]} <span className="font-normal text-slate-500">· {n.valor}</span>
                      </span>
                      {c.niveles[k] && <span className="mt-1 block text-slate-600">{c.niveles[k]}</span>}
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 block text-xs font-medium text-slate-600">
                {tf.comentarioElemento}
                <textarea rows={2} disabled={cerrada} value={actual?.comentario ?? ""} onChange={(e) => poner(c.id, { comentario: e.target.value })} className={campo} />
              </label>
            </li>
          );
        })}
      </ol>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          {tf.comentario}
          <textarea rows={3} disabled={cerrada} value={comentario} onChange={(e) => setComentario(e.target.value)} className={campo} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {tf.mejoras}
          <textarea rows={3} disabled={cerrada} value={mejoras} onChange={(e) => setMejoras(e.target.value)} className={campo} />
          <span className="mt-1 block text-xs font-normal text-slate-500">{tf.mejorasAyuda}</span>
        </label>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur">
        <div className="mr-auto">
          <p className="text-xs text-slate-500">{tf.calificacion}</p>
          <p className={`text-2xl font-semibold ${cal === null ? "text-slate-400" : colorCalificacion(cal, 100)}`}>{cal ?? "—"}<span className="text-sm font-normal text-slate-400"> / 100</span></p>
          {faltan > 0 && <p className="text-xs text-aviso">{formato(tf.faltan, { n: faltan })}</p>}
        </div>
        <p className="text-sm" role="status">
          {estado === "error" ? <span className="text-error">{mensaje}</span> : estado === "guardado" ? <span className="text-acierto">✓ {tf.guardado}</span> : null}
        </p>
        {!cerrada && (
          <>
            <Boton type="button" variante="secundario" onClick={() => guardar(false)} disabled={pendiente}>
              {estado === "guardando" ? tf.guardando : tf.guardar}
            </Boton>
            <Boton type="button" onClick={() => guardar(true)} disabled={pendiente || faltan > 0}>
              {tf.terminar}
            </Boton>
          </>
        )}
        <a href={volver} className="text-sm text-tinta-700 hover:underline">
          {tf.volver}
        </a>
      </div>
      {terminada && !cerrada && <p className="text-sm text-acierto">✓ {tf.terminadaAviso}</p>}
    </div>
  );
}
