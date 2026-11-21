"use client";

// Mapa de navegación del temario. Capa 1: las unidades como agrupamientos de color con sus temas y
// las líneas entre temas afines. Capa 2: una unidad con sus temas y subtemas, y los temas afines
// de otras unidades en el borde. El color del anillo de cada nodo es el avance (actividades
// calificadas). El alumno arma su ruta de estudio eligiendo nodos.
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { detectarRelaciones, guardarRuta } from "@/app/acciones-mapa";
import { formato } from "@/lib/i18n/idiomas";
import {
  acomodoGeneral,
  acomodoUnidadConAfines,
  colorAvance,
  colorUnidad,
  nodosTemario,
  relacionesDeUnidades,
  temaDe,
  unidadDe,
  type AvanceNodo,
  type NodoTemario,
  type Punto,
} from "@/lib/mapa-temario";
import type { Asignatura, RelacionTemario } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

const corto = (s: string, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function MapaTemario({
  asignatura,
  relaciones,
  avance,
  modo,
  enlaceActividad,
  rutaInicial = [],
  grupoId,
  relacionesIA,
}: {
  asignatura: Pick<Asignatura, "id" | "nombre" | "unidades">;
  relaciones: RelacionTemario[];
  avance: Record<string, AvanceNodo>;
  modo: "profesor" | "alumno";
  /** Prefijo del enlace a una actividad ("/profesor/actividades/" o "/alumno/reporte/"). */
  enlaceActividad: string;
  rutaInicial?: string[];
  /** Curso del alumno (para guardar su ruta). */
  grupoId?: string;
  /** true si las relaciones ya las propuso la IA. */
  relacionesIA?: boolean;
}) {
  const { t } = useTextos();
  const tm = t.profesor.mapa;
  const nodos = useMemo(() => nodosTemario(asignatura), [asignatura]);
  const porClave = useMemo(() => new Map(nodos.map((n) => [n.clave, n])), [nodos]);
  const [capa, setCapa] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [ruta, setRuta] = useState<string[]>(rutaInicial);
  const [rutaGuardada, setRutaGuardada] = useState(JSON.stringify(rutaInicial));
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const [instrucciones, setInstrucciones] = useState("");

  const general = useMemo(() => acomodoGeneral(asignatura, relaciones), [asignatura, relaciones]);
  // Unidades relacionadas por completo: se unen de centro a centro, sin las líneas de cada tema.
  const completas = useMemo(() => relacionesDeUnidades(asignatura, relaciones).filter((x) => x.completa), [asignatura, relaciones]);
  const paresCompletos = useMemo(
    () => new Set(completas.flatMap((x) => [`${asignatura.unidades[x.a].nombre}|${asignatura.unidades[x.b].nombre}`, `${asignatura.unidades[x.b].nombre}|${asignatura.unidades[x.a].nombre}`])),
    [asignatura, completas],
  );
  const conCentro = new Set(completas.flatMap((x) => [x.a, x.b]));
  const deUnidad = useMemo(() => (capa === null ? null : acomodoUnidadConAfines(asignatura, capa, relaciones)), [asignatura, capa, relaciones]);
  const acomodo = deUnidad ?? general;
  const unidadCapa = capa === null ? null : asignatura.unidades[capa];

  // En la capa general, los subtemas se dibujan en su tema.
  const punto = (clave: string): Punto | undefined => acomodo.posiciones[clave] ?? (capa === null ? acomodo.posiciones[temaDe(clave)] : undefined);

  // Líneas: secuencia de temas dentro de cada unidad y temas afines.
  const lineas = useMemo(() => {
    const l: { a: string; b: string; tipo: "secuencia" | "afin" | "jerarquia"; motivo?: string }[] = [];
    const unidades = capa === null ? asignatura.unidades : [asignatura.unidades[capa]];
    for (const u of unidades) {
      if (!u) continue;
      u.temas.forEach((tema, j) => {
        const ct = `${u.nombre} › ${tema.nombre}`;
        if (j > 0) l.push({ a: `${u.nombre} › ${u.temas[j - 1].nombre}`, b: ct, tipo: "secuencia" });
        if (capa !== null) for (const s of tema.subtemas) l.push({ a: ct, b: `${ct} › ${s}`, tipo: "jerarquia" });
      });
    }
    const vistas = new Set<string>();
    for (const r of relaciones) {
      let a = r.a;
      let b = r.b;
      if (capa === null) {
        if (!a.includes(" › ") || !b.includes(" › ") || paresCompletos.has(`${unidadDe(a)}|${unidadDe(b)}`)) continue;
        a = temaDe(a);
        b = temaDe(b);
      } else if (unidadDe(a) !== unidadCapa?.nombre || unidadDe(b) !== unidadCapa?.nombre) continue;
      if (a === b) continue;
      const k = [a, b].sort().join("|");
      if (vistas.has(k)) continue;
      vistas.add(k);
      l.push({ a, b, tipo: "afin", motivo: r.motivo });
    }
    return l;
  }, [asignatura, relaciones, capa, unidadCapa, paresCompletos]);

  const visibles = nodos.filter((n) => (capa === null ? n.tipo === "tema" : n.unidad === capa && n.tipo !== "unidad"));
  const sel = seleccion ? porClave.get(seleccion) : undefined;
  const avanceSel = seleccion ? avance[seleccion] : undefined;
  const afines = !seleccion
    ? []
    : sel?.tipo === "unidad"
    ? completas
        .filter((x) => x.a === sel.unidad || x.b === sel.unidad)
        .map((x) => ({ clave: asignatura.unidades[x.a === sel.unidad ? x.b : x.a].nombre, motivo: x.motivo }))
    : relaciones
        .filter((r) => r.a === seleccion || r.b === seleccion || (sel?.tipo === "tema" && (temaDe(r.a) === seleccion || temaDe(r.b) === seleccion)))
        .map((r) => ({ clave: r.a === seleccion || temaDe(r.a) === seleccion ? r.b : r.a, motivo: r.motivo }))
        .filter((x, i, xs) => x.clave !== seleccion && porClave.has(x.clave) && xs.findIndex((y) => y.clave === x.clave) === i);

  const elegir = (clave: string) => {
    setSeleccion(clave);
    setAviso(null);
  };
  const irA = (clave: string) => {
    const n = porClave.get(clave);
    if (!n) return;
    setCapa(n.tipo === "unidad" ? n.unidad : n.unidad);
    setSeleccion(n.tipo === "unidad" ? null : clave);
  };

  const enRuta = (clave: string) => ruta.indexOf(clave);
  const alternarRuta = (clave: string) => {
    setAviso(null);
    setRuta((r) => (r.includes(clave) ? r.filter((x) => x !== clave) : [...r, clave]));
  };
  const mover = (i: number, d: -1 | 1) =>
    setRuta((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const c = [...r];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const rutaSinGuardar = JSON.stringify(ruta) !== rutaGuardada;

  function guardar() {
    if (!grupoId) return;
    iniciar(async () => {
      try {
        const r = await guardarRuta(grupoId, ruta);
        if ("ok" in r) {
          setRutaGuardada(JSON.stringify(ruta));
          setAviso({ ok: true, texto: tm.rutaGuardada });
        } else setAviso({ ok: false, texto: tm.noSeGuardo });
      } catch {
        setAviso({ ok: false, texto: tm.noSeGuardo });
      }
    });
  }

  function relacionar() {
    iniciar(async () => {
      try {
        const r = await detectarRelaciones(asignatura.id, instrucciones);
        if ("ok" in r) setInstrucciones("");
        setAviso("ok" in r ? { ok: true, texto: formato(tm.relacionesListas, { n: r.n }) } : { ok: false, texto: r.error === "sinIA" ? tm.sinIA : r.error === "noEncontrada" || r.error === "fallaIA" ? tm.noSeRelaciono : r.error });
      } catch {
        setAviso({ ok: false, texto: tm.noSeRelaciono });
      }
    });
  }

  // Puntos de la ruta en la capa actual (en la general, cada subtema en su tema).
  const puntosRuta = ruta.map((c) => ({ clave: c, p: capa === null || porClave.get(c)?.unidad === capa ? punto(c) : undefined })).filter((x) => x.p);

  const nombreTipo = (n: NodoTemario) => (n.tipo === "unidad" ? tm.unidad : n.tipo === "tema" ? tm.tema : tm.subtema);
  const textoAvance = (p: number | null | undefined) =>
    p === null || p === undefined ? tm.sinActividades : p >= 80 ? tm.dominado : p >= 60 ? tm.enProceso : tm.porReforzar;

  return (
    // A todo el ancho de la ventana (fuera del ancho máximo de la página), centrado.
    <div className="relative left-1/2 w-[calc(100vw-2.5rem)] max-w-[1900px] -translate-x-1/2 space-y-3">
      {/* Barra: capa actual, leyenda y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label={tm.capas}>
          <button
            type="button"
            onClick={() => {
              setCapa(null);
              setSeleccion(null);
            }}
            className={`rounded-lg px-3 py-1.5 font-medium ${capa === null ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {tm.todas}
          </button>
          {asignatura.unidades.map((u, i) => (
            <button
              key={u.nombre}
              type="button"
              onClick={() => {
                setCapa(i);
                setSeleccion(null);
              }}
              title={u.nombre}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium ${capa === i ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorUnidad(i).nodo }} />
              {formato(tm.unidadN, { n: i + 1 })}
            </button>
          ))}
        </nav>
        {modo === "profesor" && (
          <button type="button" onClick={relacionar} disabled={ocupado} className="rounded-lg px-3 py-1.5 text-sm font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50 disabled:opacity-60">
            {ocupado ? tm.relacionando : relacionesIA ? tm.volverRelacionar : tm.relacionar}
          </button>
        )}
      </div>
      {/* Instrucciones para la IA: mejora las relaciones actuales */}
      {modo === "profesor" && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (instrucciones.trim()) relacionar();
          }}
        >
          <label htmlFor="instrucciones-mapa" className="sr-only">
            {tm.instrucciones}
          </label>
          <input
            id="instrucciones-mapa"
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            maxLength={800}
            placeholder={tm.instruccionesEjemplo}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-tinta-500 focus:outline-none focus:ring-2 focus:ring-tinta-200"
          />
          <button type="submit" disabled={ocupado || !instrucciones.trim()} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700 disabled:opacity-50">
            {ocupado ? tm.relacionando : tm.sugerirRelaciones}
          </button>
        </form>
      )}

      <p className="text-sm text-slate-500">{capa === null ? tm.ayudaGeneral : tm.ayudaUnidad}</p>
      {aviso && <p className={`text-sm font-medium ${aviso.ok ? "text-acierto" : "text-error"}`}>{aviso.texto}</p>}

      <div className={capa === null ? "relative space-y-4" : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start"}>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {unidadCapa && (
            <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold" style={{ color: colorUnidad(capa!).nodo }}>
              {unidadCapa.nombre}
            </p>
          )}
          <svg viewBox={`0 0 ${acomodo.ancho} ${acomodo.alto}`} className="mx-auto block h-auto max-h-[82vh] w-full select-none" role="img" aria-label={tm.titulo}>
            {/* Agrupamientos: unidades (capa general) o temas con sus subtemas (capa de unidad) */}
            {acomodo.grupos.map((g) => {
              const c = colorUnidad(g.unidad);
              return (
                <g key={g.clave}>
                  <circle
                    cx={g.x}
                    cy={g.y}
                    r={g.r}
                    fill={c.fondo}
                    fillOpacity={capa === null ? 0.75 : 0.45}
                    stroke={c.borde}
                    strokeWidth={1.5}
                    className={capa === null ? "cursor-pointer" : ""}
                    onClick={() => capa === null && setCapa(g.unidad)}
                  >
                    {capa === null && <title>{`${g.nombre} — ${tm.abrirUnidad}`}</title>}
                  </circle>
                  {capa === null && (
                    <text x={g.x} y={g.y - g.r - 10} textAnchor="middle" className="cursor-pointer fill-slate-700 text-[15px] font-semibold" onClick={() => setCapa(g.unidad)}>
                      {corto(g.nombre, 34)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Líneas */}
            {lineas.map((l, i) => {
              const a = punto(l.a);
              const b = punto(l.b);
              if (!a || !b) return null;
              const resaltada = seleccion && (l.a === seleccion || l.b === seleccion || temaDe(seleccion) === l.a || temaDe(seleccion) === l.b);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={l.tipo === "afin" ? (resaltada ? "#1e293b" : "#475569") : "#64748b"}
                  strokeOpacity={l.tipo === "afin" ? (resaltada ? 0.95 : 0.55) : 0.45}
                  strokeWidth={l.tipo === "afin" ? (resaltada ? 2.6 : 1.4) : 1.1}
                  strokeDasharray={l.tipo === "secuencia" ? "4 4" : undefined}
                >
                  {l.motivo && <title>{l.motivo}</title>}
                </line>
              );
            })}

            {/* Unidades relacionadas por completo: de centro a centro */}
            {capa === null &&
              completas.map((x) => {
                const ga = acomodo.grupos[x.a];
                const gb = acomodo.grupos[x.b];
                if (!ga || !gb) return null;
                const claveA = asignatura.unidades[x.a].nombre;
                const claveB = asignatura.unidades[x.b].nombre;
                const resaltada = seleccion === claveA || seleccion === claveB;
                return (
                  <line
                    key={`u${x.a}-${x.b}`}
                    x1={ga.x}
                    y1={ga.y}
                    x2={gb.x}
                    y2={gb.y}
                    stroke="#1e293b"
                    strokeOpacity={resaltada ? 0.9 : 0.5}
                    strokeWidth={resaltada ? 7 : 5}
                    strokeLinecap="round"
                  >
                    <title>{`${claveA} ↔ ${claveB}: ${tm.relacionUnidades}${x.motivo ? ` — ${x.motivo}` : ""}`}</title>
                  </line>
                );
              })}

            {/* Unidades afines alrededor de la unidad abierta: las más relacionadas, más cerca */}
            {deUnidad?.enlaces.map((e, i) => {
              const a = deUnidad.posiciones[e.a];
              const b = deUnidad.posiciones[e.b];
              const otro = porClave.get(e.b);
              if (!a || !b || !otro) return null;
              const resaltada = seleccion === e.a || seleccion === e.b;
              return (
                <line
                  key={`e${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={e.completa ? "#1e293b" : colorUnidad(otro.unidad).borde}
                  strokeWidth={e.completa ? (resaltada ? 7 : 5) : resaltada ? 2.4 : 1.3}
                  strokeOpacity={e.completa ? (resaltada ? 0.9 : 0.55) : resaltada ? 1 : 0.75}
                  strokeLinecap="round"
                  strokeDasharray={e.completa ? undefined : "3 4"}
                >
                  {e.motivo && <title>{e.motivo}</title>}
                </line>
              );
            })}
            {/* Nodo de la unidad abierta, si se relaciona completa con otra */}
            {deUnidad && unidadCapa && deUnidad.enlaces.some((e) => e.a === unidadCapa.nombre) && (
              <g className="cursor-pointer" onClick={() => elegir(unidadCapa.nombre)}>
                <title>{`${unidadCapa.nombre} — ${tm.relacionUnidades}`}</title>
                <circle cx={deUnidad.posiciones[unidadCapa.nombre].x} cy={deUnidad.posiciones[unidadCapa.nombre].y} r={18} fill={colorUnidad(capa!).nodo} stroke="#fff" strokeWidth={2.5} />
                <text x={deUnidad.posiciones[unidadCapa.nombre].x} y={deUnidad.posiciones[unidadCapa.nombre].y + 5} textAnchor="middle" className="pointer-events-none fill-white text-[14px] font-bold">
                  {formato(tm.unidadCorta, { n: capa! + 1 })}
                </text>
              </g>
            )}
            {deUnidad?.afines.map((g) => {
              const c = colorUnidad(g.unidad);
              return (
                <g key={`a${g.clave}`}>
                  <circle cx={g.x} cy={g.y} r={g.r} fill={c.fondo} fillOpacity={0.7} stroke={c.borde} strokeWidth={1.5} className="cursor-pointer" onClick={() => irA(g.clave)}>
                    <title>{`${g.nombre} — ${tm.abrirUnidad}`}</title>
                  </circle>
                  <text x={g.x} y={g.y - g.r - 8} textAnchor="middle" className="cursor-pointer fill-slate-700 text-[17px] font-semibold" onClick={() => irA(g.clave)}>
                    {corto(g.nombre, 24)}
                  </text>
                  {g.nodos.map((clave) => {
                    const p = deUnidad.posiciones[clave];
                    const n = porClave.get(clave);
                    if (!p || !n) return null;
                    const activo = seleccion === clave;
                    return (
                      <g key={clave} className="cursor-pointer" onClick={() => elegir(clave)}>
                        <title>{n.nombre}</title>
                        <circle cx={p.x} cy={p.y} r={n.tipo === "unidad" ? 17 : 9} fill={c.nodo} stroke="#fff" strokeWidth={activo ? 3 : n.tipo === "unidad" ? 2.5 : 1.5} />
                        {n.tipo === "unidad" && (
                          <text x={p.x} y={p.y + 5} textAnchor="middle" className="pointer-events-none fill-white text-[13px] font-bold">
                            {formato(tm.unidadCorta, { n: n.unidad + 1 })}
                          </text>
                        )}
                        {n.tipo !== "unidad" && (
                          <text
                            x={p.x}
                            y={p.y + 24}
                            textAnchor="middle"
                            className="pointer-events-none fill-slate-700 text-[13px]"
                            style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: 3 }}
                          >
                            {corto(n.nombre, 20)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Ruta del alumno */}
            {puntosRuta.length > 1 && (
              <polyline
                points={puntosRuta.map((x) => `${x.p!.x},${x.p!.y}`).join(" ")}
                fill="none"
                stroke="#2563eb"
                strokeWidth={3.5}
                strokeOpacity={0.75}
                strokeLinejoin="round"
                strokeDasharray="10 6"
              />
            )}

            {/* Nodos */}
            {visibles.map((n) => {
              const p = punto(n.clave);
              if (!p) return null;
              const c = colorUnidad(n.unidad);
              const av = avance[n.clave];
              const r = capa === null ? 11 : n.tipo === "tema" ? 15 : 9;
              const activo = seleccion === n.clave;
              const iRuta = enRuta(n.clave);
              return (
                <g key={n.clave} className="cursor-pointer" onClick={() => elegir(n.clave)}>
                  <title>{n.nombre}</title>
                  {activo && <circle cx={p.x} cy={p.y} r={r + 9} fill="#0f172a" fillOpacity={0.12} />}
                  <circle cx={p.x} cy={p.y} r={r + 3.5} fill="none" stroke={colorAvance(av?.promedio)} strokeWidth={av?.actividades.length ? 3.5 : 0} />
                  <circle cx={p.x} cy={p.y} r={r} fill={c.nodo} stroke="#fff" strokeWidth={activo ? 3 : 1.5} />
                  {av && av.actividades.length > 0 && (
                    <text x={p.x} y={p.y + 3.5} textAnchor="middle" className="pointer-events-none fill-white text-[10px] font-bold">
                      {av.actividades.length}
                    </text>
                  )}
                  {iRuta >= 0 && (
                    <g>
                      <circle cx={p.x + r} cy={p.y - r} r={8} fill="#2563eb" stroke="#fff" strokeWidth={1.5} />
                      <text x={p.x + r} y={p.y - r + 3.5} textAnchor="middle" className="pointer-events-none fill-white text-[9px] font-bold">
                        {iRuta + 1}
                      </text>
                    </g>
                  )}
                  <text
                    x={p.x}
                    y={capa !== null && n.tipo === "tema" && p.y > (acomodo.posiciones[unidadCapa?.nombre ?? ""]?.y ?? acomodo.alto / 2) + 1 ? p.y - r - 7 : p.y + r + 14}
                    textAnchor="middle"
                    className={`pointer-events-none ${n.tipo === "tema" ? `fill-slate-800 font-semibold ${capa === null ? "text-[11px]" : "text-[15px]"}` : "fill-slate-600 text-[12px]"}`}
                    style={{ paintOrder: "stroke", stroke: "rgba(255,255,255,0.85)", strokeWidth: 3 }}
                  >
                    {corto(n.nombre, capa === null ? 18 : n.tipo === "tema" ? 28 : 24)}
                  </text>
                </g>
              );
            })}

            {/* Nodo central de las unidades con relación completa */}
            {capa === null &&
              acomodo.grupos
                .filter((g) => conCentro.has(g.unidad))
                .map((g) => {
                  const c = colorUnidad(g.unidad);
                  const av = avance[g.clave];
                  const activo = seleccion === g.clave;
                  return (
                    <g key={`c${g.clave}`} className="cursor-pointer" onClick={() => elegir(g.clave)}>
                      <title>{`${g.nombre} — ${tm.relacionUnidades}`}</title>
                      {activo && <circle cx={g.x} cy={g.y} r={30} fill="#0f172a" fillOpacity={0.12} />}
                      <circle cx={g.x} cy={g.y} r={22} fill="none" stroke={colorAvance(av?.promedio)} strokeWidth={av?.actividades.length ? 4 : 0} />
                      <circle cx={g.x} cy={g.y} r={18} fill={c.nodo} stroke="#fff" strokeWidth={activo ? 3.5 : 2.5} />
                      <text x={g.x} y={g.y + 5} textAnchor="middle" className="pointer-events-none fill-white text-[14px] font-bold">
                        {formato(tm.unidadCorta, { n: g.unidad + 1 })}
                      </text>
                    </g>
                  );
                })}
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            {[
              [80, tm.dominado],
              [65, tm.enProceso],
              [10, tm.porReforzar],
              [null, tm.sinActividades],
            ].map(([p, texto]) => (
              <span key={String(texto)} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-[3px]" style={{ borderColor: colorAvance(p as number | null) }} />
                {texto}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden>
                <line x1="0" y1="3" x2="22" y2="3" stroke="#475569" strokeWidth="1.5" />
              </svg>
              {tm.afines}
            </span>
            {(capa === null ? completas.length > 0 : Boolean(deUnidad?.enlaces.some((e) => e.completa))) && (
              <span className="flex items-center gap-1.5">
                <svg width="22" height="8" aria-hidden>
                  <line x1="2" y1="4" x2="20" y2="4" stroke="#1e293b" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
                </svg>
                {tm.relacionUnidades}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden>
                <line x1="0" y1="3" x2="22" y2="3" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4 4" />
              </svg>
              {tm.secuencia}
            </span>
            <span>{modo === "alumno" ? tm.numeroAlumno : tm.numeroProfesor}</span>
          </div>
        </div>

        {/* Capa general: detalle del nodo sobre el mapa, a la derecha. Capa de unidad: columna a la
            derecha con el detalle y la tabla de temas. En pantallas chicas, debajo del mapa. */}
        {(sel || unidadCapa) && (
          <div className={capa === null ? "lg:absolute lg:right-3 lg:top-3 lg:max-h-[calc(100%-1.5rem)] lg:w-80 lg:overflow-y-auto lg:rounded-2xl lg:shadow-lg" : "space-y-4"}>
        {sel && (
          <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="space-y-3 text-sm">
                <button type="button" onClick={() => setSeleccion(null)} aria-label={tm.cerrar} className="float-right -mr-1 -mt-1 rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  ✕
                </button>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: colorUnidad(sel.unidad).nodo }}>
                    {nombreTipo(sel)} · {formato(tm.unidadN, { n: sel.unidad + 1 })}
                  </p>
                  <h3 className="mt-0.5 font-semibold text-slate-900">{sel.nombre}</h3>
                  {sel.tipo === "subtema" && sel.padre && <p className="text-xs text-slate-500">{porClave.get(sel.padre)?.nombre}</p>}
                </div>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: colorAvance(avanceSel?.promedio) }} />
                  <span className="font-medium">{textoAvance(avanceSel?.promedio)}</span>
                  {avanceSel?.promedio !== null && avanceSel?.promedio !== undefined && <span className="text-slate-500">· {avanceSel.promedio} %</span>}
                </p>
                <div>
                  <p className="text-xs font-medium text-slate-500">{tm.actividades}</p>
                  {avanceSel?.actividades.length ? (
                    <ul className="mt-1 space-y-1">
                      {avanceSel.actividades.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          {modo === "profesor" || a.porcentaje !== null ? (
                            <Link href={`${enlaceActividad}${a.id}`} className="truncate text-tinta-700 hover:underline">
                              {a.titulo}
                            </Link>
                          ) : (
                            <span className="truncate text-slate-700">{a.titulo}</span>
                          )}
                          <span className="shrink-0 text-xs font-semibold" style={{ color: colorAvance(a.porcentaje) }}>
                            {a.porcentaje !== null ? `${a.porcentaje} %` : modo === "alumno" && a.entregada ? tm.entregada : tm.pendiente}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-500">{tm.sinActividadesTema}</p>
                  )}
                </div>
                {afines.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">{sel.tipo === "unidad" ? tm.unidadesAfines : tm.temasAfines}</p>
                    <ul className="mt-1 space-y-1">
                      {afines.slice(0, 8).map((x) => {
                        const n = porClave.get(x.clave)!;
                        return (
                          <li key={x.clave}>
                            <button type="button" onClick={() => irA(x.clave)} className="flex w-full items-start gap-2 text-left hover:underline">
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorUnidad(n.unidad).nodo }} />
                              <span>
                                <span className="text-slate-800">{n.nombre}</span>
                                {x.motivo && <span className="block text-xs text-slate-500">{x.motivo}</span>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(capa === null || sel.tipo === "unidad" || sel.unidad !== capa) && (
                    <button type="button" onClick={() => irA(sel.clave)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                      {tm.verSubtemas}
                    </button>
                  )}
                  {modo === "alumno" && sel.tipo !== "unidad" && (
                    <button
                      type="button"
                      onClick={() => alternarRuta(sel.clave)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${enRuta(sel.clave) >= 0 ? "text-error ring-1 ring-error/40 hover:bg-error-suave" : "bg-tinta-600 text-white hover:bg-tinta-700"}`}
                    >
                      {enRuta(sel.clave) >= 0 ? tm.quitarDeRuta : tm.agregarARuta}
                    </button>
                  )}
                </div>
              </div>
          </aside>
        )}
        {unidadCapa && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">{tm.temasDeUnidad}</p>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-1.5 font-medium">{tm.tema}</th>
                  <th className="px-2 py-1.5 text-center font-medium">{tm.actividades}</th>
                  <th className="px-4 py-1.5 text-right font-medium">{tm.avance}</th>
                </tr>
              </thead>
              <tbody>
                {unidadCapa.temas.flatMap((t) => {
                  const ct = `${unidadCapa.nombre} › ${t.nombre}`;
                  return [ct, ...t.subtemas.map((x) => `${ct} › ${x}`)].map((clave) => {
                    const n = porClave.get(clave);
                    if (!n) return null;
                    const av = avance[clave];
                    const esTema = n.tipo === "tema";
                    return (
                      <tr key={clave} className={`${esTema ? "border-t border-slate-100" : ""} ${seleccion === clave ? "bg-tinta-50" : "hover:bg-slate-50"}`}>
                        <td className={`py-1.5 ${esTema ? "px-4 font-medium text-slate-800" : "pl-8 pr-4 text-xs text-slate-600"}`}>
                          <button type="button" onClick={() => elegir(clave)} className="flex items-center gap-2 text-left hover:underline">
                            {enRuta(clave) >= 0 && (
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-[9px] font-bold text-white">{enRuta(clave) + 1}</span>
                            )}
                            {n.nombre}
                          </button>
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs text-slate-500">{av?.actividades.length || "–"}</td>
                        <td className="px-4 py-1.5 text-right text-xs font-semibold" style={{ color: colorAvance(av?.promedio) }}>
                          {av?.promedio !== null && av?.promedio !== undefined ? `${av.promedio} %` : "–"}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
          </div>
        )}

          {modo === "alumno" && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">{tm.miRuta}</h3>
              {ruta.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">{tm.rutaVacia}</p>
              ) : (
                <ol className="mt-2 space-y-1 text-sm">
                  {ruta.map((c, i) => {
                    const n = porClave.get(c);
                    if (!n) return null;
                    return (
                      <li key={c} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-[10px] font-bold text-white">{i + 1}</span>
                        <button type="button" onClick={() => irA(c)} className="min-w-0 flex-1 truncate text-left text-slate-800 hover:underline" title={n.nombre}>
                          {n.nombre}
                        </button>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorAvance(avance[c]?.promedio) }} />
                        <button type="button" aria-label={tm.subir} onClick={() => mover(i, -1)} className="px-1 text-slate-400 hover:text-slate-700">
                          ▲
                        </button>
                        <button type="button" aria-label={tm.bajar} onClick={() => mover(i, 1)} className="px-1 text-slate-400 hover:text-slate-700">
                          ▼
                        </button>
                        <button type="button" aria-label={tm.quitarDeRuta} onClick={() => alternarRuta(c)} className="px-1 text-slate-400 hover:text-error">
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
              <Boton type="button" className="mt-3 w-full" onClick={guardar} disabled={ocupado || !rutaSinGuardar}>
                {ocupado ? tm.guardando : tm.guardarRuta}
              </Boton>
            </div>
          )}
      </div>
    </div>
  );
}
