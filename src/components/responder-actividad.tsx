"use client";

// El alumno responde una actividad en plataforma desde su computadora o celular: elige, escribe,
// ordena, relaciona y sube la foto de sus desarrollos. Lo mismo sirve de vista previa al profesor.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formato } from "@/lib/i18n/idiomas";
import { MAX_ARCHIVOS_REACTIVO, letra, letraDeOpcion, sinLetra, type ReactivoAlumno } from "@/lib/plataforma";
import { useTextos } from "./proveedor-textos";
import { TextoMat } from "./texto-mat";
import { Boton } from "./ui";

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

type Respuesta = { texto?: string; seleccion?: string[] };

const opcionClase = (activa: boolean) =>
  `flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left text-sm ring-2 transition ${
    activa ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
  }`;

function Marca({ activa, cuadro }: { activa: boolean; cuadro?: boolean }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[11px] font-bold ${cuadro ? "rounded-md" : "rounded-full"} ${
        activa ? "border-tinta-600 bg-tinta-600 text-white" : "border-slate-300 bg-white"
      }`}
    >
      {activa ? "✓" : ""}
    </span>
  );
}

function Opciones({ opciones, valor, multiple, onCambiar }: { opciones: string[]; valor: string[]; multiple?: boolean; onCambiar: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {opciones.map((o, i) => {
        const l = letraDeOpcion(o, i);
        const activa = valor.includes(l);
        return (
          <button
            key={l + i}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={activa}
            onClick={() => onCambiar(multiple ? (activa ? valor.filter((x) => x !== l) : [...valor, l].sort()) : [l])}
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
  );
}

function DosOpciones({ valores, etiquetas, valor, onCambiar }: { valores: [string, string]; etiquetas: [string, string]; valor?: string; onCambiar: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {valores.map((v, i) => (
        <button key={v} type="button" role="radio" aria-checked={valor === v} onClick={() => onCambiar(v)} className={`${opcionClase(valor === v)} justify-center font-semibold`}>
          {etiquetas[i]}
        </button>
      ))}
    </div>
  );
}

function Imagen({ svg, etiqueta, activa, onClick }: { svg: string; etiqueta: string; activa?: boolean; onClick?: () => void }) {
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgUrl(svg)} alt={etiqueta} className="aspect-[4/3] w-full rounded-lg bg-white object-contain p-1" />
      <span className="mt-1 block text-center text-sm font-semibold text-slate-700">{etiqueta.slice(-1)})</span>
    </>
  );
  if (!onClick) return <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">{contenido}</div>;
  return (
    <button type="button" role="checkbox" aria-checked={activa} onClick={onClick} className={`rounded-xl p-2 ring-2 transition ${activa ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"}`}>
      {contenido}
    </button>
  );
}

