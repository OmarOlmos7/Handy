"use client";

// Previsualizador del material de una actividad de contenido y de la evidencia digital del alumno:
// PDF e imágenes se ven tal cual, audio y video con su reproductor, y Word, Excel y PowerPoint con
// su formato original (el servidor los convierte a PDF con LibreOffice, sin enviarlos a servicios
// externos). Si la conversión no está disponible, se muestra su texto (párrafos, hojas o diapositivas).
import { useEffect, useMemo, useState } from "react";
import { ICONO_CLASE, claseDeArchivo, tamanoLegible } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import type { ClaseArchivo } from "@/lib/tipos";
import type { VistaArchivo as DatosVista } from "@/lib/vista-archivo";
import { useTextos } from "./proveedor-textos";
import { VisorPdf } from "./visor-pdf";

/** Archivo guardado (ruta en el servidor) o recién elegido en el navegador. */
export type ArchivoVisor = { nombre: string; clase: ClaseArchivo; bytes?: number } & ({ ruta: string } | { archivo: File });

export function archivoDeRuta(ruta: string, nombre?: string): ArchivoVisor | undefined {
  const clase = claseDeArchivo(ruta);
  return clase ? { ruta, nombre: nombre ?? ruta.split("/").at(-1) ?? ruta, clase } : undefined;
}

const esOffice = (c: ClaseArchivo) => c === "word" || c === "excel" || c === "ppt";

/** Pide al servidor la vista de un documento de Office: guardado (GET) o recién elegido (POST). */
function pedirVista(api: "vista" | "vista-pdf", archivo: ArchivoVisor) {
  if ("ruta" in archivo) return fetch(`/api/${api}/${archivo.ruta}`);
  const datos = new FormData();
  datos.set("archivo", archivo.archivo);
  return fetch(`/api/${api}/subido`, { method: "POST", body: datos });
}

/** Documento de Office con su formato original (PDF hecho en el servidor) o, si no se puede, solo su texto. */
function VistaOffice({ archivo }: { archivo: ArchivoVisor }) {
  const tv = useTextos().t.contenido.visor;
  const [pdf, setPdf] = useState<{ blob: Blob; url: string } | null>(null);
  const [modo, setModo] = useState<"cargando" | "pdf" | "texto">("cargando");
  useEffect(() => {
    let vigente = true;
    let url: string | undefined;
    pedirVista("vista-pdf", archivo)
      .then(async (r) => {
        if (!r.ok || !r.headers.get("Content-Type")?.includes("pdf")) throw new Error();
        const blob = await r.blob();
        if (!vigente) return;
        url = URL.createObjectURL(blob);
        setPdf({ blob, url });
        setModo("pdf");
      })
      .catch(() => vigente && setModo("texto"));
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [archivo]);

  if (modo === "cargando") {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-slate-500" role="status">
        <span className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-tinta-600" aria-hidden />
        {tv.preparando}
      </div>
    );
  }
  const alternar = pdf && (
    <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
      {modo === "pdf" && (
        <a href={pdf.url} target="_blank" rel="noopener" className="font-medium text-tinta-700 hover:underline">
          {tv.abrirPdf}
        </a>
      )}
      <button type="button" onClick={() => setModo(modo === "pdf" ? "texto" : "pdf")} className="font-medium text-tinta-700 hover:underline">
        {modo === "pdf" ? tv.verTexto : tv.verFormato}
      </button>
    </div>
  );
  if (modo === "pdf" && pdf) {
    return (
      <div>
        {alternar}
        <VisorPdf datos={pdf.blob} titulo={archivo.nombre} onError={() => setModo("texto")} />
      </div>
    );
  }
  return (
    <div>
      {alternar}
      <VistaTexto archivo={archivo} />
    </div>
  );
}

