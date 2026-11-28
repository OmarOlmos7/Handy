"use client";

// Paso A de la ruta del proyecto (profesor del curso): información general (contexto, título,
// objetivo, competencias), las etapas con sus fechas, instrucciones y entregables, la ponderación
// de cada etapa, los profesores evaluadores y los equipos. La rúbrica de cada etapa va en el paso B.
import { TextoAjustable } from "./texto-ajustable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarProyecto, guardarModelo, invitarEvaluador, quitarEvaluador } from "@/app/acciones-proyecto";
import { formato } from "@/lib/i18n/idiomas";
import {
  ICONO_ETAPA,
  MAX_ENTREGABLES,
  MAX_ETAPAS,
  TIPOS_ETAPA,
  nuevoIdCorto,
  repartirCien,
  revisarModelo,
  revisarRubricaEtapa,
  sumaPesos,
  valoresTipoEtapa,
} from "@/lib/proyectos";
import type { EntregableProyecto, EquipoProyecto, EtapaProyecto, TipoEtapaProyecto } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

const COLORES_ETAPA = ["bg-tinta-500", "bg-emerald-500", "bg-amber-500", "bg-fuchsia-500", "bg-sky-500", "bg-orange-500", "bg-violet-500", "bg-teal-500", "bg-rose-500", "bg-lime-500"];

type Evaluador = { id: string; nombre: string; correo: string };

