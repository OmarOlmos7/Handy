"use client";

// El alumno resuelve una actividad autoasignada: ejercicios en pantalla o a mano (foto), videos o
// lectura con preguntas de comprobación, o tarjetas de estudio que escribe de memoria, voltea y
// autoevalúa. Mide el tiempo que la pestaña está abierta y visible.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MAX_FOTOS_EJERCICIO, type AutoevaluacionTarjeta } from "@/lib/autoestudio";
import { formato } from "@/lib/i18n/idiomas";
import { letra, letraDeOpcion, sinLetra } from "@/lib/plataforma";
import type { EjercicioAuto, TarjetaEstudio } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { TextoMat } from "./texto-mat";

/** Ejercicio sin la clave ni la explicación (el alumno aún no lo resuelve). */
export type EjercicioAlumno = Omit<EjercicioAuto, "respuesta" | "explicacion" | "procedimiento" | "tolerancia">;

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
type Respuesta = { seleccion?: string[]; texto?: string };

const opcionClase = (activa: boolean) =>
  `flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left text-sm ring-2 transition ${activa ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`;

function Marca({ activa, cuadro }: { activa: boolean; cuadro?: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[11px] font-bold ${cuadro ? "rounded-md" : "rounded-full"} ${activa ? "border-tinta-600 bg-tinta-600 text-white" : "border-slate-300 bg-white"}`}
    >
      {activa ? "✓" : ""}
    </span>
  );
}

function Ejercicio({ ej, valor, archivos, onCambiar, onArchivos }: { ej: EjercicioAlumno; valor: Respuesta; archivos: File[]; onCambiar: (v: Respuesta) => void; onArchivos: (f: File[]) => void }) {
  const th = useTextos().t.autoestudio.hacer;
  const sel = valor.seleccion ?? [];
  switch (ej.tipo) {
    case "opcion":
    case "multirespuesta": {
      const multiple = ej.tipo === "multirespuesta";
      return (
        <>
          <p className="mb-2 text-xs text-slate-500">{multiple ? th.elegirVarias : th.elegirUna}</p>
          <div className="space-y-2">
            {(ej.opciones ?? []).map((o, i) => {
              const l = letraDeOpcion(o, i);
              const activa = sel.includes(l);
              return (
                <button
                  key={l + i}
                  type="button"
                  role={multiple ? "checkbox" : "radio"}
                  aria-checked={activa}
                  onClick={() => onCambiar({ seleccion: multiple ? (activa ? sel.filter((x) => x !== l) : [...sel, l].sort()) : [l] })}
                  className={opcionClase(activa)}
                >
                  <Marca activa={activa} cuadro={multiple} />
                  <span>
                    <span className="mr-1 font-semibold text-slate-500">{l})</span>
                    <TextoMat texto={sinLetra(o)} />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      );
    }
    case "verdadero_falso":
      return (
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["V", "F"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={sel[0] === v} onClick={() => onCambiar({ seleccion: [v] })} className={`${opcionClase(sel[0] === v)} justify-center font-semibold`}>
              {v === "V" ? th.verdadero : th.falso}
            </button>
          ))}
        </div>
      );
    case "relacion":
    case "relacion_imagenes": {
      const conImagenes = ej.tipo === "relacion_imagenes";
      const letrasB = conImagenes ? (ej.imagenes ?? []).map((_, i) => letra(i)) : (ej.columnaB ?? []).map((o, i) => letraDeOpcion(o, i));
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{th.relacionar}</p>
          {conImagenes ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(ej.imagenes ?? []).map((im, i) => (
                <div key={i} className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svgUrl(im.svg)} alt={formato(th.imagen, { l: letra(i) })} className="aspect-[4/3] w-full rounded-lg object-contain p-1" />
                  <span className="mt-1 block text-center text-sm font-semibold text-slate-700">{letra(i)})</span>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              {(ej.columnaB ?? []).map((o, i) => (
                <li key={i}>
                  <span className="mr-1 font-semibold text-slate-500">{letrasB[i]})</span>
                  <TextoMat texto={sinLetra(o)} />
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-2">
            {(ej.columnaA ?? []).map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                <span className="text-sm">
                  <span className="mr-1 font-semibold text-slate-500">{i + 1}.</span>
                  <TextoMat texto={sinLetra(a)} />
                </span>
                <select
                  aria-label={`${i + 1}. ${sinLetra(a)}`}
                  value={sel[i] ?? ""}
                  onChange={(e) => {
                    const nueva = (ej.columnaA ?? []).map((_, j) => sel[j] ?? "");
                    nueva[i] = e.target.value;
                    onCambiar({ seleccion: nueva });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold"
                >
                  <option value="">{th.elige}</option>
                  {letrasB.map((l) => (
                    <option key={l} value={l}>
                      {l})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "texto":
      return (
        <label className="block text-sm font-medium text-slate-700">
          {th.escribe}
          <textarea
            value={valor.texto ?? ""}
            onChange={(e) => onCambiar({ texto: e.target.value })}
            rows={4}
            maxLength={4000}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
          />
        </label>
      );
    case "manuscrito":
      return (
        <div>
          <p className="mb-2 text-xs text-slate-500">{th.manuscrito}</p>
          <SubirFotos archivos={archivos} onArchivos={onArchivos} />
        </div>
      );
    case "numerica":
    case "numerica_desarrollo":
      return (
        <div className="space-y-3">
          {ej.tipo === "numerica_desarrollo" && (
            <div>
              <p className="mb-2 text-xs text-slate-500">{th.numericaDesarrollo}</p>
              <SubirFotos archivos={archivos} onArchivos={onArchivos} />
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            {th.resultado}
            <input
              value={sel[0] ?? ""}
              onChange={(e) => onCambiar({ seleccion: [e.target.value] })}
              inputMode="decimal"
              maxLength={40}
              placeholder={th.resultadoEjemplo}
              className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 text-base tabular-nums outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">{th.resultadoAyuda}</span>
          </label>
        </div>
      );
    default:
      return null;
  }
}

/** Botones para tomar la foto del procedimiento o elegir el archivo (iPad, PDF), con la lista. */
function SubirFotos({ archivos, onArchivos }: { archivos: File[]; onArchivos: (f: File[]) => void }) {
  const th = useTextos().t.autoestudio.hacer;
  const agregar = (fs: FileList | null) => onArchivos([...archivos, ...Array.from(fs ?? [])].slice(0, MAX_FOTOS_EJERCICIO));
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-tinta-600 px-3 py-2 text-sm font-medium text-white hover:bg-tinta-700">
          📷 {th.tomarFoto}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => agregar(e.target.files)} />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
          📎 {th.elegirArchivo}
          <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => agregar(e.target.files)} />
        </label>
      </div>
      {archivos.length > 0 && (
        <ul className="mt-3 space-y-1">
          {archivos.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => onArchivos(archivos.filter((_, j) => j !== i))} className="text-xs font-medium text-error hover:underline">
                {th.quitar}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Enunciado de completar con un campo en cada espacio (___). */
function Completar({ ej, valor, onCambiar }: { ej: EjercicioAlumno; valor: Respuesta; onCambiar: (v: Respuesta) => void }) {
  const th = useTextos().t.autoestudio.hacer;
  const partes = ej.enunciado.split(/_{3,}/);
  const sel = valor.seleccion ?? [];
  return (
    <>
      <p className="mb-2 text-xs text-slate-500">{th.completar}</p>
      <p className="text-[15px] leading-loose text-slate-800">
        {partes.map((p, i) => (
          <span key={i}>
            <TextoMat texto={p} />
            {i < partes.length - 1 && (
              <input
                aria-label={formato(th.espacio, { n: i + 1 })}
                value={sel[i] ?? ""}
                onChange={(e) => {
                  const nueva = partes.slice(0, -1).map((_, j) => sel[j] ?? "");
                  nueva[i] = e.target.value;
                  onCambiar({ seleccion: nueva });
                }}
                maxLength={60}
                className="mx-1 inline-block w-32 rounded-md border-b-2 border-tinta-400 bg-tinta-50 px-2 py-0.5 text-center font-medium text-tinta-900 outline-none focus:border-tinta-600"
              />
            )}
          </span>
        ))}
      </p>
    </>
  );
}

function contestado(ej: EjercicioAlumno, v: Respuesta | undefined, archivos: File[] | undefined) {
  if (ej.tipo === "manuscrito") return Boolean(archivos?.length);
  if (ej.tipo === "numerica_desarrollo") return Boolean(archivos?.length) && Boolean(v?.seleccion?.[0]?.trim());
  if (ej.tipo === "texto") return Boolean(v?.texto?.trim());
  return Boolean(v?.seleccion?.some((x) => x?.trim()));
}

/** Cuenta los segundos con la pestaña visible (lo que de verdad estudió). */
function useCronometro() {
  const segundos = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") segundos.current += 1;
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return segundos;
}

function Tarjetas({ tarjetas, estado, onCambiar }: { tarjetas: TarjetaEstudio[]; estado: { texto: string; nivel?: AutoevaluacionTarjeta; volteada: boolean }[]; onCambiar: (i: number, v: Partial<{ texto: string; nivel: AutoevaluacionTarjeta; volteada: boolean }>) => void }) {
  const th = useTextos().t.autoestudio.hacer;
  const [i, setI] = useState(0);
  const [pista, setPista] = useState(false);
  const tj = tarjetas[i];
  const e = estado[i];
  const ir = (n: number) => {
    setI(n);
    setPista(false);
  };
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-2 text-center text-sm font-medium text-slate-500">{formato(th.tarjetaN, { n: i + 1, t: tarjetas.length })}</p>
      <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
        {tarjetas.map((_, j) => (
          <span key={j} className={`h-2 w-6 rounded-full ${estado[j].nivel === "si" ? "bg-acierto" : estado[j].nivel === "casi" ? "bg-amber-400" : estado[j].nivel === "no" ? "bg-error" : j === i ? "bg-tinta-600" : "bg-slate-200"}`} />
        ))}
      </div>
      <div className={`tarjeta-estudio ${e.volteada ? "tarjeta-estudio-volteada" : ""}`}>
        <div className="tarjeta-estudio-cara grid">
          <div className="tarjeta-estudio-frente flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-14px_rgba(15,23,42,0.22)] [grid-area:1/1] sm:p-5">
            <div className="flex h-28 items-center justify-center rounded-2xl bg-slate-50">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 text-4xl shadow-sm">🧠</span>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-green-800">{th.etiquetaPregunta}</p>
            <p className="mt-2 text-xl font-bold leading-snug text-tinta-900">
              <TextoMat texto={tj.frente} negritas="font-extrabold text-tinta-900" />
            </p>
            {tj.pista && (
              <div className="mt-auto pt-5">
                {pista ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">💡 {tj.pista}</p>
                ) : (
                  <button type="button" onClick={() => setPista(true)} className="text-[15px] font-bold text-tinta-700 hover:text-tinta-900">
                    {th.verPista} →
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="tarjeta-estudio-reverso flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-14px_rgba(15,23,42,0.22)] [grid-area:1/1] sm:p-5">
            <div className="flex h-28 items-center justify-center rounded-2xl bg-slate-50">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-acierto-suave text-4xl shadow-sm">💡</span>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-green-800">{th.etiquetaRespuesta}</p>
            <p className="mt-2 text-lg font-semibold leading-relaxed text-tinta-900">
              <TextoMat texto={tj.reverso} />
            </p>
          </div>
        </div>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        {th.recuerda}
        <textarea
          value={e.texto}
          onChange={(ev) => onCambiar(i, { texto: ev.target.value })}
          rows={3}
          maxLength={400}
          disabled={e.volteada}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100 disabled:bg-slate-50"
        />
      </label>
      {!e.volteada ? (
        <button type="button" onClick={() => onCambiar(i, { volteada: true })} className="mt-3 w-full rounded-lg bg-tinta-600 px-4 py-2 text-sm font-medium text-white hover:bg-tinta-700">
          🔄 {th.voltear}
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-center text-sm text-slate-600">{th.comparar}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["si", th.loSabia, "bg-acierto-suave text-acierto ring-acierto/40"],
                ["casi", th.casi, "bg-aviso-suave text-aviso ring-aviso/40"],
                ["no", th.aunNo, "bg-error-suave text-error ring-error/40"],
              ] as const
            ).map(([n, texto, clase]) => (
              <button
                key={n}
                type="button"
                aria-pressed={e.nivel === n}
                onClick={() => {
                  onCambiar(i, { nivel: n });
                  if (i < tarjetas.length - 1) setTimeout(() => ir(i + 1), 350);
                }}
                className={`rounded-lg px-2 py-2 text-sm font-semibold ring-2 ${clase} ${e.nivel === n ? "ring-offset-2" : "ring-transparent"}`}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-between text-sm">
        <button type="button" disabled={i === 0} onClick={() => ir(i - 1)} className="rounded-lg px-3 py-1.5 font-medium text-tinta-700 hover:bg-tinta-50 disabled:opacity-30">
          ← {th.anterior}
        </button>
        <button type="button" disabled={i === tarjetas.length - 1} onClick={() => ir(i + 1)} className="rounded-lg px-3 py-1.5 font-medium text-tinta-700 hover:bg-tinta-50 disabled:opacity-30">
          {th.siguiente} →
        </button>
      </div>
    </div>
  );
}

export function HacerAutoactividad({
  id,
  ejercicios,
  tarjetas,
  contenido,
  tituloPreguntas,
}: {
  id: string;
  ejercicios: EjercicioAlumno[];
  tarjetas?: TarjetaEstudio[];
  /** Lectura o videos (se dibujan en el servidor) antes de las preguntas. */
  contenido?: ReactNode;
  tituloPreguntas?: string;
}) {
  const { t } = useTextos();
  const th = t.autoestudio.hacer;
  const router = useRouter();
  const segundos = useCronometro();
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [archivos, setArchivos] = useState<Record<number, File[]>>({});
  const [cartas, setCartas] = useState((tarjetas ?? []).map(() => ({ texto: "", nivel: undefined as AutoevaluacionTarjeta | undefined, volteada: false })));
  const [estado, setEstado] = useState<"listo" | "enviando">("listo");
  const [mensaje, setMensaje] = useState("");

  async function enviar() {
    const faltan = ejercicios.filter((e) => !contestado(e, respuestas[e.numero], archivos[e.numero])).length + cartas.filter((c) => !c.nivel).length;
    if (!window.confirm(faltan ? formato(th.faltan, { n: faltan }) : th.confirmar)) return;
    const datos = new FormData();
    datos.set("respuestas", JSON.stringify(ejercicios.map((e) => ({ numero: e.numero, ...respuestas[e.numero] }))));
    datos.set("tarjetas", JSON.stringify(cartas.map((c, i) => ({ numero: i + 1, texto: c.texto, nivel: c.nivel ?? "no" }))));
    datos.set("segundos", String(segundos.current));
    for (const [n, fs] of Object.entries(archivos)) fs.forEach((f) => datos.append(`archivo-${n}`, f));
    setEstado("enviando");
    setMensaje("");
    try {
      const r = await fetch(`/api/autoestudio/${id}`, { method: "POST", body: datos });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? th.noSePudo);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch (e) {
      setEstado("listo");
      setMensaje(e instanceof Error ? e.message : th.noSePudo);
    }
  }

  const conIA = ejercicios.some((e) => e.tipo === "texto" || e.tipo === "manuscrito" || e.tipo === "numerica_desarrollo");
  return (
    <div className="space-y-4">
      {contenido}
      {tarjetas && tarjetas.length > 0 && <Tarjetas tarjetas={tarjetas} estado={cartas} onCambiar={(i, v) => setCartas((cs) => cs.map((c, j) => (j === i ? { ...c, ...v } : c)))} />}
      {tituloPreguntas && ejercicios.length > 0 && <h2 className="pt-2 text-lg font-semibold text-slate-900">{tituloPreguntas}</h2>}
      {ejercicios.map((ej) => (
        <section key={ej.numero} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5" aria-labelledby={`ej-${ej.numero}`}>
          <h3 id={`ej-${ej.numero}`} className="text-sm font-semibold text-tinta-700">
            {formato(th.ejercicio, { n: ej.numero })} · <span className="font-normal text-slate-500">{t.autoestudio.tiposEjercicio[ej.tipo]}</span>
          </h3>
          {ej.tipo === "completar" ? (
            <div className="mt-2">
              <Completar ej={ej} valor={respuestas[ej.numero] ?? {}} onCambiar={(v) => setRespuestas((x) => ({ ...x, [ej.numero]: v }))} />
            </div>
          ) : (
            <>
              <div className={`mt-2 ${ej.ilustracion ? "sm:flex sm:items-start sm:gap-4" : ""}`}>
                <p className="flex-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">
                  <TextoMat texto={ej.enunciado} />
                </p>
                {ej.ilustracion && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={svgUrl(ej.ilustracion)} alt="" className="mt-3 w-44 shrink-0 rounded-lg ring-1 ring-slate-200 sm:mt-0" />
                )}
              </div>
              <div className="mt-4">
                <Ejercicio
                  ej={ej}
                  valor={respuestas[ej.numero] ?? {}}
                  archivos={archivos[ej.numero] ?? []}
                  onCambiar={(v) => setRespuestas((x) => ({ ...x, [ej.numero]: v }))}
                  onArchivos={(f) => setArchivos((x) => ({ ...x, [ej.numero]: f }))}
                />
              </div>
            </>
          )}
        </section>
      ))}
      <div className="sticky bottom-3 z-10 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {mensaje && <p className="mb-2 text-sm text-error">{mensaje}</p>}
        {estado === "enviando" && conIA && <p className="mb-2 text-sm text-slate-600">{th.revisando}</p>}
        <button type="button" onClick={enviar} disabled={estado === "enviando"} className="w-full rounded-lg bg-tinta-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-tinta-700 disabled:opacity-60">
          {estado === "enviando" ? th.enviando : `✅ ${th.enviar}`}
        </button>
      </div>
    </div>
  );
}
