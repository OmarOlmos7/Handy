"use client";

// Compañero de estudio: Pascal (golden retriever) asomándose sobre la línea donde "habla" cuando el
// profesor tiene créditos, o unos ojitos si no. Cambia de pose o de ánimo según lo que el alumno
// estudia por su cuenta; invita a estudiar, avisa lo que está por vencer y propone temas. Debajo,
// el formulario para pedirle una actividad diseñada con IA.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CANTIDAD_MAX, CANTIDAD_MIN, CANTIDAD_PREDETERMINADA, LARGO_PETICION, TIPOS_AUTOACTIVIDAD, TIPOS_EJERCICIO_MANUSCRITA, TIPOS_EJERCICIO_PRACTICA, type Animo, type Sugerencia } from "@/lib/autoestudio";
import { formato } from "@/lib/i18n/idiomas";
import { gestoPascal } from "@/lib/pascal";
import type { CursoCompanero } from "@/lib/companero";
import type { TipoAutoactividad, TipoEjercicio } from "@/lib/tipos";
import { Ojitos } from "./ojitos";
import { Pascal } from "./pascal";
import { useTextos } from "./proveedor-textos";
import { campo } from "./ui";

export interface IdeaCompanero {
  texto: string;
  clave?: Sugerencia["clave"];
  tipo?: TipoAutoactividad;
  tema?: string;
  grupoId?: string;
}

const ICONO: Record<TipoAutoactividad, string> = { practica: "📝", manuscrita: "✍️", videos: "🎬", lectura: "📖", tarjetas: "🃏" };

/** Escribe el texto letra por letra, como si el compañero lo estuviera diciendo. */
function useEscritura(texto: string) {
  // El avance se guarda junto con el texto: al cambiar el texto, vuelve a empezar sin efectos extra.
  const [estado, setEstado] = useState({ texto, n: 0 });
  const n = estado.texto === texto ? estado.n : 0;
  useEffect(() => {
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(
      () =>
        setEstado((e) => {
          const actual = e.texto === texto ? e.n : 0;
          if (actual >= texto.length) return e;
          return { texto, n: reducido ? texto.length : actual + 2 };
        }),
      reducido ? 0 : 22,
    );
    return () => clearInterval(t);
  }, [texto]);
  return texto.slice(0, n);
}

