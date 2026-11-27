"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { guardarAgenda } from "@/app/acciones-asesorias";
import type { EntregaCalendario } from "@/lib/agenda-hoy";
import { DIAS, FIN_DIA, FRANJAS, INICIO_DIA, MINUTOS_FRANJA, TIPOS_AGENDA, hora, pintarSemanal, rangosSeEnciman, vigente, type CeldaAgenda } from "@/lib/asesorias";
import { PAISES_ASUETOS, asuetoEn, paisDeAsuetos } from "@/lib/asuetos";
import { formato } from "@/lib/i18n/idiomas";
import type { EtiquetaAgenda, TipoBloque } from "@/lib/tipos";
import { COLOR_BLOQUE, COLOR_ETIQUETA, EMOJI_BLOQUE } from "@/lib/colores-agenda";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

const COLORES = Object.keys(COLOR_ETIQUETA);
export const MAX_ETIQUETAS = 12;

type Valor = { tipo: TipoBloque; titulo?: string; grupoId?: string; etiqueta?: string; comun?: boolean };
/** Lo que se puede publicar como actividad común (no la comida ni las franjas de asesoría). */
const publicable = (tipo: TipoBloque) => tipo !== "comida" && tipo !== "asesoria" && tipo !== "libre" && tipo !== "asueto";
type Herramienta = TipoBloque | "borrar" | `et:${string}`;
type Modo = "semana" | "semanal";

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

export interface CursoAgenda {
  id: string;
  nombre: string;
  inicio?: string;
  fin?: string;
}

const k = (a: string | number, m: number) => `${a}|${m}`;
const mismo = (a?: Valor, b?: Valor) =>
  a && b ? a.tipo === b.tipo && a.titulo === b.titulo && a.grupoId === b.grupoId && a.etiqueta === b.etiqueta && Boolean(a.comun) === Boolean(b.comun) : !a && !b;
const valorDe = (c: Valor): Valor => ({
  tipo: c.tipo,
  ...(c.titulo ? { titulo: c.titulo } : {}),
  ...(c.grupoId ? { grupoId: c.grupoId } : {}),
  ...(c.etiqueta ? { etiqueta: c.etiqueta } : {}),
  ...(c.comun ? { comun: true } : {}),
});

/**
 * Editor de la agenda semanal del profesor: lunes a viernes, de 7:00 a 18:00, en franjas de 30 min.
 * Se elige qué marcar (clase, comida, proyecto, reunión, evento, vacaciones, otra actividad, una
 * etiqueta propia o asesoría disponible) y se pinta haciendo clic o arrastrando. "Solo esta semana"
 * cambia las fechas que se ven; "Todas las semanas" edita el horario que se repite, entre las fechas
 * elegidas (por omisión, las del curso). Los asuetos oficiales del país se marcan solos.
 */
