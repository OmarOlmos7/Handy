// Columna con la ruta de creación de un proyecto, equivalente a la del alta de actividad:
// A. Información general · B. Rúbrica · C. Evaluación. Cada paso es su propia vista.
// Círculo gris claro = pendiente; azul = en curso; azul con ✓ = terminado. Solo informa el avance.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { pasosAltaProyecto } from "@/lib/proyectos";
import type { Proyecto } from "@/lib/tipos";

export type PasoProyecto = "informacion" | "rubrica" | "evaluacion";

export const PASOS_PROYECTO: PasoProyecto[] = ["informacion", "rubrica", "evaluacion"];
const LETRAS: Record<PasoProyecto, string> = { informacion: "A", rubrica: "B", evaluacion: "C" };

export function enlacePasoProyecto(proyectoId: string, paso: PasoProyecto): string {
  return { informacion: `/profesor/proyectos/${proyectoId}/modelo`, rubrica: `/profesor/proyectos/${proyectoId}/rubrica`, evaluacion: `/profesor/proyectos/${proyectoId}` }[paso];
}

/** Pasos terminados y el que sigue (sin proyecto, todavía nada). */
export function avanceProyecto(proyecto: Proyecto | undefined) {
  const hechos = new Set<PasoProyecto>();
  if (proyecto) {
    const p = pasosAltaProyecto(proyecto);
    if (p.informacion) hechos.add("informacion");
    if (p.rubrica) hechos.add("rubrica");
    if (p.evaluacion) hechos.add("evaluacion");
  }
  const enCurso = PASOS_PROYECTO.find((n) => !hechos.has(n)) ?? "evaluacion";
  return { hechos, enCurso };
}

function Circulo({ letra, hecho, enCurso }: { letra: string; hecho: boolean; enCurso: boolean }) {
  return (
    <span
      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
        hecho ? "bg-tinta-600 text-white" : enCurso ? "bg-tinta-600 text-white ring-4 ring-tinta-100" : "bg-slate-200 text-slate-500"
      }`}
    >
      {hecho ? "✓" : letra}
    </span>
  );
}

/** Ruta compacta (A → B → C) para la tarjeta de cada proyecto en "Proyectos del grupo". */
export function PasosProyectoMini({ proyecto, t }: { proyecto: Proyecto; t: Diccionario }) {
  const tf = t.altaProyecto.flujo;
  const { hechos, enCurso } = avanceProyecto(proyecto);
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label={tf.avance}>
      {PASOS_PROYECTO.map((paso, i) => {
        const hecho = hechos.has(paso);
        const actual = !hecho && paso === enCurso;
        return (
          <li key={paso} className="flex items-center gap-2">
            {i > 0 && <span className={`h-0.5 w-5 ${hechos.has(PASOS_PROYECTO[i - 1]) ? "bg-tinta-600" : "bg-slate-200"}`} aria-hidden />}
            <Link
              href={enlacePasoProyecto(proyecto.id, paso)}
              className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-medium ring-1 transition hover:ring-tinta-400 ${
                actual ? "bg-tinta-50 text-tinta-800 ring-tinta-300" : "bg-white text-slate-700 ring-slate-200"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${hecho || actual ? "bg-tinta-600 text-white" : "bg-slate-200 text-slate-500"}`}
              >
                {hecho ? "✓" : LETRAS[paso]}
              </span>
              {tf.pasos[paso][0]}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Contenido de la página con la ruta de creación del proyecto a la izquierda (arriba en el celular). */
export function ConFlujoProyecto({
  vista,
  proyecto,
  t,
  sinRuta = false,
  children,
}: {
  vista: PasoProyecto;
  proyecto?: Proyecto;
  t: Diccionario;
  /** true para los evaluadores invitados: no arman el proyecto, solo evalúan. */
  sinRuta?: boolean;
  children: ReactNode;
}) {
  if (sinRuta) return <>{children}</>;
  const tf = t.altaProyecto.flujo;
  const { hechos, enCurso } = avanceProyecto(proyecto);
  const estado = (n: PasoProyecto) => ({ hecho: hechos.has(n), enCurso: !hechos.has(n) && n === enCurso });
  const href = (n: PasoProyecto) => (proyecto ? enlacePasoProyecto(proyecto.id, n) : undefined);
  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 print:block">
      <nav aria-label={tf.avance} className="no-imprimir">
        {/* Celular y tableta: fila compacta. */}
        <ol className="mb-5 flex items-start lg:hidden">
          {PASOS_PROYECTO.map((paso, i) => {
            const e = estado(paso);
            const destino = href(paso);
            const cuerpo = (
              <>
                <Circulo letra={LETRAS[paso]} {...e} />
                <span className={`mt-1 text-[11px] leading-tight ${paso === vista ? "font-semibold text-slate-900" : "text-slate-500"}`}>{tf.pasos[paso][0]}</span>
              </>
            );
            return (
              <li key={paso} className="relative flex flex-1 flex-col items-center text-center">
                {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${hechos.has(PASOS_PROYECTO[i - 1]) ? "bg-tinta-600" : "bg-slate-200"}`} />}
                {destino && paso !== vista ? (
                  <Link href={destino} className="flex flex-col items-center">
                    {cuerpo}
                  </Link>
                ) : (
                  <span className="flex flex-col items-center">{cuerpo}</span>
                )}
              </li>
            );
          })}
        </ol>
        {/* Escritorio: columna a la izquierda. */}
        <div className="sticky top-6 hidden lg:block">
          <p className="mb-3 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">{tf.titulo}</p>
          <ol>
            {PASOS_PROYECTO.map((paso, i) => {
              const e = estado(paso);
              const destino = href(paso);
              const actual = paso === vista;
              const cuerpo = (
                <>
                  <span className={`block text-sm ${actual ? "font-semibold text-slate-900" : e.hecho || e.enCurso ? "font-medium text-slate-700" : "text-slate-500"}`}>
                    {LETRAS[paso]}. {tf.pasos[paso][0]}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{tf.pasos[paso][1]}</span>
                  {actual && <span className="mt-1 inline-block rounded-full bg-tinta-50 px-2 py-0.5 text-[11px] font-medium text-tinta-700">{tf.estasAqui}</span>}
                </>
              );
              return (
                <li key={paso} className="relative flex gap-3 pb-7 last:pb-0">
                  {i < PASOS_PROYECTO.length - 1 && (
                    <span className={`absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5 ${e.hecho ? "bg-tinta-600" : "bg-slate-200"}`} />
                  )}
                  <Circulo letra={LETRAS[paso]} {...e} />
                  <div className="min-w-0 pt-1">
                    {destino && !actual ? (
                      <Link href={destino} className="block rounded-md hover:text-tinta-700">
                        {cuerpo}
                      </Link>
                    ) : (
                      cuerpo
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
