"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Grupo } from "@/lib/tipos";
import { Boton, BotonLink, campo } from "./ui";

type Modo = "ia" | "escaneada";

const EJEMPLO_PROMPT = `Ejemplo:
Tema: Leyes de Newton y fuerza neta.
Reactivos: 4 de opción múltiple (10 puntos cada uno), 3 de verdadero o falso (10 puntos c/u) y 1 problema de desarrollo con procedimiento (30 puntos).
Ilustraciones: en el problema de desarrollo, un diagrama de cuerpo libre del bloque a la derecha del texto; en la opción múltiple 2, una gráfica de velocidad contra tiempo abajo del enunciado.
Nivel: 2.º de secundaria, con datos de la vida diaria.`;

/** Paso 1: crear la actividad con IA o cargarla escaneada. */
export function NuevaActividad({
  grupos,
  hoy,
  grupoInicial,
}: {
  grupos: Pick<Grupo, "id" | "materia" | "nombre">[];
  hoy: string;
  grupoInicial?: string;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("ia");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  if (grupos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">Primero registra un curso.</p>
        <BotonLink href="/profesor/grupos/nuevo" className="mt-4">
          Nuevo curso
        </BotonLink>
      </div>
    );
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.set("modo", modo);
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
      setMensaje(err instanceof Error ? err.message : "No se pudo crear la actividad");
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
        {opcion("ia", "Nueva actividad con IA", "Describe tipo de reactivos, ponderaciones y temas. La IA arma la hoja lista para imprimir con QR.", "✨")}
        {opcion("escaneada", "Cargar actividad escaneada", "Sube las fotos o el PDF de tu actividad en blanco. Le agregamos encabezado y QR.", "📄")}
      </div>

      <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Curso
            <select name="grupo" className={campo} required defaultValue={grupos.some((g) => g.id === grupoInicial) ? grupoInicial : undefined}>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.materia} · {g.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha de aplicación
            <input name="fecha" type="date" className={campo} defaultValue={hoy} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Título de la actividad
          <input name="titulo" required className={campo} placeholder="Ej. Leyes de Newton" />
        </label>

        {modo === "ia" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              ¿Qué actividad quieres? Indica el tipo de reactivos, las ponderaciones y los temas
              <textarea name="prompt" rows={7} required minLength={10} className={campo} placeholder={EJEMPLO_PROMPT} />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Tipos disponibles: opción múltiple, verdadero o falso, relación de columnas, paréntesis, problemas de desarrollo y
                preguntas abiertas. Puedes pedir el nivel, el número de reactivos y cuántos puntos vale cada uno.
                <span className="mt-1 block">
                  <strong className="font-semibold text-slate-600">Ilustraciones y gráficas:</strong> pídelas aquí indicando en qué reactivo
                  van, qué deben mostrar y su ubicación: <em>a la derecha del texto</em> (pequeña) o <em>abajo del enunciado</em> (más
                  grande, ideal para gráficas con datos). Si no las pides, la hoja no lleva dibujos.
                </span>
              </span>
            </label>
            <label className="block w-40 text-sm font-medium text-slate-700">
              Páginas aproximadas
              <input name="paginas" type="number" min={1} max={10} defaultValue={1} className={campo} />
            </label>
          </>
        ) : (
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
            {archivos.length
              ? `${archivos.length} archivo${archivos.length > 1 ? "s" : ""}: ${archivos.map((f) => f.name).join(", ")}`
              : "Toca para elegir las fotos o el PDF de tu actividad en blanco (una foto por página, en orden)"}
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

        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Calificar sobre</legend>
          <div className="mt-1 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {[100, 10].map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 has-[:checked]:bg-white has-[:checked]:text-tinta-700 has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-slate-200"
              >
                <input type="radio" name="escala" value={n} defaultChecked={n === 100} className="sr-only" />
                {n} puntos
              </label>
            ))}
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            Las calificaciones de esta actividad (hoja, reportes, PDF y Excel) se muestran en esta escala.
          </span>
        </fieldset>

        <label className="block max-w-sm text-sm font-medium text-slate-700">
          Resultados visibles para alumnos desde
          <input name="resultadosDesde" type="datetime-local" className={campo} />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Opcional. Los resultados se liberan solos al evaluarse; con esta fecha y hora, los alumnos no los ven antes y tú
            tienes tiempo de revisarlos y corregirlos. Si lo dejas vacío, los ven en cuanto se evalúan. Hora del centro de México.
          </span>
        </label>

        {estado === "enviando" && (
          <p className="rounded-lg bg-tinta-50 p-3 text-sm text-tinta-700" role="status">
            {modo === "ia"
              ? "La IA está diseñando tu actividad. Tarda entre 30 segundos y 2 minutos…"
              : "Subiendo tu actividad…"}
          </p>
        )}
        {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Crear la actividad no consume créditos.</p>
          <Boton type="submit" disabled={estado === "enviando" || (modo === "escaneada" && archivos.length === 0)}>
            {estado === "enviando" ? (modo === "ia" ? "Generando…" : "Subiendo…") : modo === "ia" ? "Generar actividad con IA" : "Cargar actividad"}
          </Boton>
        </div>
      </div>
    </form>
  );
}