export function AgendaSemanal({
  semana,
  fechas,
  hoy,
  semanales,
  deLaSemana,
  citas,
  entregas,
  cursos,
  cursoInicial,
  etiquetas: etiquetasIniciales,
  pais: paisInicial,
  asuetos: asuetosIniciales,
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
  entregas: EntregaCalendario[];
  cursos: CursoAgenda[];
  cursoInicial?: string;
  etiquetas: EtiquetaAgenda[];
  pais: string;
  asuetos: boolean;
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
  const [modo, setModo] = useState<Modo>("semana");
  const [herramienta, setHerramienta] = useState<Herramienta>(cursoInicial ? "clase" : "asesoria");
  const [nota, setNota] = useState("");
  const curso0 = cursos.find((c) => c.id === cursoInicial);
  const [grupoId, setGrupoId] = useState(curso0?.id ?? "");
  const [desde, setDesde] = useState(curso0?.inicio ?? "");
  const [hasta, setHasta] = useState(curso0?.fin ?? "");
  const [sem, setSem] = useState<CeldaAgenda[]>(semanales);
  const [fec, setFec] = useState(() => new Map(deLaSemana.map((c) => [k(c.fecha!, c.inicio), valorDe(c)])));
  const [etiquetas, setEtiquetas] = useState(etiquetasIniciales);
  const [pais, setPais] = useState(paisDeAsuetos(paisInicial));
  const [conAsuetos, setConAsuetos] = useState(asuetosIniciales);
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState(COLORES[0]);
  const [sucio, setSucio] = useState(false);
  const [comun, setComun] = useState(false);
  // Cada cambio se guarda solo, un momento después (al soltar el ratón o al usar «Marcar»).
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const cambio = () => {
    setSucio(true);
    setVersion((v) => {
      versionRef.current = v + 1;
      return v + 1;
    });
  };
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

  const nombreCurso = useMemo(() => new Map(cursos.map((c) => [c.id, c.nombre])), [cursos]);
  const etiquetaDe = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const asuetoDe = useMemo(() => new Map(fechas.map((f) => [f, conAsuetos ? asuetoEn(pais, f) : undefined])), [fechas, pais, conAsuetos]);

  /** Horario de cada semana tal como vale en la semana que se ve. */
  const semanalVisible = useMemo(() => {
    const mapa = new Map<string, Valor>();
    for (const c of sem) if (c.dia && vigente(c, fechas[c.dia - 1])) mapa.set(k(c.dia, c.inicio), valorDe(c));
    return mapa;
  }, [sem, fechas]);

  /** Lo que hay sin los cambios de la semana: el asueto o el horario de cada semana. */
  function base(fecha: string, dia: number, m: number): Valor | undefined {
    const asueto = asuetoDe.get(fecha);
    if (asueto) return { tipo: "asueto", titulo: asueto };
    return semanalVisible.get(k(dia, m));
  }

  /** Qué se ve en una franja según el modo. */
  function valor(fecha: string, dia: number, m: number): Valor | undefined {
    if (modo === "semanal") return semanalVisible.get(k(dia, m));
    const propio = fec.get(k(fecha, m));
    if (propio) return propio.tipo === "libre" ? undefined : propio;
    return base(fecha, dia, m);
  }

  function nuevoValor(): Valor | undefined {
    if (herramienta === "borrar") return undefined;
    const titulo = nota.trim() || undefined;
    const tipo: TipoBloque = herramienta.startsWith("et:") ? "personal" : (herramienta as TipoBloque);
    return valorDe({ tipo, titulo, grupoId: grupoId || undefined, etiqueta: tipo === "personal" ? herramienta.slice(3) : undefined, comun: comun && publicable(tipo) });
  }

  function pintarVarias(lista: { fecha: string; dia: number; m: number }[]) {
    const nuevo = nuevoValor();
    if (modo === "semanal") {
      setSem((antes) => lista.reduce((celdas, { dia, m }) => pintarSemanal(celdas, dia, m, { desde, hasta }, nuevo), antes));
    } else {
      setFec((antes) => {
        const f = new Map(antes);
        for (const { fecha, dia, m } of lista) {
          const b = base(fecha, dia, m);
          const v: Valor | undefined = nuevo ?? (b ? { tipo: "libre" } : undefined);
          // Si queda igual que lo de siempre, no hace falta el cambio de la semana.
          if (!v || mismo(v, b)) f.delete(k(fecha, m));
          else f.set(k(fecha, m), v);
        }
        return f;
      });
    }
    cambio();
    setMensaje(null);
  }

  function aplicarRapido() {
    const lista = rapDias.flatMap((dia) => FRANJAS.filter((m) => m >= rapDe && m < rapA).map((m) => ({ fecha: fechas[dia - 1], dia, m })));
    if (lista.length) pintarVarias(lista);
  }

  function elegirCurso(id: string) {
    setGrupoId(id);
    const c = cursos.find((x) => x.id === id);
    setDesde(c?.inicio ?? "");
    setHasta(c?.fin ?? "");
  }

  function crearEtiqueta() {
    const nombre = nuevoNombre.replace(/\s+/g, " ").trim().slice(0, 30);
    if (!nombre) return;
    const id = `e${(etiquetas.reduce((max, e) => Math.max(max, parseInt(e.id.slice(1), 36) || 0), 0) + 1).toString(36)}`;
    setEtiquetas((x) => [...x, { id, nombre, color: nuevoColor }]);
    setHerramienta(`et:${id}`);
    setNuevoNombre("");
    setCreando(false);
    cambio();
  }

  function quitarEtiqueta(id: string) {
    const e = etiquetaDe.get(id);
    if (!e || !window.confirm(formato(tp.confirmarBorrarEtiqueta, { n: e.nombre }))) return;
    setEtiquetas((x) => x.filter((y) => y.id !== id));
    setSem((x) => x.filter((c) => c.etiqueta !== id));
    setFec((x) => new Map([...x].filter(([, v]) => v.etiqueta !== id)));
    if (herramienta === `et:${id}`) setHerramienta("asesoria");
    cambio();
  }

  async function guardarAhora() {
    const v = versionRef.current;
    const deLaSemanaNuevas: CeldaAgenda[] = [...fec].map(([clave, val]) => {
      const [fecha, m] = clave.split("|");
      return { fecha, inicio: Number(m), ...val };
    });
    const r = await guardarAgenda(semana, sem, deLaSemanaNuevas, { etiquetas, pais, asuetos: conAsuetos });
    if ("error" in r) {
      setMensaje({ ok: false, texto: r.error });
      return false;
    }
    if (v === versionRef.current) {
      setSucio(false);
      setMensaje({ ok: true, texto: ta.calendario.guardadoAuto });
      iniciar(() => router.refresh());
    }
    return true;
  }

  useEffect(() => {
    if (version === 0) return;
    const temporizador = setTimeout(() => void guardarAhora(), 700);
    return () => clearTimeout(temporizador);
    // guardarAhora toma el estado de este render, que es el de este cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function ir(lunes: string) {
    if (sucio && !(await guardarAhora()) && !window.confirm(tp.confirmarSalir)) return;
    router.push(`${rutaBase}semana=${lunes}`);
  }

  const citaEn = useMemo(() => {
    const mapa = new Map<string, { cita: CitaAgenda; primera: boolean }>();
    for (const c of citas) for (let m = c.inicio; m < c.inicio + c.duracion; m += MINUTOS_FRANJA) mapa.set(k(c.fecha, m), { cita: c, primera: m === c.inicio });
    return mapa;
  }, [citas]);

  const entregasEn = useMemo(() => {
    const mapa = new Map<string, EntregaCalendario[]>();
    for (const e of entregas) mapa.set(k(e.fecha, e.inicio), [...(mapa.get(k(e.fecha, e.inicio)) ?? []), e]);
    return mapa;
  }, [entregas]);

  const fechaCorta = (f: string) => new Date(`${f}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const nombrePais = useMemo(() => {
    let n: Intl.DisplayNames | undefined;
    try {
      n = new Intl.DisplayNames([locale], { type: "region" });
    } catch {}
    return (p: string) => n?.of(p) ?? p;
  }, [locale]);

  const colorDe = (v: Valor) => (v.tipo === "personal" ? (COLOR_ETIQUETA[etiquetaDe.get(v.etiqueta ?? "")?.color ?? ""]?.celda ?? COLOR_BLOQUE.personal) : COLOR_BLOQUE[v.tipo]);
  const nombreTipo = (v: Valor) => (v.tipo === "personal" ? (etiquetaDe.get(v.etiqueta ?? "")?.nombre ?? ta.tipos.personal) : ta.tipos[v.tipo]);
  const textoDe = (v: Valor) => v.titulo || (v.grupoId && v.tipo === "clase" ? nombreCurso.get(v.grupoId) : undefined) || nombreTipo(v);
  const nombreHerramienta = (h: Herramienta) => (h === "borrar" ? tp.borrar : h.startsWith("et:") ? (etiquetaDe.get(h.slice(3))?.nombre ?? "") : ta.tipos[h as TipoBloque]);
  const emojiHerramienta = (h: Herramienta) => (h === "borrar" ? "⌫" : h.startsWith("et:") ? EMOJI_BLOQUE.personal : EMOJI_BLOQUE[h as TipoBloque]);
  const fueraDeSemana = modo === "semanal" && !rangosSeEnciman({ desde: desde || undefined, hasta: hasta || undefined }, { desde: fechas[0], hasta: fechas[4] });
  const chip = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition";
  const campo = "mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

  const herramientaTipo: TipoBloque | undefined = herramienta === "borrar" ? undefined : herramienta.startsWith("et:") ? "personal" : (herramienta as TipoBloque);
  const titulo = (texto: string) => <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{texto}</p>;

  return (
    <div className="lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-5">
      {/* Herramientas: columna a la izquierda del calendario. */}
      <aside className="mb-4 space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-4 lg:mb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <div>
          {titulo(tp.modo)}
          <div className="mt-1.5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm" role="radiogroup" aria-label={tp.modo}>
            {(["semana", "semanal"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={modo === m}
                onClick={() => setModo(m)}
                className={`rounded-md px-2 py-1.5 font-medium transition ${modo === m ? "bg-white text-tinta-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {m === "semanal" ? tp.modoSemanal : tp.modoSemana}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{modo === "semanal" ? tp.modoSemanalAyuda : tp.modoSemanaAyuda}</p>
        </div>

        <div>
          {titulo(tp.herramientas)}
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={tp.herramientas}>
            {TIPOS_AGENDA.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={herramienta === h}
                onClick={() => setHerramienta(h)}
                className={`${chip} ${COLOR_BLOQUE[h]} ring-transparent ${herramienta === h ? "ring-2 !ring-tinta-600" : "hover:ring-slate-400"}`}
              >
                <span aria-hidden>{EMOJI_BLOQUE[h]}</span>
                {ta.tipos[h]}
              </button>
            ))}
            {etiquetas.map((e) => {
              const h: Herramienta = `et:${e.id}`;
              return (
                <span key={e.id} className="inline-flex items-center">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={herramienta === h}
                    onClick={() => setHerramienta(h)}
                    className={`${chip} ${COLOR_ETIQUETA[e.color]?.celda ?? COLOR_BLOQUE.personal} ring-transparent ${herramienta === h ? "ring-2 !ring-tinta-600" : "hover:ring-slate-400"}`}
                  >
                    <span aria-hidden>{EMOJI_BLOQUE.personal}</span>
                    {e.nombre}
                  </button>
                  {herramienta === h && (
                    <button
                      type="button"
                      onClick={() => quitarEtiqueta(e.id)}
                      className="ml-0.5 rounded-full px-1.5 text-sm text-slate-400 hover:text-error"
                      aria-label={`${tp.etiquetaBorrar}: ${e.nombre}`}
                      title={tp.etiquetaBorrar}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
            {etiquetas.length < MAX_ETIQUETAS && (
              <button
                type="button"
                onClick={() => setCreando((x) => !x)}
                aria-expanded={creando}
                className={`${chip} border border-dashed border-slate-400 bg-white text-slate-600 ring-transparent hover:border-tinta-500 hover:text-tinta-700`}
              >
                <span aria-hidden>＋</span>
                {tp.personalizar}
              </button>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={herramienta === "borrar"}
              onClick={() => setHerramienta("borrar")}
              className={`${chip} bg-white text-slate-600 ring-slate-300 ${herramienta === "borrar" ? "ring-2 !ring-tinta-600" : "hover:ring-slate-400"}`}
            >
              <span aria-hidden>⌫</span>
              {tp.borrar}
            </button>
          </div>
          {creando && (
            <form
              className="mt-2 space-y-2 rounded-lg bg-slate-50 px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                crearEtiqueta();
              }}
            >
              <label className="block text-xs font-medium text-slate-500">
                {tp.etiquetaNombre}
                <input autoFocus value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} maxLength={30} placeholder={tp.etiquetaAyuda} className={`${campo} w-full`} />
              </label>
              <fieldset>
                <legend className="text-xs font-medium text-slate-500">{tp.etiquetaColor}</legend>
                <div className="mt-1 flex gap-1.5">
                  {COLORES.map((c) => (
                    <label key={c} className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ${nuevoColor === c ? "ring-tinta-600" : "ring-transparent"}`}>
                      <input type="radio" name="color-etiqueta" className="sr-only" checked={nuevoColor === c} onChange={() => setNuevoColor(c)} aria-label={c} />
                      <span className={`h-5 w-5 rounded-full ${COLOR_ETIQUETA[c].punto}`} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <Boton type="submit" className="!px-3 !py-1.5" disabled={!nuevoNombre.trim()}>
                  {tp.etiquetaCrear}
                </Boton>
                <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => setCreando(false)}>
                  {tp.etiquetaCancelar}
                </Boton>
              </div>
            </form>
          )}
        </div>

        {herramienta !== "borrar" && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">
              {tp.curso}
              <select value={grupoId} onChange={(e) => elegirCurso(e.target.value)} className={`${campo} w-full`}>
                <option value="">{tp.sinCurso}</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              {tp.nota}
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder={tp.notaAyuda} maxLength={60} className={`${campo} w-full`} />
            </label>
            <label className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${herramientaTipo && publicable(herramientaTipo) ? "bg-fuchsia-50 text-slate-700" : "text-slate-400"}`}>
              <input
                type="checkbox"
                checked={comun && Boolean(herramientaTipo && publicable(herramientaTipo))}
                disabled={!herramientaTipo || !publicable(herramientaTipo)}
                onChange={(e) => setComun(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-fuchsia-600"
              />
              <span>
                <span className="font-medium">📣 {ta.calendario.comunMarcar}</span>
                <span className="block text-xs text-slate-500">{ta.calendario.comunAyuda}</span>
              </span>
            </label>
          </div>
        )}

        {modo === "semanal" && (
          <div className="space-y-2 rounded-lg bg-tinta-50/60 px-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-slate-500">
                {tp.desde}
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${campo} w-full`} />
              </label>
              <label className="text-xs font-medium text-slate-500">
                {tp.hasta}
                <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={`${campo} w-full`} />
              </label>
            </div>
            <p className="text-xs text-slate-500">{desde || hasta ? tp.fechasAyuda : `${tp.sinLimite} ${tp.fechasAyuda}`}</p>
            {fueraDeSemana && <p className="text-xs font-medium text-aviso">{tp.fueraDeRango}</p>}
          </div>
        )}

        {/* Marcar varios días y horas de un jalón: se registra al dar clic en «Marcar». */}
        <div className="space-y-2 rounded-lg bg-slate-50 px-3 py-2">
          {titulo(tp.rapido)}
          <fieldset>
            <legend className="sr-only">{tp.rapidoDias}</legend>
            <div className="flex gap-1">
              {DIAS.map((d) => (
                <label
                  key={d}
                  className={`flex-1 cursor-pointer rounded-md py-1 text-center text-xs font-medium ring-1 ${rapDias.includes(d) ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-600 ring-slate-300"}`}
                >
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
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-slate-500">
              {tp.rapidoDe}
              <select
                value={rapDe}
                onChange={(e) => {
                  const de = Number(e.target.value);
                  setRapDe(de);
                  setRapA((a) => (a > de ? a : de + MINUTOS_FRANJA));
                }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
                {FRANJAS.map((m) => (
                  <option key={m} value={m}>
                    {hora(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              {tp.rapidoA}
              <select value={rapA} onChange={(e) => setRapA(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
                {FRANJAS.map((m) => m + MINUTOS_FRANJA)
                  .filter((m) => m > rapDe)
                  .map((m) => (
                    <option key={m} value={m}>
                      {hora(m)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={rapDe === INICIO_DIA && rapA === FIN_DIA}
              onChange={(e) => {
                setRapDe(e.target.checked ? INICIO_DIA : FRANJAS[0]);
                setRapA(e.target.checked ? FIN_DIA : FRANJAS[2] + MINUTOS_FRANJA);
              }}
              className="h-4 w-4 accent-tinta-600"
            />
            {tp.todoElDia}
          </label>
          <Boton type="button" className="w-full !py-2" onClick={aplicarRapido} disabled={!rapDias.length || rapA <= rapDe}>
            {emojiHerramienta(herramienta)} {tp.rapidoAplicar}: {nombreHerramienta(herramienta)}
          </Boton>
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <label className="flex items-center gap-2 font-medium text-slate-700">
            <input
              type="checkbox"
              checked={conAsuetos}
              onChange={(e) => {
                setConAsuetos(e.target.checked);
                cambio();
              }}
              className="h-4 w-4 accent-tinta-600"
            />
            🎉 {tp.asuetosActivos}
          </label>
          <select
            value={pais}
            onChange={(e) => {
              setPais(paisDeAsuetos(e.target.value));
              cambio();
            }}
            disabled={!conAsuetos}
            aria-label={tp.asuetos}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
          >
            {[...PAISES_ASUETOS]
              .sort((a, b) => nombrePais(a).localeCompare(nombrePais(b), locale))
              .map((p) => (
                <option key={p} value={p}>
                  {nombrePais(p)}
                </option>
              ))}
          </select>
          <p className="text-xs text-slate-500">{tp.asuetosAyuda}</p>
        </div>
      </aside>

      <div className="min-w-0 space-y-3">
        {/* Navegación de semanas y estado del guardado */}
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
          <span className={`text-sm ${mensaje && !mensaje.ok ? "text-error" : sucio ? "text-slate-500" : "text-acierto"}`} role="status">
            {mensaje && !mensaje.ok ? mensaje.texto : sucio || pendiente ? tp.guardando : mensaje ? mensaje.texto : ta.calendario.autoGuardado}
          </span>
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
              {asuetoDe.get(f) && " 🎉"}
              <span className="block text-[11px] opacity-80">{fechaCorta(f)}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500">{ta.calendario.marcarAyuda}</p>
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 select-none">
          <div className="flex">
            {/* Horas */}
            <div className="w-14 shrink-0 border-r border-slate-200 bg-slate-50">
              <div className="h-14 border-b border-slate-200" />
              {FRANJAS.map((m) => (
                <div key={m} className={`flex h-8 items-start justify-end pr-1.5 text-[11px] text-slate-500 ${m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"}`}>
                  {hora(m)}
                </div>
              ))}
            </div>
            {fechas.map((fecha, i) => {
              const dia = i + 1;
              const asueto = asuetoDe.get(fecha);
              return (
                <div key={fecha} className={`min-w-0 flex-1 border-r border-slate-100 last:border-r-0 ${diaMovil === i ? "" : "hidden sm:block"}`}>
                  <div className={`flex h-14 flex-col items-center justify-center border-b border-slate-200 px-1 text-center ${fecha === hoy ? "bg-tinta-50" : ""}`}>
                    <span className="text-xs font-semibold text-slate-700">
                      <span className="hidden xl:inline">{ta.dias[i]}</span>
                      <span className="xl:hidden">{ta.diasCortos[i]}</span>
                    </span>
                    <span className={`text-[11px] ${fecha === hoy ? "font-semibold text-tinta-700" : "text-slate-500"}`}>{fechaCorta(fecha)}</span>
                    {asueto && (
                      <span className="w-full truncate text-[10px] font-medium text-red-700" title={asueto}>
                        🎉 {asueto}
                      </span>
                    )}
                  </div>
                  {FRANJAS.map((m, j) => {
                    const v = valor(fecha, dia, m);
                    const previo = j > 0 ? valor(fecha, dia, FRANJAS[j - 1]) : undefined;
                    const inicioDeTramo = v && !mismo(previo, v);
                    const cambioSemana = modo === "semana" && fec.has(k(fecha, m));
                    const cita = citaEn.get(k(fecha, m));
                    const ents = entregasEn.get(k(fecha, m)) ?? [];
                    const etiqueta = [
                      `${ta.dias[i]} ${hora(m)}: ${v ? nombreTipo(v) : ta.tipos.libre}${v && textoDe(v) !== nombreTipo(v) ? ` (${textoDe(v)})` : ""}`,
                      v?.comun && `📣 ${ta.calendario.comun}`,
                      cita && `🙋 ${cita.cita.alumno}`,
                      ...ents.map((e) => `📥 ${e.titulo} · ${e.curso} (${formato(tp.cierra, { h: hora(e.cierre) })})`),
                    ]
                      .filter(Boolean)
                      .join(" · ");
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
                        } ${v ? colorDe(v) : "bg-white hover:bg-slate-50"} ${cambioSemana ? "shadow-[inset_3px_0_0_var(--color-aviso)]" : ""} ${
                          v?.comun ? "shadow-[inset_-3px_0_0_var(--color-fuchsia-500)]" : ""
                        }`}
                      >
                        {inicioDeTramo && !cita && (
                          <span className="block truncate pt-0.5 font-medium">
                            {v.comun ? "📣" : EMOJI_BLOQUE[v.tipo]} {textoDe(v)}
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
                        {ents.length > 0 && (
                          <span className="pointer-events-none absolute top-0.5 right-0.5 bottom-0.5 flex max-w-[75%] items-center gap-0.5 rounded bg-orange-500 px-1 text-[10px] font-semibold text-white shadow-sm">
                            <span className="truncate">
                              📥 {ents[0].titulo} · {hora(ents[0].cierre)}
                            </span>
                            {ents.length > 1 && <span className="shrink-0">{formato(tp.masEntregas, { n: String(ents.length - 1) })}</span>}
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
          {etiquetas.map((e) => (
            <li key={e.id} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${COLOR_ETIQUETA[e.color]?.celda ?? COLOR_BLOQUE.personal} ring-1 ring-black/5`} /> {e.nombre}
            </li>
          ))}
          {conAsuetos && (
            <li className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${COLOR_BLOQUE.asueto} ring-1 ring-black/5`} /> {ta.tipos.asueto}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-white shadow-[inset_-3px_0_0_var(--color-fuchsia-500)] ring-1 ring-slate-200" /> 📣 {ta.calendario.comun}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-tinta-600" /> {tp.citaLeyenda}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-orange-500" /> {tp.entregaLeyenda}
          </li>
          {modo === "semana" && (
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-white shadow-[inset_3px_0_0_var(--color-aviso)] ring-1 ring-slate-200" /> {tp.modoSemana}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