/** Solo el texto del documento (párrafos, hojas o diapositivas), leído en el servidor. */
function VistaTexto({ archivo }: { archivo: ArchivoVisor }) {
  const tv = useTextos().t.contenido.visor;
  const [vista, setVista] = useState<DatosVista | null>(null);
  const [error, setError] = useState(false);
  const [hoja, setHoja] = useState(0);
  useEffect(() => {
    let vigente = true;
    pedirVista("vista", archivo)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const v = (await r.json()) as DatosVista;
        if (vigente) setVista(v);
      })
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [archivo]);

  if (error) return <p className="p-6 text-center text-sm text-slate-500">{tv.sinVista}</p>;
  if (!vista) return <p className="p-6 text-center text-sm text-slate-500" role="status">{tv.cargando}</p>;
  if (vista.tipo === "texto") {
    return (
      <div className="max-h-[70vh] overflow-auto bg-slate-100 p-3 sm:p-6">
        <article className="mx-auto max-w-2xl space-y-3 rounded bg-white px-6 py-8 text-[15px] leading-relaxed text-slate-800 shadow-sm sm:px-10">
          {vista.parrafos.length ? vista.parrafos.map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>) : <p className="text-slate-400">{tv.sinTexto}</p>}
        </article>
      </div>
    );
  }
  if (vista.tipo === "diapositivas") {
    return (
      <div className="max-h-[70vh] space-y-4 overflow-auto bg-slate-100 p-3 sm:p-6">
        {vista.diapositivas.map((d, i) => (
          <section key={i} className="mx-auto flex aspect-video max-w-2xl flex-col rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <p className="text-[11px] font-semibold tracking-wide text-orange-600 uppercase">{formato(tv.diapositiva, { n: i + 1 })}</p>
            {d.length ? (
              <>
                <h3 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">{d[0]}</h3>
                <ul className="mt-3 space-y-1.5 overflow-hidden text-sm text-slate-700">
                  {d.slice(1).map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="m-auto text-sm text-slate-400">{tv.sinTexto}</p>
            )}
          </section>
        ))}
      </div>
    );
  }
  const actual = vista.hojas[hoja] ?? vista.hojas[0];
  return (
    <div>
      {vista.hojas.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 pt-2">
          {vista.hojas.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setHoja(i)}
              className={`shrink-0 rounded-t-md px-3 py-1.5 text-xs font-medium ${i === hoja ? "bg-white text-emerald-700 ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              {h.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-[65vh] overflow-auto">
        {actual && (
          <table className="min-w-full border-collapse text-xs">
            <tbody>
              {actual.filas.map((f, i) => (
                <tr key={i} className={i === 0 ? "bg-emerald-50 font-semibold" : ""}>
                  <th className="sticky left-0 border border-slate-200 bg-slate-50 px-2 py-1 text-right font-normal text-slate-400">{i + 1}</th>
                  {f.map((c, j) => (
                    <td key={j} className="border border-slate-200 px-2 py-1 whitespace-nowrap text-slate-700">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-400">{tv.filas}</p>
    </div>
  );
}

/** Vista de un solo archivo. */
export function VistaArchivo({ archivo }: { archivo: ArchivoVisor }) {
  const tv = useTextos().t.contenido.visor;
  const local = "archivo" in archivo ? archivo.archivo : undefined;
  const urlLocal = useMemo(() => (local ? URL.createObjectURL(local) : undefined), [local]);
  useEffect(() => () => void (urlLocal && URL.revokeObjectURL(urlLocal)), [urlLocal]);
  const src = "ruta" in archivo ? `/api/archivos/${archivo.ruta}` : urlLocal!;

  if (esOffice(archivo.clase)) return <VistaOffice archivo={archivo} />;
  if (archivo.clase === "pdf") return <iframe src={src} title={archivo.nombre} className="h-[70vh] w-full bg-slate-100" />;
  if (archivo.clase === "imagen") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={archivo.nombre} className="mx-auto max-h-[70vh] w-auto bg-slate-100 object-contain" />;
  }
  if (archivo.clase === "audio") {
    return (
      <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-tinta-50 to-white px-4 py-10">
        <span className="text-5xl" aria-hidden>
          🎧
        </span>
        <audio controls preload="metadata" src={src} className="w-full max-w-md">
          {tv.noSoportado}
        </audio>
      </div>
    );
  }
  return (
    <video controls playsInline preload="metadata" src={src} className="max-h-[70vh] w-full bg-black">
      {tv.noSoportado}
    </video>
  );
}

/**
 * Lista de archivos con su previsualizador: se elige uno arriba y se ve abajo. Con `onQuitar`,
 * cada archivo se puede quitar (en el alta, antes de guardar).
 */
export function VisorArchivos({ archivos, onQuitar, inicial = 0 }: { archivos: ArchivoVisor[]; onQuitar?: (i: number) => void; inicial?: number }) {
  const { t } = useTextos();
  const tv = t.contenido.visor;
  const [sel, setSel] = useState(inicial);
  if (!archivos.length) return null;
  const i = Math.min(sel, archivos.length - 1);
  const actual = archivos[i];
  const descarga = "ruta" in actual ? `/api/archivos/${actual.ruta}` : undefined;
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <ul className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2">
        {archivos.map((a, j) => (
          <li key={j} className="shrink-0">
            <div
              className={`flex max-w-56 items-center gap-2 rounded-lg py-1.5 pr-2 pl-2.5 text-sm transition ${
                j === i ? "bg-white font-medium text-tinta-700 shadow-sm ring-1 ring-tinta-300" : "text-slate-600 hover:bg-white"
              }`}
            >
              <button type="button" onClick={() => setSel(j)} className="flex min-w-0 items-center gap-2 text-left" aria-pressed={j === i}>
                <span aria-hidden>{ICONO_CLASE[a.clase]}</span>
                <span className="min-w-0">
                  <span className="block truncate">{a.nombre}</span>
                  {a.bytes !== undefined && <span className="block text-[11px] font-normal text-slate-400">{tamanoLegible(a.bytes)}</span>}
                </span>
              </button>
              {onQuitar && (
                <button
                  type="button"
                  onClick={() => onQuitar(j)}
                  className="ml-1 rounded px-1 text-slate-400 hover:bg-error-suave hover:text-error"
                  aria-label={`${t.contenido.quitar} ${a.nombre}`}
                  title={t.contenido.quitar}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-500">
        <span className="truncate">
          {archivos.length > 1 && <span className="mr-2">{formato(tv.archivoDe, { n: i + 1, total: archivos.length })}</span>}
          <span className="font-medium text-slate-700">{actual.nombre}</span>
        </span>
        {descarga && (
          <span className="flex shrink-0 gap-3">
            <a href={descarga} target="_blank" rel="noopener" className="font-medium text-tinta-700 hover:underline">
              {tv.abrir}
            </a>
            <a href={descarga} download={actual.nombre} className="font-medium text-tinta-700 hover:underline">
              {tv.descargar}
            </a>
          </span>
        )}
      </div>
      <div key={i} className="border-t border-slate-200">
        <VistaArchivo archivo={actual} />
      </div>
    </div>
  );
}
