"use client";

// Parte del alta de una actividad de contenido: material anexo con vista previa, tipo de entrega
// del alumno e instrucciones (escritas por el profesor o redactadas con IA a partir del material).
import { useState } from "react";
import { ACEPTA_ARCHIVOS, MAX_ANEXOS, MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL, claseDeArchivo, laIALee, revisarArchivos } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import type { EntregaContenido } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";
import { VisorArchivos, type ArchivoVisor } from "./visor-archivos";

const MB = (b: number) => Math.round(b / 1024 / 1024);

/** Mensaje del primer problema de la lista de archivos (cantidad, tipo o tamaño), o "" si no hay. */
export function useErrorArchivos() {
  const tc = useTextos().t.contenido;
  return (archivos: File[], max: number) => {
    const p = revisarArchivos(archivos, max);
    if (!p) return "";
    if (p.error === "cantidad") return formato(tc.errores.cantidad, { n: max });
    if (p.error === "tipo") return formato(tc.errores.tipo, { nombre: p.nombre ?? "" });
    if (p.error === "tamano") return formato(tc.errores.tamano, { nombre: p.nombre ?? "", mb: MB(MAX_BYTES_ARCHIVO) });
    return formato(tc.errores.total, { mb: MB(MAX_BYTES_TOTAL) });
  };
}

export function AltaContenido({
  anexos,
  onAnexos,
  entrega,
  onEntrega,
  instrucciones,
  onInstrucciones,
  datosIA,
}: {
  anexos: File[];
  onAnexos: (f: File[]) => void;
  entrega: EntregaContenido;
  onEntrega: (e: EntregaContenido) => void;
  instrucciones: string;
  onInstrucciones: (v: string) => void;
  /** Título, curso e idioma para que la IA redacte las instrucciones. */
  datosIA: () => { titulo: string; grupo: string; idioma: string };
}) {
  const { t } = useTextos();
  const tc = t.contenido;
  const errorDe = useErrorArchivos();
  const [peticion, setPeticion] = useState("");
  const [estadoIA, setEstadoIA] = useState<"listo" | "redactando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");
  const errorAnexos = errorDe(anexos, MAX_ANEXOS);

  const paraVisor: ArchivoVisor[] = anexos.map((f) => ({ archivo: f, nombre: f.name, clase: claseDeArchivo(f.name, f.type) ?? "pdf", bytes: f.size }));

  async function redactar() {
    if (instrucciones.trim() && !window.confirm(tc.confirmarReemplazo)) return;
    const { titulo, grupo, idioma } = datosIA();
    const datos = new FormData();
    datos.set("peticion", peticion);
    datos.set("titulo", titulo);
    datos.set("grupo", grupo);
    datos.set("idioma", idioma);
    datos.set("entregaContenido", entrega);
    // Del audio y el video solo va el nombre: la IA no los puede ver ni escuchar.
    const legibles = anexos.filter((f) => laIALee(claseDeArchivo(f.name, f.type) ?? "audio"));
    legibles.forEach((f) => datos.append("anexos", f));
    datos.set("otros", JSON.stringify(anexos.filter((f) => !legibles.includes(f)).map((f) => f.name)));
    setEstadoIA("redactando");
    setMensaje("");
    try {
      const r = await fetch("/api/actividades/instrucciones", { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tc.noSeRedacto);
      onInstrucciones((j.instrucciones as string[]).join("\n"));
      setEstadoIA("listo");
    } catch (e) {
      setEstadoIA("error");
      setMensaje(e instanceof Error ? e.message : tc.noSeRedacto);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-700">{tc.anexos}</p>
        <label className="mt-1 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
          <span className="text-2xl" aria-hidden>
            📕 📘 📗 📙 🎧 🎬
          </span>
          <span className="font-medium text-tinta-700">{anexos.length ? tc.agregarMas : tc.elegir}</span>
          <span className="text-xs">{formato(tc.anexosAyuda, { n: MAX_ANEXOS, mb: MB(MAX_BYTES_ARCHIVO) })}</span>
          <input
            type="file"
            accept={ACEPTA_ARCHIVOS}
            multiple
            className="sr-only"
            onChange={(e) => {
              onAnexos([...anexos, ...Array.from(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </label>
        {errorAnexos && <p className="mt-2 rounded-lg bg-error-suave px-3 py-2 text-sm text-error">{errorAnexos}</p>}
        {anexos.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-slate-500">{tc.vistaPrevia}</p>
            <VisorArchivos archivos={paraVisor} onQuitar={(i) => onAnexos(anexos.filter((_, j) => j !== i))} />
          </div>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">{tc.entrega}</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-2" role="radiogroup">
          {(["manuscrita", "digital"] as const).map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={entrega === e}
              onClick={() => onEntrega(e)}
              className={`flex items-start gap-3 rounded-xl p-4 text-left ring-2 transition ${
                entrega === e ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {e === "manuscrita" ? "✍️" : "💻"}
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{e === "manuscrita" ? tc.manuscrita : tc.digital}</span>
                <span className="mt-1 block text-sm text-slate-600">{e === "manuscrita" ? tc.manuscritaTexto : tc.digitalTexto}</span>
              </span>
            </button>
          ))}
        </div>
        {entrega === "digital" && <p className="mt-2 text-xs text-slate-500">{tc.notaAudioVideo}</p>}
      </fieldset>

      <div className="rounded-xl bg-gradient-to-br from-tinta-50 to-white p-4 ring-1 ring-tinta-100">
        <label className="block text-sm font-medium text-slate-700">
          {tc.promptTitulo}
          <textarea
            rows={3}
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            className={campo}
            placeholder={tc.ejemploPrompt}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">{tc.promptAyuda}</span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Boton type="button" variante="secundario" onClick={redactar} disabled={estadoIA === "redactando" || peticion.trim().length < 10 || Boolean(errorAnexos)}>
            {estadoIA === "redactando" ? tc.redactando : tc.redactar}
          </Boton>
          {estadoIA === "error" && <span className="text-sm text-error">{mensaje}</span>}
        </div>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        {tc.instrucciones}
        <textarea
          name="instruccionesAlumno"
          rows={6}
          required
          value={instrucciones}
          onChange={(e) => onInstrucciones(e.target.value)}
          className={campo}
          placeholder={tc.ejemploInstrucciones}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">{tc.instruccionesAyuda}</span>
      </label>
    </div>
  );
}
