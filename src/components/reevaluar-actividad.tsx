"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { prepararReevaluacion } from "@/app/acciones";
import { CREDITOS_POR_PAGINA } from "@/lib/configuracion";
import { formato } from "@/lib/i18n/idiomas";
import type { EsfuerzoIA, MotorIA } from "@/lib/tipos";
import { DeslizadorPrecision } from "./precision-ia";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

/**
 * Re-evaluación de una actividad ya calificada: el profesor ajusta el nivel de precisión,
 * la rúbrica, las condiciones y las indicaciones para la IA, y vuelve a evaluar las entregas
 * (una por una, con el avance a la vista) para mejorar su retroalimentación.
 */
export function ReevaluarActividad({
  actividadId,
  motor,
  esfuerzos,
  esfuerzoActual,
  instrucciones,
  entregas,
  evaluadas,
  saldo,
}: {
  actividadId: string;
  motor: MotorIA;
  esfuerzos: Record<MotorIA, EsfuerzoIA>;
  /** Esfuerzo guardado en la actividad (para su motor). */
  esfuerzoActual?: EsfuerzoIA;
  instrucciones: string;
  /** Entregas ya evaluadas que conservan sus fotos. */
  entregas: { matricula: string; nombre: string; paginas: number }[];
  /** Entregas ya evaluadas, tengan o no sus fotos (las de ejemplo y las archivadas no las tienen). */
  evaluadas: number;
  saldo: number;
}) {
  const router = useRouter();
  const tr = useTextos().t.profesor.reevaluar;
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState(motor);
  const [hechas, setHechas] = useState(0);
  const [actual, setActual] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [terminado, setTerminado] = useState(false);

  const paginas = entregas.reduce((s, e) => s + e.paginas, 0);
  const costo = paginas * CREDITOS_POR_PAGINA[elegido];
  const alcanza = saldo >= costo;
  const base = `/profesor/actividades/${actividadId}`;

  async function reevaluar(form: FormData) {
    if (!confirm(formato(tr.confirmar, { n: entregas.length, c: costo }))) return;
    setErrores([]);
    setHechas(0);
    setTerminado(false);
    try {
      await prepararReevaluacion(actividadId, String(form.get("motor") ?? ""), String(form.get("indicaciones") ?? ""), String(form.get("esfuerzo") ?? ""));
    } catch {
      setErrores([tr.noSeGuardo]);
      return;
    }
    for (const e of entregas) {
      setActual(e.nombre);
      try {
        const r = await fetch(`/api/evaluar/${actividadId}/${encodeURIComponent(e.matricula)}?reevaluar=1`, { method: "POST" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErrores((x) => [...x, `${e.nombre}: ${j.error ?? "error"}`]);
          if (r.status === 402 || r.status === 409) break;
        }
      } catch {
        setErrores((x) => [...x, `${e.nombre}: ${tr.sinConexion}`]);
      }
      setHechas((n) => n + 1);
      router.refresh();
    }
    setActual(null);
    setTerminado(true);
  }

  if (evaluadas === 0) return null;
  const sinFotos = evaluadas - entregas.length;

  return (
    <section className="mb-6 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-semibold text-slate-900">{tr.titulo}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{tr.subtitulo}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-tinta-700">{abierto ? tr.ocultar : tr.abrir}</span>
      </button>

      {abierto && (
        <form action={reevaluar} className="grid gap-5 border-t border-slate-100 px-5 py-5 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">1. {tr.paso1}</p>
            <DeslizadorPrecision inicial={motor} esfuerzos={esfuerzos} esfuerzoInicial={esfuerzoActual} onCambio={setElegido} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">2. {tr.paso2}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`${base}/rubrica`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
                {tr.ajustarRubrica}
              </Link>
              <Link href={`${base}/editar`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
                {tr.ajustarCondiciones}
              </Link>
            </div>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              {tr.indicaciones}
              <textarea
                name="indicaciones"
                rows={4}
                maxLength={2000}
                defaultValue={instrucciones}
                placeholder={tr.indicacionesEjemplo}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-tinta-500 focus:outline-none focus:ring-2 focus:ring-tinta-200"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">{tr.indicacionesAyuda}</span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">3. {tr.paso3}</p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <p>{formato(tr.resumen, { n: entregas.length, p: paginas })}</p>
              <p className="mt-1 font-semibold text-slate-900">{formato(tr.costo, { c: costo, k: CREDITOS_POR_PAGINA[elegido] })}</p>
              <p className={`mt-1 text-xs ${alcanza ? "text-slate-500" : "text-error"}`}>
                {alcanza ? formato(tr.saldo, { s: saldo }) : formato(tr.sinSaldo, { s: saldo })}
              </p>
              <p className="mt-2 text-xs text-slate-500">{tr.aviso}</p>
              {sinFotos > 0 && <p className="mt-2 text-xs text-aviso">{formato(tr.sinFotos, { n: sinFotos })}</p>}
            </div>
            {alcanza ? (
              <Boton type="submit" className="mt-3 w-full" disabled={actual !== null || entregas.length === 0}>
                {actual ? formato(tr.evaluando, { i: hechas + 1, n: entregas.length }) : formato(tr.boton, { n: entregas.length })}
              </Boton>
            ) : (
              <Link
                href="/profesor/creditos"
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-tinta-600 px-4 py-2 text-sm font-medium text-white hover:bg-tinta-700"
              >
                {tr.comprar}
              </Link>
            )}
            {actual && <p className="mt-1 text-xs text-slate-500">{formato(tr.leyendo, { nombre: actual })}</p>}
            {terminado && errores.length === 0 && <p className="mt-2 text-sm text-acierto">{tr.listo}</p>}
            {errores.map((e) => (
              <p key={e} className="mt-1 text-xs text-error">{e}</p>
            ))}
          </div>
        </form>
      )}
    </section>
  );
}
