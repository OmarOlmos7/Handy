"use client";

// Paso B de la ruta del proyecto: la rúbrica de cada etapa. Niveles de desempeño con su rango de
// puntos (porcentaje de cada elemento) y elementos con su peso y lo que se observa en cada nivel,
// en forma de tabla. La IA la propone a partir de un prompt con niveles, criterios y evidencias a
// valorar; el profesor la ajusta y la guarda. Los puntos los calcula lib/proyectos.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarRubricas } from "@/app/acciones-proyecto";
import { formato } from "@/lib/i18n/idiomas";
import {
  ICONO_ETAPA,
  MAX_CRITERIOS,
  MAX_NIVELES,
  MIN_NIVELES,
  nivelesDe,
  nuevoIdCorto,
  puntosElemento,
  rangosParejos,
  repartirCien,
  revisarRubricaEtapa,
} from "@/lib/proyectos";
import type { CriterioProyecto, EtapaProyecto, NivelProyecto } from "@/lib/tipos";
import { TextoAjustable } from "./texto-ajustable";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

/** Tonos de las columnas de nivel, del más alto al más bajo (se toman según cuántos niveles haya). */
const TONOS = ["bg-emerald-50", "bg-lime-50", "bg-amber-50", "bg-orange-50", "bg-rose-50", "bg-slate-100"];
export function tonoNivel(i: number, n: number) {
  if (n <= 1) return TONOS[0];
  return TONOS[Math.round((i / (n - 1)) * (TONOS.length - 1))];
}

type Borrador = Pick<EtapaProyecto, "id" | "nombre" | "tipo" | "instrucciones" | "porEquipo" | "conEvidencia" | "entregables" | "criterios"> & { niveles: NivelProyecto[] };

