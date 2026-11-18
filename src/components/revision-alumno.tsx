"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { guardarRevision } from "@/app/acciones";
import type { Actividad, Alumno, Entrega, ResultadoReactivo } from "@/lib/tipos";
import { calificacionCalculada, escalaDe, formatoCal, puntosTotales } from "@/lib/estadisticas";
import { archivarFotosDesde } from "@/lib/retencion";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { Boton, Insignia, colorCalificacion } from "./ui";
import { sinLatex } from "./texto-mat";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

const tonoConfianza = { alta: "verde", media: "gris", baja: "ambar" } as const;

/**
 * Revisión del profesor: hoja anotada a la izquierda y la evaluación editable a la
 * derecha. Los cambios se reflejan al instante en la hoja. La entrega se libera al alumno
 * en cuanto la IA la evalúa; al guardar, el reporte del alumno se actualiza.
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
  const { t, locale } = useTextos();
  const tr = t.profesor.revision;
  const [resultados, setResultados] = useState<ResultadoReactivo[]>(entregaInicial.resultados);
  const [positivos, setPositivos] = useState(entregaInicial.positivos.join("\n"));
  const [mejoras, setMejoras] = useState(entregaInicial.mejoras.join("\n"));
  const [aprobada, setAprobada] = useState(entregaInicial.estado === "aprobada");
  const [pagina, setPagina] = useState(1);
  const [guardando, iniciar] = useTransition();
  const [aviso, setAviso] = useState("");
  // Lo último que se guardó, para saber si hay cambios pendientes.
  const [guardado, setGuardado] = useState(() => JSON.stringify([entregaInicial.resultados, entregaInicial.positivos, entregaInicial.mejoras]));
  const conFotos = Boolean(entregaInicial.imagenes?.length || entregaInicial.pdf);
  const archivarDesde = archivarFotosDesde(actividad, entregaInicial);

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

  const sinGuardar = JSON.stringify([resultados, entrega.positivos, entrega.mejoras]) !== guardado;

  function actualizar(numero: number, cambio: Partial<ResultadoReactivo>) {
    setAviso("");
    setResultados((rs) => rs.map((r) => (r.numero === numero ? { ...r, ...cambio } : r)));
  }

  /** Cambia un paso del desarrollo (completo → parcial → incorrecto) y recalcula los puntos del reactivo. */
  function cambiarPaso(numero: number, indice: number) {
    const r = actividad.reactivos.find((x) => x.numero === numero);
    const res = resultados.find((x) => x.numero === numero);
    if (!r?.pasos || !res?.pasos) return;
    const actual = res.pasos[indice] ?? 0;
    const siguiente = actual === 1 ? 0.5 : actual === 0.5 ? 0 : 1;
    const pasos = r.pasos.map((_, i) => (i === indice ? siguiente : (res.pasos![i] ?? 0)));
    const fraccion = r.pasos.reduce((s, p, i) => s + p.peso * pasos[i], 0);
    actualizar(numero, { pasos, puntosObtenidos: Math.round(fraccion * r.puntos * 4) / 4 });
  }

  function guardar(aprobar: boolean) {
    iniciar(async () => {
      try {
        await guardarRevision(actividad.id, alumno.matricula, { resultados, positivos: entrega.positivos, mejoras: entrega.mejoras }, aprobar);
        if (aprobar) setAprobada(true);
        setGuardado(JSON.stringify([resultados, entrega.positivos, entrega.mejoras]));
        setAviso(aprobar ? "" : aprobada ? tr.guardadosLiberada : tr.guardados);
      } catch {
        setAviso(tr.noSeGuardo);
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
              {formato(tr.pagina, { n: i + 1 })}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">{tr.vistaPrevia}</span>
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
              <p className="text-sm text-slate-500">{tr.sugerida}</p>
              <p className={`text-4xl font-semibold ${colorCalificacion(cal, escalaDe(actividad))}`}>
                {formatoCal(cal, escalaDe(actividad))}
                <span className="text-base font-normal text-slate-400"> / {escalaDe(actividad)}</span>
              </p>
              {entregaInicial.calificacionManual !== undefined && (
                <p className="mt-1 text-xs font-medium text-aviso">
                  {formato(tr.enCuaderno, { c: formatoCal(entregaInicial.calificacionManual, escalaDe(actividad)) })}
                </p>
              )}
              <p className="text-xs text-slate-500">
                {formato(tr.dePuntos, { n: resultados.reduce((s, r) => s + r.puntosObtenidos, 0), total: puntosTotales(actividad) })}
                {cambiados > 0 && formato(cambiados > 1 ? tr.ajustadoN : tr.ajustado1, { n: cambiados })}
              </p>
            </div>
            {aprobada ? <Insignia tono="verde">{tr.liberada}</Insignia> : <Insignia tono="azul">{tr.sugeridaIA}</Insignia>}
          </div>
          {aviso && <p className="mt-2 text-sm text-slate-600" role="status">{aviso}</p>}
          {entregaInicial.archivadaEn ? (
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              {tr.archivadas}
            </p>
          ) : (
            Boolean(entregaInicial.imagenes?.length) &&
            archivarDesde && (
              <p className="mt-2 text-xs text-slate-500">
                {formato(tr.fotosHasta, { f: archivarDesde.toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "America/Mexico_City" }) })}
              </p>
            )
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {aprobada ? (
              <>
                <p className="w-full text-sm text-acierto" role="status">
                  {tr.liberadaTexto}
                </p>
                <Boton onClick={() => guardar(false)} disabled={guardando || !sinGuardar}>
                  {guardando ? tr.guardando : tr.guardarCambios}
                </Boton>
              </>
            ) : (
              // Una entrega que aún no se libera (evaluada antes de la liberación automática) se libera al guardar.
              <Boton onClick={() => guardar(true)} disabled={guardando}>
                {guardando ? tr.guardando : tr.guardarLiberar}
              </Boton>
            )}
            {conFotos && (
              <a
                href={`/api/pdf/${actividad.id}/${alumno.matricula}`}
                target="_blank"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
              >
                {tr.pdfCorregido}
              </a>
            )}
            <Link
              href={`/profesor/actividades/${actividad.id}/revision/${encodeURIComponent(alumno.matricula)}/retroalimentacion`}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50"
            >
              {tr.formato}
            </Link>
            {siguienteHref && (
              <Link href={siguienteHref} className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-tinta-700 hover:bg-tinta-50">
                {tr.siguiente}
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">{tr.reactivos}</h2>
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
                    <Insignia tono={tonoConfianza[res.confianza]}>{tr.confianza[res.confianza]}</Insignia>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <label className="sr-only" htmlFor={`pts-${r.numero}`}>
                      {formato(tr.puntosDe, { n: r.numero })}
                    </label>
                    <input
                      id={`pts-${r.numero}`}
                      type="number"
                      min={0}
                      max={r.puntos}
                      step={0.5}
                      value={res.puntosObtenidos}
                     
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
                        {tr.leido} <span className="font-mono">{res.respuestaLeida}</span> · {tr.clave}{" "}
                        <span className="font-mono">{r.respuesta}</span>
                      </span>
                    )}
                  </div>
                  {r.pasos && res.pasos && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {r.pasos.map((p, i) => {
                          const v = res.pasos![i] ?? 0;
                          return (
                            <button
                              key={p.nombre}
                              type="button"
                              onClick={() => cambiarPaso(r.numero, i)}
                              title={formato(tr.pasoEstado, { paso: p.nombre, estado: v === 1 ? tr.completo : v === 0 ? tr.incorrecto : tr.parcial })}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition hover:ring-2 ${
                                v === 1
                                  ? "bg-acierto-suave text-acierto ring-acierto/30"
                                  : v === 0
                                    ? "bg-error-suave text-error ring-error/30"
                                    : "bg-aviso-suave text-aviso ring-aviso/30"
                              }`}
                            >
                              <span aria-hidden>{v === 1 ? "✓" : v === 0 ? "✗" : "½"}</span>
                              {p.nombre}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{tr.pasosAyuda}</p>
                    </div>
                  )}
                  <label className="sr-only" htmlFor={`com-${r.numero}`}>
                    {formato(tr.comentarioDe, { n: r.numero })}
                  </label>
                  <textarea
                    id={`com-${r.numero}`}
                    value={res.comentario}
                   
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
            {tr.positivos}
          </label>
          <textarea id="positivos" rows={3} value={positivos} onChange={(e) => setPositivos(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm" />
          <label className="mt-3 block text-sm font-semibold text-error" htmlFor="mejoras">
            {tr.mejoras}
          </label>
          <textarea id="mejoras" rows={4} value={mejoras} onChange={(e) => setMejoras(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm" />
          <p className="mt-1 text-xs text-slate-500">{tr.unoPorLinea}</p>
        </div>
      </aside>
    </div>
  );
}
