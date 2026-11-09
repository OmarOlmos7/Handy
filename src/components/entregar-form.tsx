"use client";

import { useEffect, useState } from "react";
import { Boton } from "./ui";

interface Pagina {
  id: string;
  archivo: File;
  url: string;
}

/**
 * Entrega del alumno desde el celular: toma una foto por página, las ordena y envía.
 * Equivale a la app móvil mientras se construye la versión con Expo.
 */
export function EntregarForm({
  actividadId,
  titulo,
  alumnos,
  matriculaInicial,
}: {
  actividadId: string;
  titulo: string;
  alumnos: { matricula: string; nombre: string }[];
  matriculaInicial?: string;
}) {
  const [matricula, setMatricula] = useState(matriculaInicial ?? "");
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [estado, setEstado] = useState<"editando" | "enviando" | "enviado" | "error">("editando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => () => paginas.forEach((p) => URL.revokeObjectURL(p.url)), [paginas]);

  function agregar(files: FileList | null) {
    if (!files) return;
    const nuevas = Array.from(files).map((archivo) => ({ id: crypto.randomUUID(), archivo, url: URL.createObjectURL(archivo) }));
    setPaginas((ps) => [...ps, ...nuevas]);
  }

  function mover(i: number, d: -1 | 1) {
    setPaginas((ps) => {
      const n = [...ps];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  }

  async function enviar() {
    setEstado("enviando");
    const datos = new FormData();
    datos.append("matricula", matricula);
    paginas.forEach((p) => datos.append("fotos", p.archivo));
    try {
      const r = await fetch(`/api/entregas/${actividadId}`, { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al enviar");
      setMensaje(`Listo, ${j.alumno}. Se recibieron ${j.paginas} página${j.paginas > 1 ? "s" : ""}.`);
      setEstado("enviado");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo enviar");
      setEstado("error");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-4xl text-acierto">✓</p>
        <h2 className="mt-2 text-lg font-semibold">Entrega recibida</h2>
        <p className="mt-1 text-sm text-slate-600">{mensaje}</p>
        <p className="mt-3 text-sm text-slate-500">Tu profesor revisará tu actividad y recibirás tu retroalimentación.</p>
        <Boton
          variante="secundario"
          className="mt-4"
          onClick={() => {
            setPaginas([]);
            setMatricula("");
            setEstado("editando");
          }}
        >
          Entregar otra hoja
        </Boton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          1. ¿Quién eres?
          <select
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
          >
            <option value="">Elige tu nombre</option>
            {alumnos.map((a) => (
              <option key={a.matricula} value={a.matricula}>
                {a.nombre} ({a.matricula})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">2. Toma una foto de cada hoja de “{titulo}”</p>
        <p className="mt-1 text-xs text-slate-500">
          Pon la hoja sobre una mesa, con buena luz, que se vean las 4 esquinas negras y sin sombras.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center rounded-lg bg-tinta-600 px-3 py-3 text-sm font-medium text-white">
            Tomar foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-300">
            Elegir de galería
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {paginas.length > 0 && (
          <ol className="mt-4 space-y-2">
            {paginas.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Página ${i + 1}`} className="h-20 w-16 rounded object-cover ring-1 ring-slate-300" />
                <span className="flex-1 text-sm font-medium">Página {i + 1}</span>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-lg disabled:opacity-30" aria-label="Subir página">↑</button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === paginas.length - 1} className="rounded px-2 py-1 text-lg disabled:opacity-30" aria-label="Bajar página">↓</button>
                <button type="button" onClick={() => setPaginas((ps) => ps.filter((x) => x.id !== p.id))} className="rounded px-2 py-1 text-sm text-error" aria-label="Quitar página">Quitar</button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton className="w-full py-3 text-base" onClick={enviar} disabled={!matricula || paginas.length === 0 || estado === "enviando"}>
        {estado === "enviando" ? "Enviando…" : `3. Enviar ${paginas.length || ""} página${paginas.length === 1 ? "" : "s"}`}
      </Boton>
    </div>
  );
}