export function RubricaProyecto({
  proyectoId,
  titulo,
  descripcion,
  etapas: iniciales,
  etapaInicial,
  evaluadasPorEtapa = {},
}: {
  proyectoId: string;
  titulo: string;
  descripcion: string;
  etapas: EtapaProyecto[];
  etapaInicial?: string;
  /** Evaluaciones terminadas por etapa: al reeditar su rúbrica se avisa qué pasa con ellas. */
  evaluadasPorEtapa?: Record<string, number>;
}) {
  const { t } = useTextos();
  const tp = t.proyecto;
  const tr = t.altaProyecto.rubrica;
  const router = useRouter();
  const base = [tp.niveles.excelente, tp.niveles.bueno, tp.niveles.suficiente, tp.niveles.insuficiente];
  const [etapas, setEtapas] = useState<Borrador[]>(() => iniciales.map((e) => ({ ...e, niveles: nivelesDe(e, base).map((n) => ({ ...n })) })));
  const [activa, setActiva] = useState(iniciales.find((e) => e.id === etapaInicial)?.id ?? iniciales[0]?.id);
  const [prompt, setPrompt] = useState<Record<string, { criterios: string; evidencias: string; indicaciones: string }>>(() =>
    Object.fromEntries(
      iniciales.map((e) => [e.id, { criterios: "", evidencias: (e.entregables ?? []).map((d) => d.nombre).join(", "), indicaciones: "" }]),
    ),
  );
  const [generando, setGenerando] = useState<string | null>(null);
  const [errorIA, setErrorIA] = useState("");
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "error">("listo");
  const [mensaje, setMensaje] = useState("");
  const [pendiente, iniciar] = useTransition();

  const e = etapas.find((x) => x.id === activa);
  const cambiado = () => estado !== "listo" && setEstado("listo");
  const cambiarEtapa = (cambio: Partial<Borrador>) => {
    setEtapas((xs) => xs.map((x) => (x.id === activa ? { ...x, ...cambio } : x)));
    cambiado();
  };
  const cambiarCriterio = (k: number, cambio: Partial<CriterioProyecto>) => e && cambiarEtapa({ criterios: e.criterios.map((c, i) => (i === k ? { ...c, ...cambio } : c)) });
  const cambiarNivel = (k: number, cambio: Partial<NivelProyecto>) => e && cambiarEtapa({ niveles: e.niveles.map((n, i) => (i === k ? { ...n, ...cambio } : n)) });

  function cuantosNiveles(n: number) {
    if (!e || n === e.niveles.length) return;
    if (e.criterios.some((c) => c.niveles.some(Boolean)) && !confirm(tr.cambiarNiveles)) return;
    const rangos = rangosParejos(n);
    const nombres = n === 4 ? base : undefined;
    cambiarEtapa({
      niveles: rangos.map((r, i) => ({ nombre: nombres?.[i] ?? e.niveles[i]?.nombre ?? `${tr.nombreNivel} ${i + 1}`, ...r })),
      criterios: e.criterios.map((c) => ({ ...c, niveles: Array.from({ length: n }, (_, i) => c.niveles[i] ?? "") })),
    });
  }

  async function generar() {
    if (!e) return;
    if (e.criterios.length && !confirm(tp.modelo.confirmarReemplazo)) return;
    setGenerando(e.id);
    setErrorIA("");
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/rubrica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descripcion, etapa: e, niveles: e.niveles, ...prompt[e.id] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(j.criterios)) throw new Error(j.error || tp.modelo.noSeGenero);
      cambiarEtapa({ criterios: j.criterios });
    } catch (err) {
      setErrorIA(err instanceof Error ? err.message : tp.modelo.noSeGenero);
    } finally {
      setGenerando(null);
    }
  }

  function guardar() {
    setEstado("guardando");
    iniciar(async () => {
      const r = await guardarRubricas(proyectoId, { etapas: etapas.map((x) => ({ id: x.id, niveles: x.niveles, criterios: x.criterios })) }).catch(() => ({ error: "general" as const }));
      if ("ok" in r) {
        setEstado("guardado");
        router.refresh();
      } else {
        setEstado("error");
        setMensaje(tp.errores[r.error] ?? tp.errores.general);
      }
    });
  }

  if (!e) return null;
  const sumaC = e.criterios.reduce((s, c) => s + (c.porcentaje > 0 ? c.porcentaje : 0), 0);
  const problema = revisarRubricaEtapa(e);
  const textoProblema = problema === "nivelesRango" ? tr.nivelesRango : problema ? tp.errores[problema] : undefined;
  const p = prompt[e.id] ?? { criterios: "", evidencias: "", indicaciones: "" };
  const ponerPrompt = (cambio: Partial<typeof p>) => setPrompt((x) => ({ ...x, [e.id]: { ...p, ...cambio } }));

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-base font-semibold text-slate-900">📋 {tr.titulo}</h2>
        <p className="text-sm text-slate-600">{tr.ayuda}</p>
      </div>

      {/* Etapas: una pestaña por etapa con el estado de su rúbrica. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr.etapa}>
        {etapas.map((x, i) => {
          const lista = revisarRubricaEtapa(x) === undefined;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={x.id === activa}
              onClick={() => setActiva(x.id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ring-2 transition ${
                x.id === activa ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
              }`}
            >
              <span aria-hidden>{ICONO_ETAPA[x.tipo]}</span>
              <span>
                <span className="block font-semibold text-slate-900">
                  {i + 1}. {x.nombre}
                </span>
                <span className={`block text-xs ${lista ? "text-acierto" : "text-aviso"}`}>{lista ? tr.lista : tr.pendiente}</span>
              </span>
            </button>
          );
        })}
      </div>

      {(evaluadasPorEtapa[e.id] ?? 0) > 0 && <p className="rounded-lg bg-aviso-suave p-3 text-sm text-aviso">{formato(tp.modelo.avisoEvaluadas, { n: evaluadasPorEtapa[e.id] })}</p>}

      {/* Niveles de desempeño con su rango */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="niveles">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="niveles" className="text-sm font-semibold text-slate-900">
              🎚️ {tr.niveles}
            </h3>
            <p className="text-xs text-slate-500">{tr.nivelesAyuda}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              {tr.cuantos}
              <select value={e.niveles.length} onChange={(ev) => cuantosNiveles(Number(ev.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
                {Array.from({ length: MAX_NIVELES - MIN_NIVELES + 1 }, (_, i) => MIN_NIVELES + i).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Boton type="button" variante="fantasma" className="px-3 py-1.5" onClick={() => cambiarEtapa({ niveles: e.niveles.map((n, i) => ({ ...n, ...rangosParejos(e.niveles.length)[i] })) })}>
              {tr.repartirRangos}
            </Boton>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {e.niveles.map((n, i) => (
            <div key={i} className={`rounded-lg p-3 ring-1 ring-slate-200 ${tonoNivel(i, e.niveles.length)}`}>
              <label className="block text-[11px] font-semibold text-slate-600">
                {tr.nombreNivel} {i + 1}
                <input value={n.nombre} maxLength={40} onChange={(ev) => cambiarNivel(i, { nombre: ev.target.value })} className={`${campo} bg-white`} />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["min", "max"] as const).map((k) => (
                  <label key={k} className="block text-[11px] font-semibold text-slate-600">
                    {k === "min" ? tr.desde : tr.hasta} (%)
                    <input type="number" min={0} max={100} value={n[k]} onChange={(ev) => cambiarNivel(i, { [k]: Number(ev.target.value) })} className={`${campo} bg-white`} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prompt para la IA */}
      <section className="rounded-xl bg-violet-50 p-5 ring-1 ring-violet-200" aria-labelledby="ia">
        <h3 id="ia" className="text-sm font-semibold text-violet-950">
          ✨ {tr.ia}
        </h3>
        <p className="text-xs text-violet-900">{tr.iaAyuda}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700">
            {tr.criteriosIA}
            <TextoAjustable minFilas={3} value={p.criterios} onChange={(ev) => ponerPrompt({ criterios: ev.target.value })} className={`${campo} bg-white`} placeholder={tr.ejemploCriteriosIA} />
          </label>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              {tr.evidenciasIA}
              <TextoAjustable value={p.evidencias} onChange={(ev) => ponerPrompt({ evidencias: ev.target.value })} className={`${campo} bg-white`} placeholder={tr.ejemploEvidenciasIA} />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              {tr.indicacionesIA}
              <TextoAjustable value={p.indicaciones} onChange={(ev) => ponerPrompt({ indicaciones: ev.target.value })} className={`${campo} bg-white`} placeholder={tr.ejemploIndicacionesIA} />
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Boton type="button" onClick={generar} disabled={generando !== null}>
            {generando ? tr.generando : tr.generar}
          </Boton>
          <span className="text-xs text-violet-900">{tp.sinCreditos}</span>
        </div>
        {errorIA && <p className="mt-2 rounded-lg bg-error-suave p-2 text-sm text-error">{errorIA}</p>}
      </section>

      {/* Tabla de la rúbrica: elementos en renglones, niveles en columnas. */}
      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200" aria-labelledby="tabla">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h3 id="tabla" className="text-sm font-semibold text-slate-900">
            {tr.tabla} · {e.nombre}
          </h3>
          <span className={`text-xs font-semibold ${Math.abs(sumaC - 100) < 0.05 ? "text-acierto" : "text-aviso"}`}>
            {formato(tp.modelo.sumaElementos, { s: Math.round(sumaC * 10) / 10 })} · {formato(tr.total, { p: Math.round(sumaC * 10) / 10 })}
          </span>
        </div>
        {e.criterios.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">{tr.sinElementos}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-700">
                  <th className="w-64 border-b border-slate-200 px-3 py-2">{tr.elemento}</th>
                  {e.niveles.map((n, i) => (
                    <th key={i} className={`border-b border-l border-slate-200 px-3 py-2 ${tonoNivel(i, e.niveles.length)}`}>
                      <span className="block">{n.nombre}</span>
                      <span className="block font-normal text-slate-500">{formato(tr.rango, { a: n.min, b: n.max })}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.criterios.map((c, k) => (
                  <tr key={c.id} className="align-top">
                    <td className="border-b border-slate-200 px-3 py-2">
                      <TextoAjustable unaLinea value={c.nombre} aria-label={tp.modelo.elemento} onChange={(ev) => cambiarCriterio(k, { nombre: ev.target.value })} className={`${campo} font-semibold`} />
                      <TextoAjustable value={c.descripcion} aria-label={tp.modelo.que} onChange={(ev) => cambiarCriterio(k, { descripcion: ev.target.value })} className={`${campo} text-xs`} />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          aria-label={tp.modelo.porcentaje}
                          value={c.porcentaje}
                          onChange={(ev) => cambiarCriterio(k, { porcentaje: Number(ev.target.value) })}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-slate-500">% · {formato(tr.puntos, { p: c.porcentaje })}</span>
                        <Boton
                          type="button"
                          variante="fantasma"
                          className="ml-auto px-2 py-1 text-error hover:bg-error-suave"
                          aria-label={tp.modelo.quitarElemento}
                          onClick={() => cambiarEtapa({ criterios: e.criterios.filter((_, x) => x !== k) })}
                        >
                          ✕
                        </Boton>
                      </div>
                    </td>
                    {e.niveles.map((n, i) => (
                      <td key={i} className={`border-b border-l border-slate-200 px-2 py-2 ${tonoNivel(i, e.niveles.length)}`}>
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                          {formato(tr.rangoPuntos, { a: puntosElemento(n.min, c.porcentaje), b: puntosElemento(n.max, c.porcentaje) })}
                        </span>
                        <TextoAjustable
                          minFilas={3}
                          aria-label={`${c.nombre} · ${n.nombre}`}
                          value={c.niveles[i] ?? ""}
                          onChange={(ev) => cambiarCriterio(k, { niveles: e.niveles.map((_, y) => (y === i ? ev.target.value : (c.niveles[y] ?? ""))) })}
                          className={`${campo} bg-white text-xs`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <Boton
            type="button"
            variante="secundario"
            className="px-3 py-1.5"
            disabled={e.criterios.length >= MAX_CRITERIOS}
            onClick={() =>
              cambiarEtapa({ criterios: [...e.criterios, { id: nuevoIdCorto("c"), nombre: "", descripcion: "", porcentaje: 0, niveles: e.niveles.map(() => "") }] })
            }
          >
            + {tp.modelo.agregarElemento}
          </Boton>
          {e.criterios.length > 0 && (
            <Boton
              type="button"
              variante="fantasma"
              className="px-3 py-1.5"
              onClick={() => {
                const reparto = repartirCien(e.criterios.map((c) => (sumaC > 0 ? c.porcentaje : 1)));
                cambiarEtapa({ criterios: e.criterios.map((c, k) => ({ ...c, porcentaje: reparto[k] })) });
              }}
            >
              {tp.modelo.repartir}
            </Boton>
          )}
        </div>
      </section>

      {/* Barra fija para guardar, con el aviso de lo que falta. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-sm" role="status">
            {estado === "error" ? (
              <span className="text-error">{mensaje}</span>
            ) : estado === "guardado" ? (
              <span className="text-acierto">✓ {tr.guardado}</span>
            ) : textoProblema ? (
              <span className="text-aviso">
                ⚠ {e.nombre}: {textoProblema}
              </span>
            ) : null}
          </p>
          <Boton type="button" onClick={guardar} disabled={pendiente || estado === "guardando"}>
            {estado === "guardando" ? tp.modelo.guardando : tr.guardar}
          </Boton>
          {estado === "guardado" && (
            <Link href={`/profesor/proyectos/${proyectoId}`} className="rounded-lg bg-tinta-50 px-3 py-2 text-sm font-semibold text-tinta-700 hover:bg-tinta-100">
              {formato(t.altaProyecto.flujo.siguiente, { paso: `C. ${t.altaProyecto.flujo.pasos.evaluacion[0]}` })}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
