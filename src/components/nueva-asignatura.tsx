"use client";

// Alta de una asignatura: el temario se carga desde un archivo, pegando la lista o con IA.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";

type Modo = "archivo" | "texto" | "ia";

export function NuevaAsignatura({ nombreInicial = "", cursoId }: { nombreInicial?: string; /** Curso al que se enlaza al guardarla. */ cursoId?: string }) {
  const router = useRouter();
  const { t } = useTextos();
  const ta = t.profesor.asignaturas;
  const [modo, setModo] = useState<Modo>("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.set("modo", modo);
    if (cursoId) datos.set("curso", cursoId);
    datos.delete("archivo");
    if (modo === "archivo" && archivo) datos.set("archivo", archivo);
    setEstado("enviando");
    setMensaje("");
    try {
      const r = await fetch("/api/asignaturas", { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? ta.errores.noSeLeyo);
      router.push(`/profesor/asignaturas/${j.id}`);
    } catch (err) {
      setEstado("error");
      setMensaje(err instanceof Error ? err.message : ta.errores.noSeLeyo);
    }
  }

  const opcion = (valor: Modo, titulo: string, texto: string, icono: string) => (
    <button
      type="button"
      onClick={() => setModo(valor)}
      aria-pressed={modo === valor}
      className={`flex items-start gap-3 rounded-xl p-4 text-left ring-2 transition ${
        modo === valor ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {icono}
      </span>
      <span>
        <span className="block font-semibold text-slate-900">{titulo}</span>
        <span className="mt-1 block text-sm text-slate-600">{texto}</span>
      </span>
    </button>
  );

  const listo = modo !== "archivo" || archivo;
  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {ta.nombre}
            <input name="nombre" defaultValue={nombreInicial} maxLength={120} className={campo} placeholder={ta.ejemploNombre} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{ta.nombreAyuda}</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ta.nivel}
            <input name="nivel" maxLength={120} className={campo} placeholder={ta.ejemploNivel} />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{ta.comoCargar}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {opcion("archivo", ta.archivo, ta.archivoTexto, "📄")}
            {opcion("texto", ta.pegar, ta.pegarTexto, "📋")}
            {opcion("ia", ta.conIA, ta.conIATexto, "✨")}
          </div>
        </fieldset>

        {modo === "archivo" && (
          <div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
              {archivo ? formato(ta.archivoElegido, { n: archivo.name }) : ta.elegirArchivo}
              <input
                name="archivo"
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">{ta.archivoAyuda}</p>
          </div>
        )}
        {modo === "texto" && (
          <label className="block text-sm font-medium text-slate-700">
            {ta.textoTemario}
            <textarea name="texto" rows={12} required className={`${campo} font-mono text-[13px]`} placeholder={ta.ejemploTexto} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{ta.textoAyuda}</span>
          </label>
        )}
        {modo === "ia" && (
          <label className="block text-sm font-medium text-slate-700">
            {ta.indicaciones}
            <textarea name="indicaciones" rows={6} required minLength={10} maxLength={4000} className={campo} placeholder={ta.ejemploIndicaciones} />
          </label>
        )}

        {estado === "enviando" && (
          <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
            {modo === "ia" ? ta.generando : ta.creando}
          </p>
        )}
        {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{ta.sinCreditos}</p>
          <Boton type="submit" disabled={estado === "enviando" || !listo}>
            {estado === "enviando" ? (modo === "ia" ? ta.generando : ta.creando) : ta.crear}
          </Boton>
        </div>
      </div>
    </form>
  );
}
