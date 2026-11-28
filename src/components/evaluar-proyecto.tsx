"use client";

// Evaluación de un profesor en una etapa del proyecto (paso C), de forma gráfica: clic en la celda
// del nivel de cada elemento de la rúbrica y puntos dentro del rango de ese nivel; comenta cada elemento, da un comentario general y las áreas de
// mejora. Su evaluación es independiente de la de los demás evaluadores. La IA puede sugerirla.
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { guardarEvaluacion } from "@/app/acciones-proyecto";
import { formato } from "@/lib/i18n/idiomas";
import { calificacionEvaluacion, indiceNivel, nivelesDe, puntajeDePuntos, puntosElemento } from "@/lib/proyectos";
import type { EtapaProyecto, EvaluacionProyecto } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { tonoNivel } from "./rubrica-proyecto";
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
  const { t } = useTextos();
  const tp = t.proyecto;
  const tf = tp.formulario;
  const te = t.altaProyecto.evaluar;
  const niveles = nivelesDe(etapa, [tp.niveles.excelente, tp.niveles.bueno, tp.niveles.suficiente, tp.niveles.insuficiente]);
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
  const puntosPosibles = Math.round(etapa.criterios.reduce((s, c) => s + Math.max(0, c.porcentaje), 0) * 10) / 10;
  const puntosTotal = Math.round(etapa.criterios.reduce((s, c) => s + puntosElemento(puntajes[c.id]?.puntaje ?? 0, c.porcentaje), 0) * 10) / 10;
  const poner = (id: string, cambio: Partial<{ puntaje?: number; comentario: string }>) => {
    setPuntajes((x) => ({ ...x, [id]: { ...x[id], ...cambio } }));
    if (estado === "guardado" || estado === "sugerido") setEstado("listo");
  };

  /** Clic en un nivel: si el puntaje ya está en su rango se queda; si no, toma el máximo del nivel. */
  const elegirNivel = (id: string, k: number) => {
    const actual = puntajes[id]?.puntaje;
    if (actual !== undefined && indiceNivel(niveles, actual) === k) return;
    poner(id, { puntaje: niveles[k].max });
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

      {/* Rúbrica gráfica: clic en la celda del nivel y luego los puntos dentro de su rango. */}
      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-labelledby="rubrica-grafica">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 id="rubrica-grafica" className="text-sm font-semibold text-slate-900">
            🖱️ {te.titulo}
          </h3>
          <p className="text-xs text-slate-500">{te.ayuda}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-700">
                <th className="w-56 border-b border-slate-200 px-3 py-2">{t.altaProyecto.rubrica.elemento}</th>
                {niveles.map((n, k) => (
                  <th key={k} className={`border-b border-l border-slate-200 px-3 py-2 ${tonoNivel(k, niveles.length)}`}>
                    <span className="block">{n.nombre}</span>
                    <span className="block font-normal text-slate-500">{formato(t.altaProyecto.rubrica.rango, { a: n.min, b: n.max })}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etapa.criterios.map((c, i) => {
                const actual = puntajes[c.id];
                const elegido = actual?.puntaje === undefined ? null : indiceNivel(niveles, actual.puntaje);
                const nivel = elegido === null ? null : niveles[elegido];
                const pts = actual?.puntaje === undefined ? null : puntosElemento(actual.puntaje, c.porcentaje);
                const minPts = nivel ? puntosElemento(nivel.min, c.porcentaje) : 0;
                const maxPts = nivel ? puntosElemento(nivel.max, c.porcentaje) : 0;
                const paso = c.porcentaje >= 20 ? 0.5 : 0.1;
                return (
                  <Fragment key={c.id}>
                    <tr className="align-top">
                      <th scope="row" rowSpan={2} className="border-b border-slate-200 px-3 py-2 text-left font-normal">
                        <span className="block font-semibold text-slate-900">
                          {i + 1}. {c.nombre}
                        </span>
                        {c.descripcion && <span className="mt-0.5 block text-xs text-slate-600">{c.descripcion}</span>}
                        <span className="mt-1 block text-xs text-slate-500">
                          {c.porcentaje} % · {formato(t.altaProyecto.rubrica.puntos, { p: c.porcentaje })}
                        </span>
                        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${pts === null ? "bg-slate-100 text-slate-500" : "bg-tinta-50 text-tinta-800"}`}>
                          {pts === null ? te.sinNivel : `${pts} ${formato(te.de, { p: c.porcentaje })}`}
                        </span>
                      </th>
                      {niveles.map((n, k) => {
                        const activo = elegido === k;
                        return (
                          <td key={k} className={`border-l border-slate-200 p-1.5 ${tonoNivel(k, niveles.length)}`}>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={activo}
                              aria-label={`${c.nombre}: ${n.nombre}`}
                              disabled={cerrada}
                              onClick={() => elegirNivel(c.id, k)}
                              className={`h-full min-h-20 w-full rounded-lg p-2 text-left text-xs transition disabled:cursor-not-allowed ${
                                activo ? "bg-white ring-3 ring-tinta-500 shadow-sm" : "ring-1 ring-transparent hover:bg-white/70 hover:ring-slate-300"
                              }`}
                            >
                              <span className="flex items-center justify-between gap-1 font-semibold text-slate-700">
                                {formato(t.altaProyecto.rubrica.rangoPuntos, { a: puntosElemento(n.min, c.porcentaje), b: puntosElemento(n.max, c.porcentaje) })}
                                {activo && <span className="text-tinta-600">✓</span>}
                              </span>
                              {c.niveles[k] && <span className="mt-1 block text-slate-600">{c.niveles[k]}</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td colSpan={niveles.length} className="border-b border-l border-slate-200 bg-slate-50/60 px-3 py-2">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                          {nivel && (
                            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
                              <span className="font-medium">{formato(te.nivelElegido, { n: nivel.nombre })}</span>
                              <input
                                type="range"
                                min={minPts}
                                max={maxPts}
                                step={paso}
                                disabled={cerrada || minPts === maxPts}
                                value={pts ?? maxPts}
                                aria-label={`${te.puntos} · ${c.nombre}`}
                                onChange={(ev) => poner(c.id, { puntaje: puntajeDePuntos(Number(ev.target.value), c.porcentaje, nivel) })}
                                className="w-32 accent-tinta-600"
                              />
                              <input
                                type="number"
                                min={minPts}
                                max={maxPts}
                                step={paso}
                                disabled={cerrada}
                                value={pts ?? ""}
                                aria-label={te.puntos}
                                onChange={(ev) => ev.target.value !== "" && poner(c.id, { puntaje: puntajeDePuntos(Number(ev.target.value), c.porcentaje, nivel) })}
                                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                              />
                              <span>{formato(te.de, { p: c.porcentaje })}</span>
                            </div>
                          )}
                          <label className="block min-w-0 flex-1 text-xs font-medium text-slate-600">
                            <span className="sr-only">{tf.comentarioElemento}</span>
                            <textarea
                              rows={1}
                              disabled={cerrada}
                              placeholder={tf.comentarioElemento}
                              value={actual?.comentario ?? ""}
                              onChange={(ev) => poner(c.id, { comentario: ev.target.value })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
          <p className="text-xs text-slate-500">{te.total}</p>
          <p className={`text-2xl font-semibold ${cal === null ? "text-slate-400" : colorCalificacion(cal, 100)}`}>
            {puntosTotal}
            <span className="text-sm font-normal text-slate-400"> / {puntosPosibles}</span>
          </p>
          <p className="text-xs text-slate-500">
            {tf.calificacion}: {cal ?? "—"} / 100
          </p>
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
