"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { guardarAgenda } from "@/app/acciones-asesorias";
import { DIAS, FRANJAS, MINUTOS_FRANJA, TIPOS_AGENDA, hora, type CeldaAgenda } from "@/lib/asesorias";
import { formato } from "@/lib/i18n/idiomas";
import type { TipoBloque } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

/** Colores de cada tipo de bloque (celda y muestra de la herramienta). */
export const COLOR_BLOQUE: Record<TipoBloque, string> = {
  clase: "bg-tinta-100 text-tinta-900",
  comida: "bg-amber-100 text-amber-800",
  proyecto: "bg-violet-100 text-violet-800",
  reunion: "bg-rose-100 text-rose-800",
  otro: "bg-slate-200 text-slate-700",
  asesoria: "bg-emerald-100 text-emerald-800",
  libre: "bg-white text-slate-400",
};

export const EMOJI_BLOQUE: Record<TipoBloque, string> = {
  clase: "📘",
  comida: "🍴",
  proyecto: "🛠️",
  reunion: "👥",
  otro: "📌",
  asesoria: "🙋",
  libre: "",
};

type Valor = { tipo: TipoBloque; titulo?: string };
type Herramienta = TipoBloque | "borrar";
type Modo = "semanal" | "semana";

export interface CitaAgenda {
  id: string;
  fecha: string;
  inicio: number;
  duracion: number;
  alumno: string;
  curso: string;
  /** Es del curso con que se abrió la agenda (o no se filtró por curso). */
  resaltar: boolean;
}

const k = (a: string | number, m: number) => `${a}|${m}`;

function aMapa(celdas: CeldaAgenda[], porFecha: boolean) {
  return new Map(celdas.map((c) => [k(porFecha ? c.fecha! : c.dia!, c.inicio), { tipo: c.tipo, ...(c.titulo ? { titulo: c.titulo } : {}) } as Valor]));
}

/**
 * Editor de la agenda semanal del profesor: lunes a viernes, de 7:00 a 18:00, en franjas de 30 min.
 * Se elige qué marcar (clase, comida, proyecto, reunión, otra actividad o asesoría disponible) y se
 * pinta haciendo clic o arrastrando. "Todas las semanas" edita el horario de siempre; "Solo esta
 * semana", los cambios de las fechas que se ven.
 */
