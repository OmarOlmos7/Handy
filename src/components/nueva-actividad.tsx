"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { EsfuerzoIA, EstiloCorreccion, Grupo, MotorIA } from "@/lib/tipos";
import { DeslizadorPrecision } from "./precision-ia";
import { MAX_VERSIONES, letraVersion } from "@/lib/versiones";
import { OpcionEstilo, OpcionSolucion } from "./opcion-solucion";
import { Boton, BotonLink, campo } from "./ui";
import { IDIOMAS, NOMBRE_IDIOMA, formato, type Idioma } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

type Modo = "ia" | "escaneada";

/** Paso 1: crear la actividad con IA o cargarla escaneada. */
export function NuevaActividad({
  grupos,
  hoy,
  grupoInicial,
  motorInicial = "medio",
  esfuerzos = { rapido: "bajo", medio: "medio", preciso: "medio" },
  idiomaInicial = "es",
}: {
  grupos: Pick<Grupo, "id" | "materia" | "nombre">[];
  hoy: string;
  grupoInicial?: string;
  /** Nivel de precisión con el que arranca el deslizador (el de la configuración; Medio si no hay). */
  motorInicial?: MotorIA;
  esfuerzos?: Record<MotorIA, EsfuerzoIA>;
  /** Idioma con el que arranca "Idioma de la actividad" (el oficial del país del profesor). */
  idiomaInicial?: Idioma;
}) {
  const router = useRouter();
  const tn = useTextos().t.profesor.nuevaActividad;
  const [modo, setModo] = useState<Modo>("ia");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [sinSolucion, setSinSolucion] = useState(false);
  const [estilo, setEstilo] = useState<EstiloCorreccion>("margen");
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  if (grupos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">{tn.primeroCurso}</p>
        <BotonLink href="/profesor/grupos/nuevo" className="mt-4">
          {tn.nuevoCurso}
        </BotonLink>
      </div>
    );
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.set("modo", modo);
    datos.set("sinSolucion", sinSolucion ? "1" : "");
    datos.delete("solucion");
    datos.set("estiloCorreccion", estilo);
    datos.delete("archivos");
    if (modo === "escaneada") archivos.forEach((f) => datos.append("archivos", f));
    setEstado("enviando");
    setMensaje("");
    try {
      const r = await fetch("/api/actividades/nueva", { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      router.push(j.siguiente);
    } catch (err) {
      setEstado("error");
      setMensaje(err instanceof Error ? err.message : tn.noSeCreo);
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
      <span className="text-3xl" aria-hidden>
        {icono}
      </span>
      <span>
        <span className="block font-semibold text-slate-900">{titulo}</span>
        <span className="mt-1 block text-sm text-slate-600">{texto}</span>
      </span>
    </button>
  );

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {opcion("ia", tn.conIA, tn.conIATexto, "✨")}
        {opcion("escaneada", tn.escaneada, tn.escaneadaTexto, "📄")}
      </div>

      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {tn.curso}
            <select name="grupo" className={campo} required defaultValue={grupos.some((g) => g.id === grupoInicial) ? grupoInicial : undefined}>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.materia} · {g.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {tn.fecha}
            <input name="fecha" type="date" className={campo} defaultValue={hoy} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          {tn.idiomaActividad}
          <select name="idioma" className={campo} defaultValue={idiomaInicial}>
            {IDIOMAS.map((i) => (
              <option key={i} value={i}>
                {NOMBRE_IDIOMA[i]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">{tn.idiomaActividadTexto}</span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {tn.tituloActividad}
          <input name="titulo" required className={campo} placeholder={tn.ejemploTitulo} />
        </label>

        {modo === "ia" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              {tn.queActividad}
              <textarea name="prompt" rows={7} required minLength={10} className={campo} placeholder={tn.ejemploPrompt} />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {tn.tiposDisponibles}
                <span className="mt-1 block">
                  <strong className="font-semibold text-slate-600">{tn.ilustraciones}</strong>
                  {tn.ilustracionesAntes}
                  <em>{tn.derecha}</em>
                  {tn.ilustracionesMedio}
                  <em>{tn.abajo}</em>
                  {tn.ilustracionesDespues}
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-start gap-4">
              <label className="block w-40 text-sm font-medium text-slate-700">
                {tn.paginas}
                <input name="paginas" type="number" min={1} max={10} defaultValue={1} className={campo} />
              </label>
              {!sinSolucion && (
                <label className="block min-w-0 flex-1 text-sm font-medium text-slate-700 sm:max-w-md">
                  {tn.versiones}
                  <select name="versiones" defaultValue={1} className={`${campo} block sm:w-56`}>
                    {Array.from({ length: MAX_VERSIONES }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? tn.versionesUna : `${n} (${Array.from({ length: n }, (_, k) => letraVersion(k)).join(", ")})`}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-500">{tn.versionesAyuda}</span>
                </label>
              )}
            </div>
          </>
        ) : (
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
            {archivos.length
              ? formato(archivos.length > 1 ? tn.archivoN : tn.archivo1, { n: archivos.length, lista: archivos.map((f) => f.name).join(", ") })
              : tn.elegirArchivos}
            <input
              name="archivos"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
            />
          </label>
        )}

        <OpcionSolucion
          sinSolucion={sinSolucion}
          onCambio={(v) => {
            setSinSolucion(v);
            // Sugerencia: sin solución (producciones escritas) se suele subrayar; se puede cambiar abajo.
            setEstilo(v ? "subrayado" : "margen");
          }}
        />
        <OpcionEstilo estilo={estilo} onCambio={setEstilo} />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{tn.calificarSobre}</legend>
          <div className="mt-1 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {([100, 10, "sin"] as const).map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 has-[:checked]:bg-white has-[:checked]:text-tinta-700 has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-slate-200"
              >
                <input type="radio" name="escala" value={n} defaultChecked={n === 100} className="sr-only" />
                {n === "sin" ? tn.sinPuntos : formato(tn.puntos, { n })}
              </label>
            ))}
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            {tn.escalaTexto}
          </span>
        </fieldset>

        <DeslizadorPrecision inicial={motorInicial} esfuerzos={esfuerzos} />

        <label className="block max-w-sm text-sm font-medium text-slate-700">
          {tn.resultadosDesde}
          <input name="resultadosDesde" type="datetime-local" className={campo} />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {tn.resultadosAyuda}
          </span>
        </label>

        {estado === "enviando" && (
          <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
            {modo === "ia"
              ? tn.disenando
              : tn.subiendo}
          </p>
        )}
        {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{tn.sinCreditos}</p>
          <Boton type="submit" disabled={estado === "enviando" || (modo === "escaneada" && archivos.length === 0)}>
            {estado === "enviando" ? (modo === "ia" ? tn.generando : tn.subiendoCorto) : modo === "ia" ? tn.generar : tn.cargar}
          </Boton>
        </div>
      </div>
    </form>
  );
}
