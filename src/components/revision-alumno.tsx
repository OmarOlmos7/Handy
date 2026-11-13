"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { guardarRevision } from "@/app/acciones";
import type { Actividad, Alumno, Entrega, ResultadoReactivo } from "@/lib/tipos";
import { calificacionCalculada, escalaDe, formatoCal, puntosTotales } from "@/lib/estadisticas";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { Boton, Insignia, colorCalificacion } from "./ui";
import { sinLatex } from "./texto-mat";

const tonoConfianza = { alta: "verde", media: "gris", baja: "ambar" } as const;

/**
 * Revisión del profesor: hoja anotada a la izquierda y la evaluación editable a la
 * derecha. Los cambios se reflejan al instante en la hoja. En esta iteración no se
 * guardan (falta la API).
 */
export function RevisionAlumno({
  actividad,
  alumno,
  entregaInicial,
  grupoTexto,
  siguienteHref,
}: {
  actividad: Actividad;
  alumno: Alumno;
  entregaInicial: Entrega;
  grupoTexto: string;
  siguienteHref?: string;
}) {
  const [resultados, setResultados] = useState<ResultadoReactivo[]>(entregaInicial.resultados);
  const [positivos, setPositivos] = useState(entregaInicial.positivos.join("\n"));
  const [mejoras, setMejoras] = useState(entregaInicial.mejoras.join("\n"));
  const [aprobada, setAprobada] = useState(entregaInicial.estado === "aprobada");
  const [pagina, setPagina] = useState(1);
  const [guardando, iniciar] = useTransition();
  const [aviso, setAviso] = useState("");
  const conFotos = Boolean(entregaInicial.imagenes?.length);

  const entrega: Entrega = useMemo(
    () => ({
      ...entregaInicial,
      resultados,
      positivos: positivos.split("\n").filter(Boolean),
      mejoras: mejoras.split("\n").filter(Boolean),
    }),
    [entregaInicial, resultados, positivos, mejoras],
  );
  // La sugerida sale de los puntos; un ajuste del cuaderno se muestra aparte.
  const cal = calificacionCalculada(actividad, entrega);
  const cambiados = resultados.filter((r, i) => r.puntosObtenidos !== entregaInicial.resultados[i].puntosObtenidos || r.comentario !== entregaInicial.resultados[i].comentario).length;

  function actualizar(numero: number, cambio: Partial<ResultadoReactivo>) {
    setAviso("");
    setResultados((rs) => rs.map((r) => (r.numero === numero ? { ...r, ...cambio } : r)));
  }

  function guardar(aprobar: boolean) {
    iniciar(async () => {
      try {
        await guardarRevision(actividad.id, alumno.matricula, { resultados, positivos: entrega.positivos, mejoras: entrega.mejoras }, aprobar);
        if (aprobar) setAprobada(true);
        setAviso(aprobar ? "" : "Cambios guardados.");
      } catch {
        setAviso("No se pudo guardar. Intenta de nuevo.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-3 flex items-center gap-2">
          {Array.from({ length: paginasDe(actividad, entregaInicial) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPagina(i + 1)}
              className={`rounded-lg px-3 py-1 text-sm ${pagina === i + 1 ? "bg-tinta-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"}`}
            >
              Página {i + 1}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">Vista previa del PDF corregido</span>
        </div>
        <HojaEntrega
          actividad={actividad}
          pagina={pagina}
          alumno={alumno}
          entrega={entrega}
          grupoTexto={grupoTexto}
          modoProfesor
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Calificación sugerida</p>
              <p className={`text-4xl font-semibold ${colorCalificacion(cal, escalaDe(actividad))}`}>
                {formatoCal(cal, escalaDe(actividad))}
                <span className="text-base font-normal text-slate-400"> / {escalaDe(actividad)}</span>
              </p>
              {entregaInicial.calificacionManual !== undefined && (
                <p className="mt-1 text-xs font-medium text-aviso">
                  En el cuaderno quedó {formatoCal(entregaInicial.calificacionManual, escalaDe(actividad))}. Si cambias puntos y guardas, se usa la sugerida.
                </p>
              )}
              <p className="text-xs text-slate-500">
                {resultados.reduce((s, r) => s + r.puntosObtenidos, 0)} de {puntosTotales(actividad)} puntos
                {cambiados > 0 && ` · ${cambiados} reactivo${cambiados > 1 ? "s" : ""} ajustado${cambiados > 1 ? "s" : ""} por ti`}
              </p>
            </div>
            {aprobada ? <Insignia tono="verde">Aprobada</Insignia> : <Insignia tono="azul">Sugerida por IA</Insignia>}
          </div>
          {aviso && <p className="mt-2 text-sm text-slate-600" role="status">{aviso}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {aprobada ? (
              <p className="text-sm text-acierto" role="status">
                Aprobada. El alumno ya puede ver su reporte.
              </p>
            ) : (
              <>
                <Boton onClick={() => guardar(true)} disabled={guardando}>
                  {guardando ? "Guardando…" : "Aprobar"}
                </Boton>
                <Boton variante="secundario" onClick={() => guardar(false)} disabled={guardando}>
                  Guardar cambios
                </Boton>
              </>
            )}
            {conFotos && (
              <a
                href={`/api/pdf/${actividad.id}/${alumno.matricula}`}
                target="_blank"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
              >
                PDF corregido
              </a>
            )}
            {siguienteHref && (
              <Link href={siguienteHref} className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50">
                Siguiente alumno →
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">Reactivos</h2>
          <ul className="divide-y divide-slate-100">
            {actividad.reactivos.map((r) => {
              const res = resultados.find((x) => x.numero === r.numero)!;
              return (
                <li key={r.numero} className={`px-5 py-3 ${res.confianza === "baja" ? "bg-aviso-suave/40" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.numero}.</span>
                    <span className="flex-1 truncate text-sm text-slate-600" title={sinLatex(r.enunciado)}>
                      {r.tema}
                    </span>
                    <Insignia tono={tonoConfianza[res.confianza]}>confianza {res.confianza}</Insignia>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <label className="sr-only" htmlFor={`pts-${r.numero}`}>
                      Puntos del reactivo {r.numero}
                    </label>
                    <input
                      id={`pts-${r.numero}`}
                      type="number"
                      min={0}
                      max={r.puntos}
                      step={0.5}
                      value={res.puntosObtenidos}
                      disabled={aprobada}
                      onChange={(e) =>
                        actualizar(r.numero, {
                          puntosObtenidos: Math.min(r.puntos, Math.max(0, Number(e.target.value))),
                        })
                      }
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right"
                    />
                    <span className="text-slate-500">/ {r.puntos}</span>
                    {r.tipo !== "desarrollo" && r.tipo !== "abierto" && (
                      <span className="ml-auto text-xs text-slate-500">
                        Leído: <span className="font-mono">{res.respuestaLeida}</span> · Clave:{" "}
                        <span className="font-mono">{r.respuesta}</span>
                      </span>
                    )}
                  </div>
                  {r.pasos && res.pasos && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.pasos.map((p, i) => (
                        <Insignia key={p.nombre} tono={res.pasos![i] === 1 ? "verde" : res.pasos![i] === 0 ? "rojo" : "ambar"}>
                          {p.nombre}
                        </Insignia>
                      ))}
                    </div>
                  )}
                  <label className="sr-only" htmlFor={`com-${r.numero}`}>
                    Comentario del reactivo {r.numero}
                  </label>
                  <textarea
                    id={`com-${r.numero}`}
                    value={res.comentario}
                    disabled={aprobada}
                    onChange={(e) => actualizar(r.numero, { comentario: e.target.value })}
                    rows={2}
                    className="mt-2 w-full resize-y rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="block text-sm font-semibold text-acierto" htmlFor="positivos">
            Puntos positivos
          </label>
          <textarea id="positivos" rows={3} value={positivos} disabled={aprobada} onChange={(e) => setPositivos(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm" />
          <label className="mt-3 block text-sm font-semibold text-error" htmlFor="mejoras">
            Puntos de mejora
          </label>
          <textarea id="mejoras" rows={4} value={mejoras} disabled={aprobada} onChange={(e) => setMejoras(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm" />
          <p className="mt-1 text-xs text-slate-500">Un punto por línea.</p>
        </div>
      </aside>
    </div>
  );
}