function Reactivo({
  r,
  valor,
  archivos,
  onCambiar,
  onArchivos,
}: {
  r: ReactivoAlumno;
  valor: Respuesta;
  archivos: File[];
  onCambiar: (v: Respuesta) => void;
  onArchivos: (f: File[]) => void;
}) {
  const tr = useTextos().t.alumno.responder;
  const sel = valor.seleccion ?? [];
  const letrasB = (r.columnaB ?? []).map((o, i) => letraDeOpcion(o, i));
  const letrasImg = (r.imagenes ?? []).map((_, i) => letra(i));

  switch (r.tipo) {
    case "opcion_multiple":
      return (
        <>
          <p className="mb-2 text-xs text-slate-500">{tr.elegirUna}</p>
          <Opciones opciones={r.opciones ?? []} valor={sel} onCambiar={(s) => onCambiar({ seleccion: s })} />
        </>
      );
    case "seleccion_multiple":
      return (
        <>
          <p className="mb-2 text-xs text-slate-500">{tr.elegirVarias}</p>
          <Opciones opciones={r.opciones ?? []} valor={sel} multiple onCambiar={(s) => onCambiar({ seleccion: s })} />
        </>
      );
    case "verdadero_falso":
      return <DosOpciones valores={["V", "F"]} etiquetas={[tr.verdadero, tr.falso]} valor={sel[0]} onCambiar={(v) => onCambiar({ seleccion: [v] })} />;
    case "si_no":
      return <DosOpciones valores={["Sí", "No"]} etiquetas={[tr.si, tr.no]} valor={sel[0]} onCambiar={(v) => onCambiar({ seleccion: [v] })} />;
    case "relacion_columnas":
    case "relacion_imagenes": {
      const opcionesLetra = r.tipo === "relacion_imagenes" ? letrasImg : letrasB;
      return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{tr.relacionar}</p>
          {r.tipo === "relacion_imagenes" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(r.imagenes ?? []).map((svg, i) => (
                <Imagen key={i} svg={svg} etiqueta={formato(tr.imagen, { l: letra(i) })} />
              ))}
            </div>
          ) : (
            <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              {(r.columnaB ?? []).map((o, i) => (
                <li key={i}>
                  <span className="mr-1 font-semibold text-slate-500">{letrasB[i]})</span>
                  <TextoMat texto={sinLetra(o)} />
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-2">
            {(r.columnaA ?? []).map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                <span className="text-sm">
                  <span className="mr-1 font-semibold text-slate-500">{i + 1}.</span>
                  <TextoMat texto={sinLetra(a)} />
                </span>
                <select
                  aria-label={`${i + 1}. ${sinLetra(a)}`}
                  value={sel[i] ?? ""}
                  onChange={(e) => {
                    const nueva = (r.columnaA ?? []).map((_, j) => sel[j] ?? "");
                    nueva[i] = e.target.value;
                    onCambiar({ seleccion: nueva });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold"
                >
                  <option value="">{tr.elige}</option>
                  {opcionesLetra.map((l) => (
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
    case "orden": {
      const base = (r.opciones ?? []).map((o, i) => letraDeOpcion(o, i));
      const orden = sel.length === base.length ? sel : base;
      const texto = (l: string) => sinLetra((r.opciones ?? [])[base.indexOf(l)] ?? "");
      const mover = (i: number, d: -1 | 1) => {
        const nuevo = [...orden];
        [nuevo[i], nuevo[i + d]] = [nuevo[i + d], nuevo[i]];
        onCambiar({ seleccion: nuevo });
      };
      return (
        <>
          <p className="mb-2 text-xs text-slate-500">{tr.ordenar}</p>
          <ol className="space-y-2">
            {orden.map((l, i) => (
              <li key={l} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-sm font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm">
                  <TextoMat texto={texto(l)} />
                </span>
                <span className="flex flex-col">
                  <button type="button" aria-label={tr.subir} disabled={i === 0} onClick={() => mover(i, -1)} className="px-2 text-slate-500 hover:text-tinta-700 disabled:opacity-20">
                    ▲
                  </button>
                  <button type="button" aria-label={tr.bajar} disabled={i === orden.length - 1} onClick={() => mover(i, 1)} className="px-2 text-slate-500 hover:text-tinta-700 disabled:opacity-20">
                    ▼
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </>
      );
    }
    case "numerica":
      return (
        <label className="block text-sm font-medium text-slate-700">
          {tr.tuNumero}
          <input
            inputMode="decimal"
            value={valor.texto ?? ""}
            onChange={(e) => onCambiar({ texto: e.target.value })}
            maxLength={40}
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 text-base tabular-nums outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">{tr.numero}</span>
        </label>
      );
    case "abierto":
      return (
        <label className="block text-sm font-medium text-slate-700">
          {tr.escribe}
          <textarea
            value={valor.texto ?? ""}
            onChange={(e) => onCambiar({ texto: e.target.value })}
            rows={Math.max(3, Math.min(12, r.lineas ?? 4))}
            maxLength={4000}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
          />
          <span className="mt-1 block text-right text-xs font-normal text-slate-400">{formato(tr.caracteres, { n: (valor.texto ?? "").length })}</span>
        </label>
      );
    case "seleccion_imagenes":
      return (
        <>
          <p className="mb-2 text-xs text-slate-500">{tr.seleccionaImagenes}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(r.imagenes ?? []).map((svg, i) => {
              const l = letra(i);
              const activa = sel.includes(l);
              return (
                <Imagen
                  key={i}
                  svg={svg}
                  etiqueta={formato(tr.imagen, { l })}
                  activa={activa}
                  onClick={() => onCambiar({ seleccion: activa ? sel.filter((x) => x !== l) : [...sel, l].sort() })}
                />
              );
            })}
          </div>
        </>
      );
    case "desarrollo":
      return (
        <div>
          <p className="mb-2 text-xs text-slate-500">{tr.archivo}</p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-tinta-600 px-3 py-2 text-sm font-medium text-white hover:bg-tinta-700">
              📷 {tr.tomarFoto}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => onArchivos([...archivos, ...Array.from(e.target.files ?? [])].slice(0, MAX_ARCHIVOS_REACTIVO))}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              📎 {tr.elegirArchivo}
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="sr-only"
                onChange={(e) => onArchivos([...archivos, ...Array.from(e.target.files ?? [])].slice(0, MAX_ARCHIVOS_REACTIVO))}
              />
            </label>
          </div>
          {archivos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {archivos.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => onArchivos(archivos.filter((_, j) => j !== i))} className="text-xs font-medium text-error hover:underline">
                    {tr.quitar}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    default:
      return null;
  }
}

/** true si el alumno ya contestó el reactivo (el orden siempre cuenta como contestado). */
function contestado(r: ReactivoAlumno, v: Respuesta | undefined, archivos: File[] | undefined) {
  if (r.tipo === "orden") return true;
  if (r.tipo === "desarrollo") return Boolean(archivos?.length);
  if (r.tipo === "abierto" || r.tipo === "numerica") return Boolean(v?.texto?.trim());
  return Boolean(v?.seleccion?.some((x) => x));
}

export function ResponderActividad({
  actividadId,
  reactivos,
  instrucciones,
  version,
  vistaPrevia,
}: {
  actividadId: string;
  reactivos: ReactivoAlumno[];
  instrucciones?: string[];
  version?: string;
  /** Para el profesor: se puede contestar pero no se envía. */
  vistaPrevia?: boolean;
}) {
  const { t } = useTextos();
  const tr = t.alumno.responder;
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [archivos, setArchivos] = useState<Record<number, File[]>>({});
  const [estado, setEstado] = useState<"listo" | "enviando" | "error" | "enviado">("listo");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<{ evaluada: boolean; automatica: boolean } | null>(null);

  async function enviar() {
    const faltan = reactivos.filter((r) => !contestado(r, respuestas[r.numero], archivos[r.numero])).length;
    const aviso = faltan ? (faltan === 1 ? tr.falta1 : formato(tr.faltan, { n: faltan })) : tr.confirmar;
    if (!window.confirm(aviso)) return;
    const datos = new FormData();
    const lista = reactivos.map((r) => {
      const v = respuestas[r.numero] ?? {};
      // El orden que ve el alumno es su respuesta aunque no lo haya movido.
      if (r.tipo === "orden" && !v.seleccion?.length) return { numero: r.numero, seleccion: (r.opciones ?? []).map((o, i) => letraDeOpcion(o, i)) };
      return { numero: r.numero, ...v };
    });
    datos.set("respuestas", JSON.stringify(lista));
    for (const [n, fs] of Object.entries(archivos)) fs.forEach((f) => datos.append(`archivo-${n}`, f));
    setEstado("enviando");
    setMensaje("");
    try {
      const r = await fetch(`/api/respuestas/${actividadId}`, { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tr.noSePudo);
      setResultado({ evaluada: Boolean(j.evaluada), automatica: Boolean(j.automatica) });
      setEstado("enviado");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : tr.noSePudo);
    }
  }

  if (estado === "enviado" && resultado) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-4xl" aria-hidden>
          ✅
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">{tr.enviadas}</h2>
        <p className="mt-1 text-sm text-slate-600">{resultado.evaluada ? tr.calificadas : resultado.automatica ? tr.iaRevisa : tr.profesorRevisara}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {resultado.evaluada && (
            <Link href={`/alumno/reporte/${actividadId}`} className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-medium text-white hover:bg-tinta-700">
              {tr.verRetro}
            </Link>
          )}
          <Link href="/alumno" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
            {tr.misActividades}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vistaPrevia && <p className="rounded-lg bg-aviso-suave px-4 py-3 text-sm text-aviso">{tr.vistaPrevia}</p>}
      {version && <p className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">{formato(tr.version, { v: version })}</p>}
      {instrucciones && instrucciones.length > 0 && (
        <ul className="list-disc space-y-1 rounded-xl bg-tinta-50 py-3 pl-8 pr-4 text-sm text-tinta-900">
          {instrucciones.map((x, i) => (
            <li key={i}>
              <TextoMat texto={x} />
            </li>
          ))}
        </ul>
      )}
      {reactivos.map((r) => (
        <section key={r.numero} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5" aria-labelledby={`reactivo-${r.numero}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={`reactivo-${r.numero}`} className="text-sm font-semibold text-tinta-700">
              {formato(tr.reactivo, { n: r.numero })}
            </h3>
            <span className="text-xs font-medium text-slate-500">{r.puntos === 1 ? tr.pt1 : formato(tr.pts, { n: r.puntos })}</span>
          </div>
          <div className={`mt-2 ${r.ilustracion && r.ubicacionIlustracion !== "abajo" ? "sm:flex sm:items-start sm:gap-4" : ""}`}>
            <p className="flex-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800">
              <TextoMat texto={r.enunciado} />
            </p>
            {r.ilustracion && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={svgUrl(r.ilustracion)}
                alt=""
                className={r.ubicacionIlustracion === "abajo" ? "mx-auto mt-3 block w-full max-w-md rounded-lg ring-1 ring-slate-200" : "mt-3 w-40 shrink-0 rounded-lg ring-1 ring-slate-200 sm:mt-0"}
              />
            )}
          </div>
          <div className="mt-4">
            <Reactivo
              r={r}
              valor={respuestas[r.numero] ?? {}}
              archivos={archivos[r.numero] ?? []}
              onCambiar={(v) => setRespuestas((x) => ({ ...x, [r.numero]: v }))}
              onArchivos={(f) => setArchivos((x) => ({ ...x, [r.numero]: f }))}
            />
          </div>
        </section>
      ))}
      {!vistaPrevia && (
        <div className="sticky bottom-3 z-10 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          {mensaje && <p className="mb-2 text-sm text-error">{mensaje}</p>}
          <Boton type="button" className="w-full" onClick={enviar} disabled={estado === "enviando"}>
            {estado === "enviando" ? tr.enviando : tr.enviar}
          </Boton>
        </div>
      )}
    </div>
  );
}
