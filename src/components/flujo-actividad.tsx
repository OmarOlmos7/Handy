// Columna con los pasos del proceso de una actividad. Solo informa el avance; no cambia el flujo.
// Pasos: 1 Alta de actividad · 2 Solución · 3 Rúbrica · 4 Evaluación.
// Círculo gris claro = pendiente; azul = en curso; azul con ✓ = terminado.
import Link from "next/link";
import type { ReactNode } from "react";
import { estadoActividad } from "@/lib/almacen";
import type { Actividad, BaseDeDatos } from "@/lib/tipos";

export type PasoFlujo = 1 | 2 | 3 | 4;

const PASOS: { numero: PasoFlujo; titulo: string; texto: string }[] = [
  { numero: 1, titulo: "Alta de actividad", texto: "Genera o carga la actividad e imprime la hoja con QR." },
  { numero: 2, titulo: "Solución", texto: "Escanea tu solución o genérala con IA." },
  { numero: 3, titulo: "Rúbrica", texto: "Revisa los criterios y confírmala." },
  { numero: 4, titulo: "Evaluación", texto: "Los alumnos entregan con el QR; revisa y publica." },
];

/** Pasos terminados según los datos de la actividad (sin actividad, todavía nada). */
export function avanceFlujo(db: BaseDeDatos | undefined, actividad: Actividad | undefined) {
  const hechos = new Set<PasoFlujo>();
  if (actividad && db) {
    hechos.add(1);
    if (actividad.reactivos.some((r) => r.respuesta.trim() || r.pasos?.length)) hechos.add(2);
    if (actividad.rubricaConfirmada) hechos.add(3);
    if (estadoActividad(db, actividad) === "publicada") hechos.add(4);
  }
  const enCurso = (PASOS.find((p) => !hechos.has(p.numero))?.numero ?? 4) as PasoFlujo;
  return { hechos, enCurso };
}

function enlace(id: string | undefined, paso: PasoFlujo) {
  if (!id) return undefined;
  return paso === 1 ? `/profesor/actividades/${id}/hoja` : paso === 4 ? `/profesor/actividades/${id}` : `/profesor/actividades/${id}/rubrica`;
}

function Circulo({ numero, hecho, enCurso }: { numero: number; hecho: boolean; enCurso: boolean }) {
  return (
    <span
      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
        hecho ? "bg-tinta-600 text-white" : enCurso ? "bg-tinta-600 text-white ring-4 ring-tinta-100" : "bg-slate-200 text-slate-500"
      }`}
    >
      {hecho ? "✓" : numero}
    </span>
  );
}

/** Contenido de la página con la columna de pasos a la izquierda (arriba en el celular). */
export function ConFlujo({
  vista,
  db,
  actividad,
  children,
}: {
  /** Paso al que corresponde la página que se está viendo. */
  vista: PasoFlujo;
  db?: BaseDeDatos;
  actividad?: Actividad;
  children: ReactNode;
}) {
  const { hechos, enCurso } = avanceFlujo(db, actividad);
  const estado = (n: PasoFlujo) => ({ hecho: hechos.has(n), enCurso: !hechos.has(n) && n === enCurso });
  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 print:block">
      <nav aria-label="Avance de la actividad" className="no-imprimir">
        {/* Celular y tableta: fila compacta. */}
        <ol className="mb-5 flex items-start lg:hidden">
          {PASOS.map((p, i) => {
            const e = estado(p.numero);
            return (
              <li key={p.numero} className="relative flex flex-1 flex-col items-center text-center">
                {i > 0 && (
                  <span className={`absolute right-1/2 top-4 h-0.5 w-full ${hechos.has(PASOS[i - 1].numero) ? "bg-tinta-600" : "bg-slate-200"}`} />
                )}
                <Circulo numero={p.numero} {...e} />
                <span className={`mt-1 text-[11px] leading-tight ${p.numero === vista ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                  {p.titulo}
                </span>
              </li>
            );
          })}
        </ol>
        {/* Escritorio: columna a la izquierda. */}
        <ol className="sticky top-6 hidden lg:block">
          {PASOS.map((p, i) => {
            const e = estado(p.numero);
            const href = enlace(actividad?.id, p.numero);
            const actual = p.numero === vista;
            const cuerpo = (
              <>
                <span className={`block text-sm ${actual ? "font-semibold text-slate-900" : e.hecho || e.enCurso ? "font-medium text-slate-700" : "text-slate-500"}`}>
                  {p.titulo}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{p.texto}</span>
                {actual && <span className="mt-1 inline-block rounded-full bg-tinta-50 px-2 py-0.5 text-[11px] font-medium text-tinta-700">Estás aquí</span>}
              </>
            );
            return (
              <li key={p.numero} className="relative flex gap-3 pb-7 last:pb-0">
                {i < PASOS.length - 1 && (
                  <span className={`absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5 ${e.hecho ? "bg-tinta-600" : "bg-slate-200"}`} />
                )}
                <Circulo numero={p.numero} {...e} />
                <div className="min-w-0 pt-1">
                  {href && !actual ? (
                    <Link href={href} className="block rounded-md hover:text-tinta-700">
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
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