export function ModeloProyecto({
  proyectoId,
  inicial,
  alumnos,
  evaluadoresIniciales,
  grupoId,
}: {
  proyectoId: string;
  inicial: { titulo: string; descripcion: string; objetivo?: string; competencias?: string[]; etapas: EtapaProyecto[]; equipos: EquipoProyecto[] };
  alumnos: { matricula: string; nombre: string }[];
  /** El dueño primero. */
  evaluadoresIniciales: Evaluador[];
  grupoId: string;
}) {
  const { t } = useTextos();
  const tp = t.proyecto;
  const tm = tp.modelo;
  const ti = t.altaProyecto.info;
  const router = useRouter();
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [objetivo, setObjetivo] = useState(inicial.objetivo ?? "");
  const [competencias, setCompetencias] = useState((inicial.competencias ?? []).join("\n"));
  const [etapas, setEtapas] = useState<EtapaProyecto[]>(inicial.etapas);
  const [equipos, setEquipos] = useState<EquipoProyecto[]>(inicial.equipos);
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>(evaluadoresIniciales);
  const [correo, setCorreo] = useState("");
  const [errorEvaluador, setErrorEvaluador] = useState("");
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "error">("listo");
  const [mensaje, setMensaje] = useState("");
  const [tamanoEquipo, setTamanoEquipo] = useState(4);
  const [pendiente, iniciar] = useTransition();

  const cambiado = () => estado !== "listo" && setEstado("listo");
  const cambiarEtapa = (id: string, cambio: Partial<EtapaProyecto>) => {
    setEtapas((xs) => xs.map((e) => (e.id === id ? { ...e, ...cambio } : e)));
    cambiado();
  };
  const cambiarEntregable = (etapaId: string, i: number, cambio: Partial<EntregableProyecto>) => {
    setEtapas((xs) => xs.map((e) => (e.id === etapaId ? { ...e, entregables: (e.entregables ?? []).map((d, k) => (k === i ? { ...d, ...cambio } : d)) } : e)));
    cambiado();
  };
  const mover = (i: number, d: -1 | 1) => {
    setEtapas((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const ys = [...xs];
      [ys[i], ys[j]] = [ys[j], ys[i]];
      return ys;
    });
    cambiado();
  };
  const agregarEtapa = (tipo: TipoEtapaProyecto) => {
    if (etapas.length >= MAX_ETAPAS) return;
    setEtapas((xs) => [...xs, { id: nuevoIdCorto("e"), nombre: tp.tipos[tipo], tipo, instrucciones: "", peso: 0, ...valoresTipoEtapa(tipo), criterios: [] }]);
    cambiado();
  };
  const repartirPesos = () => {
    const p = repartirCien(etapas.map(() => 1));
    setEtapas((xs) => xs.map((e, i) => ({ ...e, peso: p[i] })));
    cambiado();
  };

  function guardar() {
    setEstado("guardando");
    setMensaje("");
    iniciar(async () => {
      const r = await guardarModelo(proyectoId, { titulo, descripcion, objetivo, competencias: competencias.split("\n"), etapas, equipos }).catch(() => ({ error: "general" as const }));
      if ("ok" in r) {
        setEstado("guardado");
        router.refresh();
      } else {
        setEstado("error");
        setMensaje(tp.errores[r.error] ?? tp.errores.general);
      }
    });
  }

  async function invitar() {
    setErrorEvaluador("");
    const r = await invitarEvaluador(proyectoId, correo).catch(() => ({ error: "general" as const }));
    if ("ok" in r) {
      setEvaluadores((xs) => [...xs, r.evaluador]);
      setCorreo("");
    } else setErrorEvaluador(tp.errores[r.error] ?? tp.errores.general);
  }

  const conEquipo = new Set(equipos.flatMap((q) => q.matriculas));
  const sinEquipo = alumnos.filter((a) => !conEquipo.has(a.matricula));
  const nombreDe = (m: string) => alumnos.find((a) => a.matricula === m)?.nombre ?? m;
  const armarAlAzar = () => {
    const lista = [...alumnos].sort(() => Math.random() - 0.5);
    const n = Math.max(2, Math.min(10, tamanoEquipo));
    const cuantos = Math.max(1, Math.round(lista.length / n));
    const nuevos: EquipoProyecto[] = Array.from({ length: cuantos }, (_, i) => ({ id: nuevoIdCorto("q"), nombre: formato(tm.equipoN, { n: i + 1 }), matriculas: [] }));
    lista.forEach((a, i) => nuevos[i % cuantos].matriculas.push(a.matricula));
    setEquipos(nuevos);
    cambiado();
  };

  const suma = sumaPesos(etapas);
  // La rúbrica se revisa en su propio paso (B); aquí, lo de la información general.
  const revision = revisarModelo({ titulo, etapas, equipos });
  const problema = revision === "sinCriterios" || revision === "porcentajes" ? undefined : revision;
  const aviso = problema
    ? tp.errores[problema]
    : !objetivo.trim()
      ? ti.faltaObjetivo
      : etapas.some((e) => !e.fecha)
        ? ti.faltanFechas
        : undefined;

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">{tm.titulo}</h2>
        <p className="mt-1 text-sm text-slate-600">{tm.ayuda}</p>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium text-slate-700">
            {tm.tituloProyecto}
            <input value={titulo} onChange={(e) => (setTitulo(e.target.value), cambiado())} maxLength={140} className={campo} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ti.contexto}
            <TextoAjustable minFilas={3} value={descripcion} onChange={(e) => (setDescripcion(e.target.value), cambiado())} className={campo} placeholder={ti.ejemploContexto} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{ti.contextoAyuda}</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ti.objetivo}
            <TextoAjustable minFilas={2} value={objetivo} onChange={(e) => (setObjetivo(e.target.value), cambiado())} className={campo} placeholder={ti.ejemploObjetivo} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ti.competencias}
            <TextoAjustable minFilas={3} value={competencias} onChange={(e) => (setCompetencias(e.target.value), cambiado())} className={campo} placeholder={ti.ejemploCompetencias} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{ti.competenciasAyuda}</span>
          </label>
        </div>
      </section>

      {/* Ponderación: barra con el peso de cada etapa en la calificación final. */}
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="ponderacion">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ponderacion" className="text-base font-semibold text-slate-900">
            ⚖️ {tm.ponderacion}
          </h2>
          <Boton type="button" variante="secundario" className="px-3 py-1.5" onClick={repartirPesos} disabled={!etapas.length}>
            {tm.repartirIgual}
          </Boton>
        </div>
        <div className="mt-3 flex h-8 w-full overflow-hidden rounded-lg bg-slate-100" role="img" aria-label={formato(tm.ponderacionAyuda, { s: suma })}>
          {etapas.map((e, i) =>
            e.peso > 0 ? (
              <div
                key={e.id}
                className={`${COLORES_ETAPA[i % COLORES_ETAPA.length]} flex items-center justify-center overflow-hidden text-xs font-semibold whitespace-nowrap text-white`}
                style={{ width: `${Math.min(100, e.peso)}%` }}
                title={`${e.nombre}: ${e.peso} %`}
              >
                {e.peso >= 8 ? `${i + 1} · ${e.peso}%` : ""}
              </div>
            ) : null,
          )}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {etapas.map((e, i) => (
            <li key={e.id} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${COLORES_ETAPA[i % COLORES_ETAPA.length]}`} />
              {i + 1}. {e.nombre} · {e.peso} %
            </li>
          ))}
        </ul>
        <p className={`mt-2 text-sm font-medium ${Math.abs(suma - 100) < 0.05 ? "text-acierto" : "text-aviso"}`}>{formato(tm.ponderacionAyuda, { s: suma })}</p>
      </section>

      <section aria-labelledby="etapas" className="space-y-4">
        <div>
          <h2 id="etapas" className="text-base font-semibold text-slate-900">
            🧭 {tm.etapas}
          </h2>
          <p className="text-sm text-slate-600">{tm.etapasAyuda}</p>
        </div>
        {etapas.map((e, i) => {
          const rubricaLista = revisarRubricaEtapa(e) === undefined;
          return (
            <article key={e.id} className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white ${COLORES_ETAPA[i % COLORES_ETAPA.length]}`}>{i + 1}</span>
                <span className="text-xl" aria-hidden>
                  {ICONO_ETAPA[e.tipo]}
                </span>
                <span className="font-semibold text-slate-900">{formato(tm.etapa, { n: i + 1 })}</span>
                {e.cerradaEn && <span className="rounded-full bg-acierto-suave px-2 py-0.5 text-xs font-medium text-acierto">✓ {tp.alumno.estados.cerrada}</span>}
                <Link
                  href={`/profesor/proyectos/${proyectoId}/rubrica?etapa=${e.id}`}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${rubricaLista ? "bg-acierto-suave text-acierto" : "bg-aviso-suave text-aviso"}`}
                >
                  📋 {rubricaLista ? t.altaProyecto.rubrica.lista : `${t.altaProyecto.flujo.pasos.rubrica[0]}: ${t.altaProyecto.rubrica.pendiente}`}
                </Link>
                <span className="ml-auto flex gap-1">
                  <Boton type="button" variante="fantasma" className="px-2 py-1" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={tm.subir}>
                    ↑
                  </Boton>
                  <Boton type="button" variante="fantasma" className="px-2 py-1" onClick={() => mover(i, 1)} disabled={i === etapas.length - 1} aria-label={tm.bajar}>
                    ↓
                  </Boton>
                  <Boton
                    type="button"
                    variante="fantasma"
                    className="px-2 py-1 text-error hover:bg-error-suave"
                    onClick={() => {
                      if (!confirm(tm.confirmarQuitar)) return;
                      setEtapas((xs) => xs.filter((x) => x.id !== e.id));
                      cambiado();
                    }}
                  >
                    {tm.quitarEtapa}
                  </Boton>
                </span>
              </header>
              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    {tm.nombreEtapa}
                    <input value={e.nombre} maxLength={120} onChange={(ev) => cambiarEtapa(e.id, { nombre: ev.target.value })} className={campo} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    {tm.tipo}
                    <select
                      value={e.tipo}
                      onChange={(ev) => {
                        const tipo = ev.target.value as TipoEtapaProyecto;
                        cambiarEtapa(e.id, { tipo, ...valoresTipoEtapa(tipo) });
                      }}
                      className={campo}
                    >
                      {TIPOS_ETAPA.map((x) => (
                        <option key={x} value={x}>
                          {ICONO_ETAPA[x]} {tp.tipos[x]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {ti.fechaInicio}
                      <input type="date" value={e.fechaInicio ?? ""} max={e.fecha} onChange={(ev) => cambiarEtapa(e.id, { fechaInicio: ev.target.value || undefined })} className={campo} />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      {ti.fechaFin}
                      <input type="date" value={e.fecha ?? ""} min={e.fechaInicio} onChange={(ev) => cambiarEtapa(e.id, { fecha: ev.target.value || undefined })} className={campo} />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">
                    {tm.peso}
                    <input type="number" min={0} max={100} step={1} value={e.peso} onChange={(ev) => cambiarEtapa(e.id, { peso: Number(ev.target.value) })} className={campo} />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["porEquipo", tm.porEquipo, tm.porEquipoAyuda],
                      ["conEvidencia", tm.conEvidencia, tm.conEvidenciaAyuda],
                    ] as const
                  ).map(([clave, texto, ayuda]) => (
                    <label key={clave} className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-tinta-600" checked={e[clave]} onChange={(ev) => cambiarEtapa(e.id, { [clave]: ev.target.checked })} />
                      <span>
                        <span className="block font-medium text-slate-800">{texto}</span>
                        <span className="block text-xs text-slate-500">{ayuda}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  {tm.instrucciones}
                  <TextoAjustable minFilas={3} value={e.instrucciones} onChange={(ev) => cambiarEtapa(e.id, { instrucciones: ev.target.value })} className={campo} placeholder={tm.ejemploInstrucciones} />
                </label>

                {/* Entregables: espacios donde el alumno sube su evidencia y la comenta. */}
                {e.conEvidencia && (
                  <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900">📎 {ti.entregables}</h3>
                    <p className="text-xs text-slate-500">{ti.entregablesAyuda}</p>
                    {(e.entregables ?? []).length === 0 && <p className="mt-2 text-xs text-slate-500 italic">{ti.sinEntregables}</p>}
                    <ol className="mt-2 space-y-2">
                      {(e.entregables ?? []).map((d, k) => (
                        <li key={d.id} className="grid gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
                          <label className="block text-xs font-medium text-slate-600">
                            {formato(ti.entregable, { n: k + 1 })}
                            <input
                              value={d.nombre}
                              maxLength={120}
                              placeholder={ti.ejemploEntregable}
                              onChange={(ev) => cambiarEntregable(e.id, k, { nombre: ev.target.value })}
                              className={campo}
                            />
                          </label>
                          <label className="block text-xs font-medium text-slate-600">
                            {ti.descripcionEntregable}
                            <TextoAjustable value={d.descripcion} onChange={(ev) => cambiarEntregable(e.id, k, { descripcion: ev.target.value })} className={campo} />
                          </label>
                          <Boton
                            type="button"
                            variante="fantasma"
                            className="px-2 py-2 text-error hover:bg-error-suave sm:mt-5"
                            aria-label={ti.quitarEntregable}
                            onClick={() => cambiarEtapa(e.id, { entregables: (e.entregables ?? []).filter((_, x) => x !== k) })}
                          >
                            ✕
                          </Boton>
                        </li>
                      ))}
                    </ol>
                    {(e.entregables ?? []).length < MAX_ENTREGABLES && (
                      <Boton
                        type="button"
                        variante="secundario"
                        className="mt-2 px-3 py-1.5"
                        onClick={() => cambiarEtapa(e.id, { entregables: [...(e.entregables ?? []), { id: nuevoIdCorto("d"), nombre: "", descripcion: "" }] })}
                      >
                        + {ti.agregarEntregable}
                      </Boton>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {etapas.length < MAX_ETAPAS && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-700">+ {tm.agregarEtapa}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIPOS_ETAPA.map((tipo) => (
                <Boton key={tipo} type="button" variante="secundario" className="px-3 py-1.5" onClick={() => agregarEtapa(tipo)}>
                  {ICONO_ETAPA[tipo]} {tp.tipos[tipo]}
                </Boton>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="evaluadores">
        <h2 id="evaluadores" className="text-base font-semibold text-slate-900">
          👩‍🏫 {tm.evaluadores}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{tm.evaluadoresAyuda}</p>
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {evaluadores.map((ev, i) => (
            <li key={ev.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tinta-50 text-xs font-bold text-tinta-700">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{ev.nombre}</span>
                <span className="block truncate text-xs text-slate-500">{i === 0 ? tm.tu : ev.correo}</span>
              </span>
              {i > 0 && (
                <Boton
                  type="button"
                  variante="fantasma"
                  className="px-2 py-1 text-error hover:bg-error-suave"
                  onClick={async () => {
                    const r = await quitarEvaluador(proyectoId, ev.id);
                    if ("ok" in r) setEvaluadores((xs) => xs.filter((x) => x.id !== ev.id));
                  }}
                >
                  {tm.quitar}
                </Boton>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm font-medium text-slate-700">
            {tm.correo}
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className={campo} placeholder="profesor@escuela.edu.mx" />
          </label>
          <Boton type="button" variante="secundario" onClick={invitar} disabled={!correo.includes("@")}>
            + {tm.invitar}
          </Boton>
        </div>
        {errorEvaluador && <p className="mt-2 rounded-lg bg-error-suave p-2 text-sm text-error">{errorEvaluador}</p>}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="equipos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="equipos" className="text-base font-semibold text-slate-900">
            👥 {tm.equipos}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {tm.armarAzar}
            <input type="number" min={2} max={10} value={tamanoEquipo} onChange={(e) => setTamanoEquipo(Number(e.target.value))} className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            {tm.integrantes}
            <Boton type="button" variante="secundario" className="px-3 py-1.5" onClick={armarAlAzar} disabled={!alumnos.length}>
              {tm.armar}
            </Boton>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-600">{tm.equiposAyuda}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {equipos.map((q, i) => (
            <div key={q.id} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <input
                  aria-label={tm.nombreEquipo}
                  value={q.nombre}
                  onChange={(e) => (setEquipos((xs) => xs.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x))), cambiado())}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold"
                />
                <Boton type="button" variante="fantasma" className="px-2 py-1 text-error hover:bg-error-suave" aria-label={tm.quitar} onClick={() => (setEquipos((xs) => xs.filter((_, k) => k !== i)), cambiado())}>
                  ✕
                </Boton>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {q.matriculas.map((m) => (
                  <li key={m} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200">
                    {nombreDe(m)}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-error"
                      aria-label={tm.quitar}
                      onClick={() => (setEquipos((xs) => xs.map((x, k) => (k === i ? { ...x, matriculas: x.matriculas.filter((y) => y !== m) } : x))), cambiado())}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {sinEquipo.length > 0 && (
                <select
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                  value=""
                  onChange={(e) => {
                    const m = e.target.value;
                    if (!m) return;
                    setEquipos((xs) => xs.map((x, k) => (k === i ? { ...x, matriculas: [...x.matriculas, m] } : x)));
                    cambiado();
                  }}
                >
                  <option value="">+ {tm.integrantes}…</option>
                  {sinEquipo.map((a) => (
                    <option key={a.matricula} value={a.matricula}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <Boton
          type="button"
          variante="secundario"
          className="mt-3 px-3 py-1.5"
          onClick={() => (setEquipos((xs) => [...xs, { id: nuevoIdCorto("q"), nombre: formato(tm.equipoN, { n: xs.length + 1 }), matriculas: [] }]), cambiado())}
        >
          + {tm.agregarEquipo}
        </Boton>
        {sinEquipo.length > 0 && equipos.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {tm.sinEquipo}: {sinEquipo.map((a) => a.nombre).join(", ")}
          </p>
        )}
      </section>

      <div className="flex justify-start">
        <Boton
          type="button"
          variante="fantasma"
          className="text-error hover:bg-error-suave"
          onClick={async () => {
            if (!confirm(tm.confirmarBorrar)) return;
            const r = await borrarProyecto(proyectoId);
            if ("ok" in r) router.push(`/profesor/grupos/${grupoId}`);
          }}
        >
          {tm.borrar}
        </Boton>
      </div>

      {/* Barra fija para guardar, con el aviso de lo que falta. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-sm" role="status">
            {estado === "error" ? (
              <span className="text-error">{mensaje}</span>
            ) : estado === "guardado" ? (
              <span className="text-acierto">✓ {tm.guardado}</span>
            ) : aviso ? (
              <span className="text-aviso">⚠ {aviso}</span>
            ) : null}
          </p>
          <Boton type="button" onClick={guardar} disabled={pendiente || estado === "guardando"}>
            {estado === "guardando" ? tm.guardando : tm.guardar}
          </Boton>
          {estado === "guardado" && (
            <Link href={`/profesor/proyectos/${proyectoId}/rubrica`} className="rounded-lg bg-tinta-50 px-3 py-2 text-sm font-semibold text-tinta-700 hover:bg-tinta-100">
              {formato(t.altaProyecto.flujo.siguiente, { paso: `B. ${t.altaProyecto.flujo.pasos.rubrica[0]}` })}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
