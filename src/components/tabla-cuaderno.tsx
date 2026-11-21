"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cambiarCalificacion } from "@/app/acciones";
import { cambiarPesoAutoestudio } from "@/app/acciones-autoestudio";
import { ORDENES, ordenarFilas, type Celda, type Columna, type Cuaderno, type Orden } from "@/lib/cuaderno";
import { formatoCal, nivelDe, type Nivel } from "@/lib/estadisticas";
import type { InfoCuaderno } from "@/lib/exportar-cuaderno";
import type { Escala, PlanEvaluacion } from "@/lib/tipos";
import { pesoDe } from "@/lib/plan-evaluacion";
import { DescargarCuaderno } from "./descargar-cuaderno";
import { tonoTipo } from "./tonos-tipo";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

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
  const tq = useTextos().t.profesor.cuaderno;
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
        setError(e instanceof Error ? e.message : tq.noSeGuardo);
      }
    });
  }

  function confirmar() {
    const t = valor.trim().replace(",", ".");
    if (t === "") return setEditando(false);
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > columna.escala) return setError(formato(tq.rango, { n: columna.escala }));
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
          aria-label={formato(tq.aria, { nombre, actividad: columna.titulo })}
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
            {tq.usarRubrica}
          </button>
        )}
        {error && <span className="text-[11px] text-error">{error}</span>}
      </div>
    );
  }

  const titulo =
    celda.estado === "no_entregada"
      ? tq.noEntrego
      : celda.estado === "pendiente"
        ? tq.pendiente
        : celda.estado === "sin_resultados"
          ? tq.sinResultados
          : celda.manual
            ? formato(tq.manual, { r: celda.calculada !== undefined ? formato(tq.conRubrica, { c: texto(celda.calculada, columna.escala) }) : "" })
            : tq.corregir;

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
            0 <span className="text-[10px] font-semibold">{tq.ne}</span>
          </>
        )}
        {celda.estado === "pendiente" && tq.porEvaluar}
        {celda.estado === "sin_resultados" && "—"}
        {celda.manual && <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" aria-label={tq.cambiadaMano} />}
      </button>
    </div>
  );
}

/** Peso del autoestudio en la nota final, editable en el encabezado de su columna (0 % por defecto). */
function PesoAutoestudio({ grupoId, peso }: { grupoId: string; peso: number }) {
  const ta = useTextos().t.autoestudio.profesor;
  const router = useRouter();
  const [valor, setValor] = useState(String(peso));
  const [estado, setEstado] = useState<"" | "guardado" | "error">("");
  const [pendiente, iniciar] = useTransition();
  const guardar = () => {
    const n = Number(valor.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) return setEstado("error");
    if (n === peso) return;
    iniciar(async () => {
      try {
        await cambiarPesoAutoestudio(grupoId, n);
        setEstado("guardado");
        router.refresh();
      } catch {
        setEstado("error");
      }
    });
  };
  return (
    <span className="mt-1 flex items-center justify-center gap-1 normal-case tracking-normal" title={ta.pesoAyuda}>
      <input
        aria-label={ta.porcentaje}
        inputMode="decimal"
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setEstado("");
        }}
        onBlur={guardar}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        disabled={pendiente}
        className={`w-12 rounded-md border bg-white px-1 py-0.5 text-center text-xs font-semibold tabular-nums text-violet-900 outline-none focus:ring-2 focus:ring-violet-200 ${estado === "error" ? "border-error" : "border-violet-300"}`}
      />
      <span className="text-[11px] font-semibold text-violet-800">%</span>
      {estado === "guardado" && <span className="text-[10px] text-acierto">✓</span>}
    </span>
  );
}

/** Promedio del autoestudio por alumno (sobre 100), cuántas hizo y si hay comentarios por revisar. */
export interface AutoestudioTabla {
  grupoId: string;
  peso: number;
  porAlumno: Record<string, { promedio: number | null; total: number; alertas: number }>;
}

/** Nota final calculada en el servidor con el plan de evaluación (por matrícula). */
export interface NotaFinalTabla {
  porAlumno: Record<string, number | null>;
  promedioGrupo: number | null;
}

