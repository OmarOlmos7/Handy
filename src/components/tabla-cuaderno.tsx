"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cambiarCalificacion } from "@/app/acciones";
import { ORDENES, ordenarFilas, type Celda, type Columna, type Cuaderno, type Orden } from "@/lib/cuaderno";
import { formatoCal, nivelDe, type Nivel } from "@/lib/estadisticas";
import type { Escala } from "@/lib/tipos";

const SEMAFORO: Record<Nivel, string> = {
  alto: "bg-acierto-suave text-acierto",
  medio: "bg-aviso-suave text-aviso",
  bajo: "bg-error-suave text-error",
};

const texto = (v: number, escala: Escala) => formatoCal(v, escala);

/** Valor del promedio con su color de semáforo (texto sobre fondo suave). */
function Promedio({ valor, escala, fuerte }: { valor: number | null; escala: Escala; fuerte?: boolean }) {
  if (valor === null) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-block min-w-12 rounded-md px-2 py-1 tabular-nums ${SEMAFORO[nivelDe(valor, escala)]} ${fuerte ? "font-semibold" : "font-medium"}`}>
      {texto(valor, escala)}
    </span>
  );
}

function CeldaEditable({ celda, columna, matricula, nombre }: { celda: Celda; columna: Columna; matricula: string; nombre: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(nuevo: number | null) {
    setError("");
    iniciar(async () => {
      try {
        await cambiarCalificacion(columna.id, matricula, nuevo);
        setEditando(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function confirmar() {
    const t = valor.trim().replace(",", ".");
    if (t === "") return setEditando(false);
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > columna.escala) return setError(`De 0 a ${columna.escala}`);
    if (celda.valor !== null && n === celda.valor) return setEditando(false);
    guardar(n);
  }

  if (editando) {
    return (
      <div className="flex flex-col items-center gap-1">
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step={columna.escala === 100 ? 1 : 0.1}
          min={0}
          max={columna.escala}
          value={valor}
          disabled={pendiente}
          aria-label={`Calificación de ${nombre} en ${columna.titulo}`}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") setEditando(false);
          }}
          onBlur={() => !pendiente && confirmar()}
          className="w-16 rounded-md border border-tinta-500 px-1.5 py-1 text-center text-sm tabular-nums focus:outline-none"
        />
        {celda.manual && (
          <button
            type="button"
            disabled={pendiente}
            // Evita que el cuadro pierda el foco (y guarde) antes del clic.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => guardar(null)}
            className="whitespace-nowrap text-[11px] font-medium text-tinta-700 hover:underline"
          >
            Usar la de la rúbrica
          </button>
        )}
        {error && <span className="text-[11px] text-error">{error}</span>}
      </div>
    );
  }

  const titulo =
    celda.estado === "no_entregada"
      ? "No entregó: cuenta como 0. Clic para calificar."
      : celda.estado === "pendiente"
        ? "Entregada, por evaluar. Clic para calificar a mano."
        : celda.estado === "sin_resultados"
          ? "La actividad aún no tiene calificaciones. Clic para calificar a mano."
          : celda.manual
            ? `Cambiada a mano${celda.calculada !== undefined ? ` (con la rúbrica: ${texto(celda.calculada, columna.escala)})` : ""}. Clic para cambiar.`
            : "Clic para corregir la calificación.";

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        title={titulo}
        disabled={pendiente}
        onClick={() => {
          setValor(celda.valor !== null && celda.estado === "calificada" ? String(celda.valor) : "");
          setError("");
          setEditando(true);
        }}
        className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-md px-2 py-1 tabular-nums transition hover:ring-2 hover:ring-tinta-200 disabled:opacity-50 ${
          celda.estado === "calificada" || celda.estado === "no_entregada"
            ? SEMAFORO[nivelDe(celda.valor ?? 0, columna.escala)]
            : "text-slate-400"
        }`}
      >
        {celda.estado === "calificada" && texto(celda.valor!, columna.escala)}
        {celda.estado === "no_entregada" && (
          <>
            0 <span className="text-[10px] font-semibold">NE</span>
          </>
        )}
        {celda.estado === "pendiente" && "Por evaluar"}
        {celda.estado === "sin_resultados" && "—"}
        {celda.manual && <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" aria-label="cambiada a mano" />}
      </button>
    </div>
  );
}

