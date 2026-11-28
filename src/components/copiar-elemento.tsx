"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { copiarActividades } from "@/app/acciones-copiar";
import type { CursoDirectorio } from "@/lib/copiar";
import { formato } from "@/lib/i18n/idiomas";
import { IconoCopiar } from "./iconos";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

const botonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50";

/** Ventana encima de la página que se cierra con Escape o tocando el fondo. */
function Ventana({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  const tc = useTextos().t.copiar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col rounded-2xl bg-white text-left shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="text-tinta-600">
              <IconoCopiar />
            </span>
            {titulo}
          </h2>
          <button type="button" onClick={onCerrar} className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100" aria-label={tc.cerrar}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * "Copiar elemento" en el resumen de una actividad: duplicarla en el mismo curso o mandar una copia
 * a otro curso del profesor.
 */
export function CopiarActividad({
  actividadId,
  grupoId,
  cursoActual,
  tituloCopia,
  cursos,
}: {
  actividadId: string;
  grupoId: string;
  /** Nombre del curso de la actividad (para el aviso de copia creada). */
  cursoActual: string;
  /** Cómo se llamará la copia si se duplica en el mismo curso. */
  tituloCopia: string;
  /** Otros cursos activos del profesor. */
  cursos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const tc = useTextos().t.copiar;
  const ta = tc.actividad;
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState<"mismo" | "otro">("mismo");
  const [curso, setCurso] = useState(cursos[0]?.id ?? "");
  const [error, setError] = useState("");
  const [hecha, setHecha] = useState<{ id: string; curso: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  function abrir() {
    setError("");
    setHecha(null);
    setAbierto(true);
  }

  function copiar() {
    const grupo = destino === "mismo" ? grupoId : curso;
    if (!grupo) return;
    setError("");
    iniciar(async () => {
      const r = await copiarActividades([actividadId], grupo);
      if ("error" in r) setError(r.error);
      else {
        setHecha({ id: r.ids[0], curso: destino === "mismo" ? cursoActual : (cursos.find((c) => c.id === curso)?.nombre ?? "") });
        router.refresh();
      }
    });
  }

  const opcion = "flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-tinta-50 has-[:checked]:ring-tinta-300";
  return (
    <>
      <button type="button" onClick={abrir} className={botonSecundario} title={ta.titulo}>
        <IconoCopiar /> {tc.boton}
      </button>
      {abierto && (
        <Ventana titulo={ta.titulo} onCerrar={() => setAbierto(false)}>
          <div className="space-y-3 overflow-y-auto px-5 py-4 text-sm">
            <p className="text-slate-600">{ta.texto}</p>
            {hecha ? (
              <div className="rounded-xl bg-acierto-suave/60 p-4">
                <p className="font-medium text-acierto">✓ {formato(ta.lista, { curso: hecha.curso })}</p>
                <Link href={`/profesor/actividades/${hecha.id}`} className="mt-2 inline-block font-medium text-tinta-700 hover:underline" onClick={() => setAbierto(false)}>
                  {ta.abrir} →
                </Link>
              </div>
            ) : (
              <>
                <label className={opcion}>
                  <input type="radio" name="destino" checked={destino === "mismo"} onChange={() => setDestino("mismo")} className="mt-1 accent-tinta-600" />
                  <span>
                    <span className="block font-medium text-slate-900">{ta.mismo}</span>
                    <span className="block text-xs text-slate-500">{formato(ta.mismoNota, { titulo: tituloCopia })}</span>
                  </span>
                </label>
                <label className={`${opcion} ${cursos.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input
                    type="radio"
                    name="destino"
                    checked={destino === "otro"}
                    disabled={cursos.length === 0}
                    onChange={() => setDestino("otro")}
                    className="mt-1 accent-tinta-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{ta.otro}</span>
                    {cursos.length === 0 ? (
                      <span className="block text-xs text-slate-500">{ta.sinOtros}</span>
                    ) : (
                      <select
                        aria-label={ta.elegirCurso}
                        value={curso}
                        onChange={(e) => {
                          setCurso(e.target.value);
                          setDestino("otro");
                        }}
                        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
                      >
                        {cursos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                </label>
              </>
            )}
            {error && <p className="text-error">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
              {hecha ? tc.cerrar : tc.cancelar}
            </Boton>
            {!hecha && (
              <Boton type="button" onClick={copiar} disabled={pendiente}>
                <IconoCopiar /> {pendiente ? ta.copiando : ta.copiar}
              </Boton>
            )}
          </div>
        </Ventana>
      )}
    </>
  );
}

/**
 * "Copiar elemento" en la vista del curso: directorio de las actividades de todos los cursos del
 * profesor, por curso, para agregar copias a la lista de este curso.
 */
export function DirectorioActividades({ grupoId, cursos }: { grupoId: string; cursos: CursoDirectorio[] }) {
  const router = useRouter();
  const tc = useTextos().t.copiar;
  const td = tc.directorio;
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  // Primero los otros cursos activos, luego este y al final los archivados.
  const lista = useMemo(() => {
    const q = busqueda
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
    const coincide = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q);
    const orden = (c: CursoDirectorio) => (c.archivado ? 2 : c.id === grupoId ? 1 : 0);
    return [...cursos]
      .sort((a, b) => orden(a) - orden(b))
      .map((c) => ({ ...c, actividades: q ? c.actividades.filter((a) => coincide(a.titulo) || coincide(a.etiqueta ?? "")) : c.actividades }))
      .filter((c) => !q || c.actividades.length > 0);
  }, [cursos, busqueda, grupoId]);

  function alternar(id: string) {
    setElegidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function agregar() {
    setError("");
    iniciar(async () => {
      const r = await copiarActividades([...elegidas], grupoId);
      if ("error" in r) setError(r.error);
      else {
        setElegidas(new Set());
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={`${botonSecundario} justify-start`} title={td.titulo}>
        <IconoCopiar /> {tc.boton}
      </button>
      {abierto && (
        <Ventana titulo={td.titulo} onCerrar={() => setAbierto(false)}>
          <div className="space-y-3 border-b border-slate-100 px-5 py-3 text-sm">
            <p className="text-slate-600">{td.texto}</p>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={td.buscar}
              aria-label={td.buscar}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
            />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-3">
            {lista.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{td.ninguna}</p>}
            {lista.map((c, i) => (
              <details key={c.id} open={Boolean(busqueda) || i === 0} className="group rounded-xl ring-1 ring-slate-200">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-90">
                    ▸
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {c.materia} · {c.nombre}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {c.ciclo}
                      {c.id === grupoId && ` · ${td.esteCurso}`}
                    </span>
                  </span>
                  {c.archivado && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">🗄️ {td.archivado}</span>}
                  <span className="rounded-full bg-tinta-50 px-2 py-0.5 text-xs font-medium text-tinta-700">{c.actividades.length}</span>
                </summary>
                {c.actividades.length === 0 ? (
                  <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{td.sinActividades}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {c.actividades.map((a) => (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 has-[:checked]:bg-tinta-50">
                          <input type="checkbox" checked={elegidas.has(a.id)} onChange={() => alternar(a.id)} className="h-4 w-4 accent-tinta-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-900">{a.titulo}</span>
                            <span className="block text-xs text-slate-500">
                              {[a.etiqueta, a.fecha, formato(a.reactivos === 1 ? td.reactivos1 : td.reactivosN, { n: a.reactivos })].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
            <span className="text-sm text-slate-600">
              {elegidas.size > 0 && (elegidas.size === 1 ? td.seleccionadas1 : formato(td.seleccionadasN, { n: elegidas.size }))}
              {error && <span className="block text-error">{error}</span>}
            </span>
            <div className="flex gap-2">
              <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
                {tc.cancelar}
              </Boton>
              <Boton type="button" onClick={agregar} disabled={pendiente || elegidas.size === 0}>
                {pendiente ? td.agregando : td.agregar}
              </Boton>
            </div>
          </div>
        </Ventana>
      )}
    </>
  );
}