export function TablaCuaderno({
  cuaderno,
  info,
  plan,
  final,
  autoestudio,
}: {
  cuaderno: Cuaderno;
  info: InfoCuaderno;
  plan?: PlanEvaluacion;
  final?: NotaFinalTabla;
  autoestudio?: AutoestudioTabla;
}) {
  const tq = useTextos().t.profesor.cuaderno;
  const ta = useTextos().t.autoestudio.profesor;
  const aEscala = (v: number | null) => (v === null ? null : Math.round((v / 100) * cuaderno.escala * 10) / 10);
  const autoGrupo = (() => {
    const vs = Object.values(autoestudio?.porAlumno ?? {}).map((x) => x.promedio).filter((v): v is number => v !== null);
    return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
  })();
  const tc = useTextos().t.profesor.comun;
  const [orden, setOrden] = useState<Orden>("apellido");
  const filas = ordenarFilas(cuaderno.filas, orden);
  const grupos = cuaderno.grupos.map((g, i) => ({ ...g, tono: tonoTipo(i) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-acierto-suave ring-1 ring-acierto/40" /> {tq.alto}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-aviso-suave ring-1 ring-aviso/40" /> {tq.medio}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-error-suave ring-1 ring-error/40" /> {tq.bajo}
          </span>
          <span>
            <strong className="font-semibold">{tq.ne}</strong>{tq.noEntregoLeyenda}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-tinta-600" /> {tq.cambiadaMano}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DescargarCuaderno cuaderno={cuaderno} orden={orden} info={info} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            {tq.ordenarPor}
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-tinta-500 focus:outline-none"
            >
              {ORDENES.map((o) => (
                <option key={o.clave} value={o.clave}>
                  {tq.ordenes[o.clave]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th rowSpan={2} className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-2 text-left">
                {tc.alumno}
              </th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left">
                {tc.matricula}
              </th>
              {grupos.map((g) => (
                <th
                  key={g.etiqueta}
                  colSpan={g.columnas.length + 1}
                  className={`border-b border-l border-slate-200 px-3 py-2 text-center text-slate-700 ${g.tono.cabeza}`}
                >
                  {g.etiqueta}
                  {plan && (
                    <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal text-tinta-700">
                      {pesoDe(plan, g.clave) !== undefined ? formato(tq.plan.porcentajeTipo, { n: pesoDe(plan, g.clave)! }) : tq.plan.sinPeso}
                    </span>
                  )}
                </th>
              ))}
              {autoestudio && (
                <th rowSpan={2} className="border-b border-l border-slate-200 bg-violet-50 px-3 py-2 text-center text-violet-900">
                  <Link href={`/profesor/grupos/${autoestudio.grupoId}/autoestudio`} className="hover:underline">
                    ✨ {ta.columna}
                  </Link>
                  <span className="block text-[10px] font-normal normal-case">{ta.porcentaje}</span>
                  <PesoAutoestudio grupoId={autoestudio.grupoId} peso={autoestudio.peso} />
                </th>
              )}
              <th rowSpan={2} className="border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-center text-slate-700">
                {tq.promedio}
                <span className="block text-[10px] font-normal normal-case">{formato(tq.sobre, { n: cuaderno.escala })}</span>
              </th>
              {final && (
                <th rowSpan={2} className="border-b border-l border-slate-200 bg-tinta-50 px-3 py-2 text-center text-tinta-800">
                  {tq.plan.notaFinal}
                  <span className="block text-[10px] font-normal normal-case">{formato(tq.sobre, { n: cuaderno.escala })}</span>
                </th>
              )}
            </tr>
            <tr>
              {grupos.map((g) => [
                ...g.columnas.map((c, i) => (
                  <th
                    key={c.id}
                    className={`max-w-36 border-b border-slate-200 px-2 py-2 text-center align-bottom text-xs font-medium text-slate-700 ${g.tono.cabeza} ${i === 0 ? "border-l" : ""}`}
                  >
                    <Link href={`/profesor/actividades/${c.id}`} className="line-clamp-2 hover:text-tinta-700" title={c.titulo}>
                      {c.titulo}
                    </Link>
                    <span className="block text-[10px] font-normal text-slate-500">/ {c.escala}</span>
                  </th>
                )),
                <th
                  key={`prom-${g.etiqueta}`}
                  className={`border-b border-l border-slate-200 border-l-slate-300/70 px-2 py-2 text-center align-bottom text-xs font-semibold text-slate-800 ${g.tono.promedio}`}
                >
                  {tq.promedio}
                  <span className="block text-[10px] font-normal text-slate-500">{formato(tq.sobre, { n: cuaderno.escala })}</span>
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.matricula} className="hover:bg-slate-50/70">
                <td className="sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 bg-white px-4 py-1.5 font-medium text-slate-800">
                  {f.nombre}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">{f.matricula}</td>
                {grupos.map((g) => [
                  ...g.columnas.map((c, i) => (
                    <td key={c.id} className={`border-b border-slate-100 px-2 py-1.5 text-center ${g.tono.celda} ${i === 0 ? "border-l border-l-slate-200" : ""}`}>
                      <CeldaEditable celda={f.celdas[c.id]} columna={c} matricula={f.matricula} nombre={f.nombre} />
                    </td>
                  )),
                  <td key={`prom-${g.etiqueta}`} className={`border-b border-l border-slate-100 border-l-slate-300/70 px-2 py-1.5 text-center ${g.tono.promedio}`}>
                    <Promedio valor={g.promedios[f.matricula] ?? null} escala={cuaderno.escala} fuerte />
                  </td>,
                ])}
                {autoestudio && (
                  <td className="whitespace-nowrap border-b border-l border-slate-100 border-l-slate-200 bg-violet-50/40 px-3 py-1.5 text-center">
                    <Promedio valor={aEscala(autoestudio.porAlumno[f.matricula]?.promedio ?? null)} escala={cuaderno.escala} />
                    <Link
                      href={`/profesor/grupos/${autoestudio.grupoId}/autoestudio/${encodeURIComponent(f.matricula)}`}
                      className="ml-1.5 text-xs font-medium text-violet-800 hover:underline"
                    >
                      {formato(ta.ver, { n: autoestudio.porAlumno[f.matricula]?.total ?? 0 })}
                    </Link>
                    {(autoestudio.porAlumno[f.matricula]?.alertas ?? 0) > 0 && (
                      <span title={ta.alerta} className="ml-1 text-xs text-error">
                        ⚠
                      </span>
                    )}
                  </td>
                )}
                <td className="border-b border-l border-slate-100 border-l-slate-200 px-3 py-1.5 text-center">
                  <Promedio valor={f.promedio} escala={cuaderno.escala} fuerte />
                </td>
                {final && (
                  <td className="border-b border-l border-slate-100 border-l-slate-200 bg-tinta-50/40 px-3 py-1.5 text-center">
                    <Promedio valor={final.porAlumno[f.matricula] ?? null} escala={cuaderno.escala} fuerte />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600" colSpan={2}>
                {tq.promedioActividad}
              </td>
              {grupos.map((g) => [
                ...g.columnas.map((c, i) => (
                  <td key={c.id} className={`px-2 py-2.5 text-center ${g.tono.celda} ${i === 0 ? "border-l border-slate-200" : ""}`}>
                    <Promedio valor={c.promedio} escala={c.escala} fuerte />
                  </td>
                )),
                <td key={`prom-${g.etiqueta}`} className={`border-l border-slate-300/70 px-2 py-2.5 text-center ${g.tono.promedio}`}>
                  <Promedio valor={g.promedioGrupo} escala={cuaderno.escala} fuerte />
                </td>,
              ])}
              {autoestudio && (
                <td className="border-l border-slate-200 bg-violet-50/60 px-3 py-2.5 text-center">
                  <Promedio valor={aEscala(autoGrupo)} escala={cuaderno.escala} fuerte />
                </td>
              )}
              <td className="border-l border-slate-200 px-3 py-2.5 text-center">
                <Promedio valor={cuaderno.promedioGrupo} escala={cuaderno.escala} fuerte />
              </td>
              {final && (
                <td className="border-l border-slate-200 bg-tinta-50/60 px-3 py-2.5 text-center">
                  <Promedio valor={final.promedioGrupo} escala={cuaderno.escala} fuerte />
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {tq.ayuda}
      </p>
      {autoestudio && <p className="text-xs text-violet-900">✨ {ta.pesoAyuda}</p>}
    </div>
  );
}