export function CompaneroEstudio({
  animo,
  ideas,
  cursos,
  grupoFijo,
  restantes,
  conCreditos = false,
  temaInicial,
  tipoInicial,
}: {
  animo: Animo;
  ideas: IdeaCompanero[];
  cursos: CursoCompanero[];
  /** Dentro de un curso: el curso ya está elegido. */
  grupoFijo?: string;
  restantes: number;
  /** El profesor tiene créditos para que el alumno cree actividades: sale Pascal. */
  conCreditos?: boolean;
  /** Tema y tipo ya elegidos (desde la ruta de aprendizaje): el formulario abre listo. */
  temaInicial?: string;
  tipoInicial?: TipoAutoactividad;
}) {
  const { t } = useTextos();
  const ta = t.autoestudio;
  const router = useRouter();
  const [i, setI] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [animoAhora, setAnimoAhora] = useState<Animo>(animo);
  const [abierto, setAbierto] = useState(Boolean(temaInicial));
  const [grupoId, setGrupoId] = useState(grupoFijo ?? (cursos.length === 1 ? cursos[0].id : ""));
  const [tipo, setTipo] = useState<TipoAutoactividad>(tipoInicial ?? "practica");
  const [tema, setTema] = useState(temaInicial ?? "");
  const [peticion, setPeticion] = useState("");
  const [cantidad, setCantidad] = useState(CANTIDAD_PREDETERMINADA);
  const [tipos, setTipos] = useState<TipoEjercicio[]>([]);
  const opcionesEjercicio = tipo === "manuscrita" ? TIPOS_EJERCICIO_MANUSCRITA : TIPOS_EJERCICIO_PRACTICA;
  const elegidos = tipos.filter((x) => opcionesEjercicio.includes(x));
  const [estado, setEstado] = useState<"listo" | "creando">("listo");
  const [error, setError] = useState("");
  const [saludando, setSaludando] = useState(conCreditos);
  const [ladrando, setLadrando] = useState(0);
  const [senalando, setSenalando] = useState(false);

  // Pascal saluda al llegar y luego se pone según lo que dice.
  useEffect(() => {
    if (!saludando) return;
    const t = setTimeout(() => setSaludando(false), 3500);
    return () => clearTimeout(t);
  }, [saludando]);

  // Cada clic lo hace ladrar un momento.
  useEffect(() => {
    if (!ladrando) return;
    const t = setTimeout(() => setLadrando(0), 1300);
    return () => clearTimeout(t);
  }, [ladrando]);

  const idea = ideas[i % Math.max(1, ideas.length)];
  // Con Pascal, el saludo ya va arriba: la bienvenida solo dice qué puede pedirle.
  const textoIdea = conCreditos && (!idea || idea.clave === "bienvenida") ? ta.companero.pascal.pide : (idea?.texto ?? ta.companero.mensajes.bienvenida);
  const dicho = useEscritura(aviso ?? (estado === "creando" ? ta.alta.creando : textoIdea));
  const gesto = gestoPascal({
    animo: animoAhora,
    clave: idea?.clave,
    creando: estado === "creando",
    ladrando: ladrando > 0,
    apoyo: !!aviso,
    saludando,
    senalando,
    sinRestantes: restantes <= 0,
  });
  const curso = cursos.find((c) => c.id === grupoId);
  const temas = curso?.temas ?? [];

  function usarIdea() {
    if (!idea) return;
    if (idea.tipo) setTipo(idea.tipo);
    if (idea.tema) setTema(idea.tema);
    if (idea.grupoId && !grupoFijo && cursos.some((c) => c.id === idea.grupoId)) setGrupoId(idea.grupoId);
    setAbierto(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!grupoId) return setError(ta.alta.sinCurso);
    if (!tema.trim()) return setError(ta.alta.faltaTema);
    setEstado("creando");
    setAviso(null);
    try {
      const r = await fetch("/api/autoestudio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoId, tipo, tema: tema.trim(), peticion: peticion.trim(), cantidad, tiposEjercicio: elegidos }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.bloqueado) {
        // Ante textos agresivos, tristes, de enojo o violencia: solo la frase de apoyo, sin consejos.
        setAviso(ta.apoyo);
        setAnimoAhora("serio");
        setEstado("listo");
        return;
      }
      if (!r.ok || !j.id) throw new Error(j.error ?? ta.alta.error);
      router.push(`/alumno/autoestudio/${j.id}`);
    } catch (err) {
      setEstado("listo");
      setError(err instanceof Error ? err.message : ta.alta.error);
    }
  }

  return (
    <section aria-label={ta.companero.nombre} className="mx-auto mb-8 max-w-3xl">
      <div className={conCreditos ? "flex flex-col" : "flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5"}>
        {conCreditos ? (
          // Pascal se asoma por encima de la línea: sus patitas quedan sobre la orilla del recuadro.
          <div className="relative z-10 -mb-[22px] flex justify-center sm:justify-start sm:pl-6">
            <Pascal gesto={gesto} guau={ta.companero.pascal.guau} etiqueta={ta.companero.pascal.etiqueta} onLadrar={() => setLadrando((n) => n + 1)} className="h-32 w-40 sm:h-36 sm:w-44" />
          </div>
        ) : (
          <Ojitos animo={animoAhora} pensando={estado === "creando"} etiqueta={`${ta.companero.nombre}: ${ta.companero.animos[animoAhora]}`} className="h-24 w-40 shrink-0 sm:h-28 sm:w-48" />
        )}
        <div className={`relative w-full flex-1 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-slate-200 ${conCreditos ? "border-t-4 border-amber-400 pt-6 pb-3" : "py-3"}`}>
          {!conCreditos && (
            // Piquito del globo de diálogo hacia los ojitos.
            <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white ring-1 ring-slate-200 [clip-path:polygon(0_0,100%_0,0_100%)] sm:top-1/2 sm:-left-2 sm:-translate-y-1/2 sm:translate-x-0 sm:[clip-path:polygon(0_100%,0_0,100%_100%)]" />
          )}
          {conCreditos && (
            <p className="mb-1 text-[15px] leading-snug">
              <strong className="font-extrabold text-amber-700">{ta.companero.pascal.saludo}</strong> <span className="font-semibold text-slate-900">{ta.companero.pascal.lema}</span>
            </p>
          )}
          <p className="min-h-12 text-[15px] leading-snug text-slate-800" aria-live="polite">
            {dicho}
          </p>
          {!aviso && estado === "listo" && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {idea?.tipo && (
                <button
                  type="button"
                  onClick={usarIdea}
                  onPointerEnter={() => setSenalando(true)}
                  onPointerLeave={() => setSenalando(false)}
                  onFocus={() => setSenalando(true)}
                  onBlur={() => setSenalando(false)}
                  className="rounded-full bg-tinta-600 px-3 py-1 font-medium text-white hover:bg-tinta-700">
                  {ta.companero.usarIdea}
                </button>
              )}
              {ideas.length > 1 && (
                <button type="button" onClick={() => setI((x) => x + 1)} className="rounded-full px-3 py-1 font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50">
                  {ta.companero.otraIdea}
                </button>
              )}
              {!abierto && (
                <button type="button" onClick={() => setAbierto(true)} className="rounded-full px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                  ✨ {ta.alta.titulo}
                </button>
              )}
            </div>
          )}
          {aviso && (
            <button type="button" onClick={() => setAviso(null)} className="mt-2 text-sm font-medium text-tinta-700 hover:underline">
              {ta.companero.otraIdea}
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <form onSubmit={crear} className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">{ta.alta.titulo}</h2>
          {restantes <= 0 ? (
            <p className="mt-2 text-sm text-slate-600">{ta.alta.sinRestantes}</p>
          ) : (
            <>
              {!grupoFijo && cursos.length > 1 && (
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  {ta.alta.curso}
                  <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={campo}>
                    <option value="">—</option>
                    {cursos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <fieldset className="mt-3">
                <legend className="text-sm font-medium text-slate-700">{ta.alta.tipo}</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {TIPOS_AUTOACTIVIDAD.map((x) => (
                    <button
                      key={x}
                      type="button"
                      aria-pressed={tipo === x}
                      onClick={() => setTipo(x)}
                      className={`rounded-xl px-3 py-2 text-left text-sm ring-2 transition ${tipo === x ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`}
                    >
                      <span className="font-semibold text-slate-900">
                        {ICONO[x]} {ta.tipos[x]}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{ta.descripcionTipos[x]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                {ta.alta.tema}
                <input value={tema} onChange={(e) => setTema(e.target.value)} list="temas-companero" maxLength={120} className={campo} required />
                <datalist id="temas-companero">
                  {temas.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
                <span className="mt-1 block text-xs font-normal text-slate-500">{ta.alta.temaAyuda}</span>
              </label>
              {temas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {temas.slice(0, 8).map((x) => (
                    <button key={x} type="button" onClick={() => setTema(x)} className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${tema === x ? "bg-tinta-600 text-white ring-tinta-600" : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"}`}>
                      {x}
                    </button>
                  ))}
                </div>
              )}
              {(tipo === "practica" || tipo === "manuscrita") && (
                <fieldset className="mt-3">
                  <legend className="text-sm font-medium text-slate-700">{ta.alta.tiposEjercicio}</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <button type="button" aria-pressed={elegidos.length === 0} onClick={() => setTipos([])} className={`rounded-full px-3 py-1 text-xs ring-1 ${elegidos.length === 0 ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-700 ring-slate-300"}`}>
                      {ta.alta.mezclar}
                    </button>
                    {opcionesEjercicio.map((x) => {
                      const activo = tipos.includes(x);
                      return (
                        <button
                          key={x}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setTipos((ts) => (activo ? ts.filter((y) => y !== x) : [...ts, x]))}
                          className={`rounded-full px-3 py-1 text-xs ring-1 ${activo ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-700 ring-slate-300"}`}
                        >
                          {ta.tiposEjercicio[x]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {(tipo === "practica" || tipo === "manuscrita" || tipo === "tarjetas") && (
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  {ta.alta.cantidad} <span className="font-semibold text-tinta-700">{cantidad}</span>
                  <input type="range" min={CANTIDAD_MIN} max={tipo === "manuscrita" ? 5 : CANTIDAD_MAX} value={Math.min(cantidad, tipo === "manuscrita" ? 5 : CANTIDAD_MAX)} onChange={(e) => setCantidad(Number(e.target.value))} className="mt-1 block w-full accent-tinta-600" />
                </label>
              )}
              <label className="mt-3 block text-sm font-medium text-slate-700">
                {ta.alta.peticion}
                <input value={peticion} onChange={(e) => setPeticion(e.target.value)} maxLength={LARGO_PETICION} placeholder={ta.alta.peticionEjemplo} className={campo} />
              </label>
              {error && <p className="mt-3 text-sm text-error">{error}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={estado === "creando"} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-tinta-700 disabled:opacity-60">
                  {estado === "creando" ? ta.alta.creando : `✨ ${ta.alta.crear}`}
                </button>
                <span className="text-xs text-slate-500">{formato(ta.alta.restantes, { n: restantes })}</span>
              </div>
            </>
          )}
        </form>
      )}
    </section>
  );
}