export function AgendaSemanal({
  semana,
  fechas,
  hoy,
  semanales,
  deLaSemana,
  citas,
  cursos,
  rutaBase,
  anterior,
  siguiente,
  actual,
}: {
  semana: string;
  fechas: string[];
  hoy: string;
  semanales: CeldaAgenda[];
  deLaSemana: CeldaAgenda[];
  citas: CitaAgenda[];
  cursos: string[];
  /** Ruta de la página con los parámetros que se conservan (termina en "?" o "&"). */
  rutaBase: string;
  anterior: string;
  siguiente: string;
  actual: string;
}) {
  const router = useRouter();
  const { t, locale } = useTextos();
  const ta = t.asesorias;
  const tp = ta.profesor;
  const [modo, setModo] = useState<Modo>("semanal");
  const [herramienta, setHerramienta] = useState<Herramienta>("asesoria");
  const [nota, setNota] = useState("");
  const [sem, setSem] = useState(() => aMapa(semanales, false));
  const [fec, setFec] = useState(() => aMapa(deLaSemana, true));
  const [sucio, setSucio] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [diaMovil, setDiaMovil] = useState(() => Math.max(0, fechas.indexOf(hoy)));
  const [pendiente, iniciar] = useTransition();
  const arrastrando = useRef(false);
  const puntero = useRef("");
  // Rápido: varios días y un rango de horas de un jalón.
  const [rapDias, setRapDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [rapDe, setRapDe] = useState(FRANJAS[0]);
  const [rapA, setRapA] = useState(FRANJAS[2] + MINUTOS_FRANJA);

  useEffect(() => {
    const fin = () => (arrastrando.current = false);
    window.addEventListener("pointerup", fin);
    return () => window.removeEventListener("pointerup", fin);
  }, []);

  useEffect(() => {
    if (!sucio) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sucio]);

  /** Qué se ve en una franja según el modo. */
  function valor(fecha: string, dia: number, m: number): Valor | undefined {
    const deSemana = sem.get(k(dia, m));
    if (modo === "semanal") return deSemana;
    const propio = fec.get(k(fecha, m));
    if (propio) return propio.tipo === "libre" ? undefined : propio;
    return deSemana;
  }

  function pintarVarias(lista: { fecha: string; dia: number; m: number }[]) {
    const titulo = nota.trim() || undefined;
    if (modo === "semanal") {
      setSem((antes) => {
        const s = new Map(antes);
        for (const { dia, m } of lista) {
          if (herramienta === "borrar") s.delete(k(dia, m));
          else s.set(k(dia, m), { tipo: herramienta, ...(titulo ? { titulo } : {}) });
        }
        return s;
      });
    } else {
      setFec((antes) => {
        const f = new Map(antes);
        for (const { fecha, dia, m } of lista) {
          const base = sem.get(k(dia, m));
          const nuevo: Valor | undefined = herramienta === "borrar" ? (base ? { tipo: "libre" } : undefined) : { tipo: herramienta, ...(titulo ? { titulo } : {}) };
          // Si queda igual que el horario de siempre, no hace falta el cambio de la semana.
          const igual = nuevo && base ? nuevo.tipo === base.tipo && nuevo.titulo === base.titulo : !nuevo && !base;
          if (!nuevo || igual) f.delete(k(fecha, m));
          else f.set(k(fecha, m), nuevo);
        }
        return f;
      });
    }
    setSucio(true);
    setMensaje(null);
  }

  function aplicarRapido() {
    const lista = rapDias.flatMap((dia) => FRANJAS.filter((m) => m >= rapDe && m < rapA).map((m) => ({ fecha: fechas[dia - 1], dia, m })));
    if (lista.length) pintarVarias(lista);
  }

  function guardar() {
    const semanalesNuevas: CeldaAgenda[] = [...sem].map(([clave, v]) => {
      const [dia, m] = clave.split("|");
      return { dia: Number(dia), inicio: Number(m), ...v };
    });
    const deLaSemanaNuevas: CeldaAgenda[] = [...fec].map(([clave, v]) => {
      const [fecha, m] = clave.split("|");
      return { fecha, inicio: Number(m), ...v };
    });
    iniciar(async () => {
      const r = await guardarAgenda(semana, semanalesNuevas, deLaSemanaNuevas);
      if ("error" in r) setMensaje({ ok: false, texto: r.error });
      else {
        setSucio(false);
        setMensaje({ ok: true, texto: tp.guardado });
        router.refresh();
      }
    });
  }

  function ir(lunes: string) {
    if (sucio && !window.confirm(tp.confirmarSalir)) return;
    router.push(`${rutaBase}semana=${lunes}`);
  }

  const citaEn = useMemo(() => {
    const mapa = new Map<string, { cita: CitaAgenda; primera: boolean }>();
    for (const c of citas) for (let m = c.inicio; m < c.inicio + c.duracion; m += MINUTOS_FRANJA) mapa.set(k(c.fecha, m), { cita: c, primera: m === c.inicio });
    return mapa;
  }, [citas]);

  const fechaCorta = (f: string) => new Date(`${f}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const herramientas: Herramienta[] = [...TIPOS_AGENDA, "borrar"];

  return (
    <div className="space-y-4">
      {/* Herramientas */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm font-medium text-slate-700">{tp.modo}</p>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="radiogroup" aria-label={tp.modo}>
            {(["semanal", "semana"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={modo === m}
                onClick={() => setModo(m)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${modo === m ? "bg-white text-tinta-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {m === "semanal" ? tp.modoSemanal : tp.modoSemana}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{modo === "semanal" ? tp.modoSemanalAyuda : tp.modoSemanaAyuda}</p>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">{tp.herramientas}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={tp.herramientas}>
          {herramientas.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={herramienta === h}
              onClick={() => setHerramienta(h)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                h === "borrar" ? "bg-white text-slate-600 ring-slate-300" : `${COLOR_BLOQUE[h]} ring-transparent`
              } ${herramienta === h ? "ring-2 !ring-tinta-600" : "hover:ring-slate-400"}`}
            >
              <span aria-hidden>{h === "borrar" ? "⌫" : EMOJI_BLOQUE[h]}</span>
              {h === "borrar" ? tp.borrar : ta.tipos[h]}
            </button>
          ))}
        </div>
        {herramienta !== "borrar" && (
          <label className="mt-3 block max-w-sm text-xs font-medium text-slate-500">
            {tp.nota}
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={tp.notaAyuda}
              maxLength={60}
              list="cursos-agenda"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
            />
            <datalist id="cursos-agenda">
              {cursos.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        )}
        <details className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-tinta-700">{tp.rapido}</summary>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <fieldset>
              <legend className="text-xs font-medium text-slate-500">{tp.rapidoDias}</legend>
              <div className="mt-1 flex gap-1">
                {DIAS.map((d) => (
                  <label key={d} className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium ring-1 ${rapDias.includes(d) ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-600 ring-slate-300"}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={rapDias.includes(d)}
                      onChange={(e) => setRapDias((x) => (e.target.checked ? [...x, d].sort() : x.filter((y) => y !== d)))}
                    />
                    {ta.diasCortos[d - 1]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-xs font-medium text-slate-500">
              {tp.rapidoDe}
              <select value={rapDe} onChange={(e) => setRapDe(Number(e.target.value))} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
                {FRANJAS.map((m) => (
                  <option key={m} value={m}>
                    {hora(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              {tp.rapidoA}
              <select value={rapA} onChange={(e) => setRapA(Number(e.target.value))} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
                {FRANJAS.map((m) => m + MINUTOS_FRANJA)
                  .filter((m) => m > rapDe)
                  .map((m) => (
                    <option key={m} value={m}>
                      {hora(m)}
                    </option>
                  ))}
              </select>
            </label>
            <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={aplicarRapido} disabled={!rapDias.length || rapA <= rapDe}>
              {herramienta === "borrar" ? "⌫" : EMOJI_BLOQUE[herramienta]} {tp.rapidoAplicar}: {herramienta === "borrar" ? tp.borrar : ta.tipos[herramienta]}
            </Boton>
          </div>
        </details>
      </section>

      {/* Navegación de semanas y guardar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => ir(anterior)} aria-label={ta.semana.anterior} title={ta.semana.anterior}>
            ←
          </Boton>
          <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => ir(actual)} disabled={semana === actual}>
            {ta.semana.hoy}
          </Boton>
          <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => ir(siguiente)} aria-label={ta.semana.siguiente} title={ta.semana.siguiente}>
            →
          </Boton>
          <span className="text-sm font-medium text-slate-700">{formato(ta.semana.rango, { i: fechaCorta(fechas[0]), f: fechaCorta(fechas[4]) })}</span>
        </div>
        <div className="flex items-center gap-3">
          {mensaje ? (
            <span className={`text-sm ${mensaje.ok ? "text-acierto" : "text-error"}`} role="status">
              {mensaje.texto}
            </span>
          ) : (
            sucio && <span className="text-sm text-aviso">{tp.cambiosPendientes}</span>
          )}
          <Boton type="button" onClick={guardar} disabled={pendiente || !sucio}>
            {pendiente ? tp.guardando : tp.guardar}
          </Boton>
        </div>
      </div>

      {/* En el teléfono se ve un día a la vez. */}
      <div className="flex gap-1 sm:hidden" role="tablist">
        {fechas.map((f, i) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={diaMovil === i}
            onClick={() => setDiaMovil(i)}
            className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-medium ${diaMovil === i ? "bg-tinta-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {ta.diasCortos[i]}
            <span className="block text-[11px] opacity-80">{fechaCorta(f)}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">{tp.comoPintar}</p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 select-none">
        <div className="flex">
          {/* Horas */}
          <div className="w-14 shrink-0 border-r border-slate-200 bg-slate-50">
            <div className="h-12 border-b border-slate-200" />
            {FRANJAS.map((m) => (
              <div key={m} className={`flex h-8 items-start justify-end pr-1.5 text-[11px] text-slate-500 ${m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"}`}>
                {hora(m)}
              </div>
            ))}
          </div>
          {fechas.map((fecha, i) => {
            const dia = i + 1;
            return (
              <div key={fecha} className={`min-w-0 flex-1 border-r border-slate-100 last:border-r-0 ${diaMovil === i ? "" : "hidden sm:block"}`}>
                <div className={`flex h-12 flex-col items-center justify-center border-b border-slate-200 text-center ${fecha === hoy ? "bg-tinta-50" : ""}`}>
                  <span className="text-xs font-semibold text-slate-700">
                    <span className="hidden lg:inline">{ta.dias[i]}</span>
                    <span className="lg:hidden">{ta.diasCortos[i]}</span>
                  </span>
                  <span className={`text-[11px] ${fecha === hoy ? "font-semibold text-tinta-700" : "text-slate-500"}`}>{fechaCorta(fecha)}</span>
                </div>
                {FRANJAS.map((m, j) => {
                  const v = valor(fecha, dia, m);
                  const previo = j > 0 ? valor(fecha, dia, FRANJAS[j - 1]) : undefined;
                  const inicioDeTramo = v && !(previo && previo.tipo === v.tipo && previo.titulo === v.titulo);
                  const cambioSemana = modo === "semana" && fec.has(k(fecha, m));
                  const cita = citaEn.get(k(fecha, m));
                  const etiqueta = `${ta.dias[i]} ${hora(m)}: ${v ? ta.tipos[v.tipo] : ta.tipos.libre}${v?.titulo ? ` (${v.titulo})` : ""}${cita ? ` · ${cita.cita.alumno}` : ""}`;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-celda
                      aria-label={etiqueta}
                      title={etiqueta}
                      onPointerDown={(e) => {
                        puntero.current = e.pointerType;
                        if (e.pointerType === "mouse" && e.button === 0) {
                          arrastrando.current = true;
                          pintarVarias([{ fecha, dia, m }]);
                        }
                      }}
                      onPointerEnter={() => {
                        if (arrastrando.current) pintarVarias([{ fecha, dia, m }]);
                      }}
                      onClick={() => {
                        // Con el ratón ya se pintó al presionar; con el dedo o el teclado, al soltar.
                        if (puntero.current !== "mouse") pintarVarias([{ fecha, dia, m }]);
                        puntero.current = "";
                      }}
                      className={`relative block h-8 w-full overflow-hidden px-1.5 text-left text-[11px] leading-tight transition-colors ${
                        m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"
                      } ${v ? COLOR_BLOQUE[v.tipo] : "bg-white hover:bg-slate-50"} ${cambioSemana ? "shadow-[inset_3px_0_0_var(--color-aviso)]" : ""}`}
                    >
                      {inicioDeTramo && !cita && (
                        <span className="block truncate pt-0.5 font-medium">
                          {EMOJI_BLOQUE[v.tipo]} {v.titulo || ta.tipos[v.tipo]}
                        </span>
                      )}
                      {cita && (
                        <span
                          className={`pointer-events-none absolute inset-x-0.5 top-0.5 bottom-0 flex items-start rounded-t px-1 ${cita.primera ? "" : "-top-px rounded-t-none"} ${
                            cita.cita.resaltar ? "bg-tinta-600 text-white" : "bg-slate-500 text-white"
                          } ${cita.primera ? "" : "opacity-90"}`}
                        >
                          {cita.primera && <span className="truncate pt-0.5 font-medium">🙋 {cita.cita.alumno}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* Leyenda */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {TIPOS_AGENDA.map((tipo) => (
          <li key={tipo} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${COLOR_BLOQUE[tipo]} ring-1 ring-black/5`} /> {ta.tipos[tipo]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-tinta-600" /> {tp.citaLeyenda}
        </li>
        {modo === "semana" && (
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-white shadow-[inset_3px_0_0_var(--color-aviso)] ring-1 ring-slate-200" /> {tp.modoSemana}
          </li>
        )}
      </ul>
    </div>
  );
}