export function TablaCuaderno({ cuaderno }: { cuaderno: Cuaderno }) {
  const [orden, setOrden] = useState<Orden>("apellido");
  const filas = ordenarFilas(cuaderno.filas, orden);
  const columnas = cuaderno.grupos.flatMap((g) => g.columnas);
  const borde = new Set(cuaderno.grupos.map((g) => g.columnas[0]?.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-acierto-suave ring-1 ring-acierto/40" /> Alto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-aviso-suave ring-1 ring-aviso/40" /> Medio
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-error-suave ring-1 ring-error/40" /> Bajo
          </span>
          <span>
            <strong className="font-semibold">NE</strong> no entregó (cuenta 0)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" /> cambiada a mano
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Ordenar por
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-tinta-500 focus:outline-none"
          >
            {ORDENES.map((o) => (
              <option key={o.clave} value={o.clave}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th rowSpan={2} className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-2 text-left">
                Alumno
              </th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left">
                Matrícula
              </th>
              {cuaderno.grupos.map((g) => (
                <th
                  key={g.etiqueta}
                  colSpan={g.columnas.length}
                  className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-center text-slate-700"
                >
                  {g.etiqueta}
                </th>
              ))}
              <th rowSpan={2} className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-center text-slate-700">
                Promedio
                <span className="block text-[10px] font-normal normal-case">sobre {cuaderno.escala}</span>
              </th>
            </tr>
            <tr>
              {columnas.map((c) => (
                <th
                  key={c.id}
                  className={`max-w-36 border-b border-slate-200 bg-slate-50 px-2 py-2 text-center align-bottom text-xs font-medium text-slate-700 ${borde.has(c.id) ? "border-l" : ""}`}
                >
                  <Link href={`/profesor/actividades/${c.id}`} className="line-clamp-2 hover:text-tinta-700" title={c.titulo}>
                    {c.titulo}
                  </Link>
                  <span className="block text-[10px] font-normal text-slate-500">/ {c.escala}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.matricula} className="hover:bg-slate-50/70">
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 bg-white px-4 py-1.5 font-medium text-slate-800">
                  {f.nombre}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">{f.matricula}</td>
                {columnas.map((c) => (
                  <td key={c.id} className={`border-b border-slate-100 px-2 py-1.5 text-center ${borde.has(c.id) ? "border-l border-l-slate-200" : ""}`}>
                    <CeldaEditable celda={f.celdas[c.id]} columna={c} matricula={f.matricula} nombre={f.nombre} />
                  </td>
                ))}
                <td className="border-b border-l border-slate-100 border-l-slate-200 px-3 py-1.5 text-center">
                  <Promedio valor={f.promedio} escala={cuaderno.escala} fuerte />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={2}>
                Promedio de la actividad
              </td>
              {columnas.map((c) => (
                <td key={c.id} className={`px-2 py-2.5 text-center ${borde.has(c.id) ? "border-l border-slate-200" : ""}`}>
                  <Promedio valor={c.promedio} escala={c.escala} fuerte />
                </td>
              ))}
              <td className="border-l border-slate-200 px-3 py-2.5 text-center">
                <Promedio valor={cuaderno.promedioGrupo} escala={cuaderno.escala} fuerte />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Toca una calificación para corregirla; se guarda al presionar Enter o al salir del cuadro. El cambio se refleja en los
        reportes y las analíticas. En una calificación cambiada a mano aparece la opción para volver a la de la rúbrica.
      </p>
    </div>
  );
}
