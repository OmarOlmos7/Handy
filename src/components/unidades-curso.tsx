"use client";

// Unidades del temario como botones en la vista del curso: al dar clic en la tarjeta de una unidad
// de la línea de tiempo se muestran solo sus actividades; por omisión se ven todas, agrupadas por
// unidad en el orden del temario, en secciones plegables.
import { createContext, useContext, useState } from "react";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";

/** Unidad elegida: su índice, "sin" para las actividades sin unidad, o null para ver todas. */
type Eleccion = number | "sin" | null;

const Contexto = createContext<{ elegida: Eleccion; elegir: (e: Eleccion) => void } | null>(null);

const ANCLA = "actividades-por-unidad";

export function SeleccionUnidades({ children }: { children: React.ReactNode }) {
  const [elegida, setElegida] = useState<Eleccion>(null);
  return <Contexto.Provider value={{ elegida, elegir: setElegida }}>{children}</Contexto.Provider>;
}

function useEleccion() {
  return useContext(Contexto) ?? { elegida: null as Eleccion, elegir: () => {} };
}

/** Tarjeta de la línea de tiempo convertida en botón: muestra (o deja de mostrar) solo su unidad. */
export function BotonUnidad({ indice, nombre, children }: { indice: number; nombre: string; children: React.ReactNode }) {
  const { elegida, elegir } = useEleccion();
  const tu = useTextos().t.marco.unidades;
  const activa = elegida === indice;
  function alternar() {
    elegir(activa ? null : indice);
    // Lleva la vista a las actividades (en el teléfono quedan debajo de la línea de tiempo).
    requestAnimationFrame(() => document.getElementById(ANCLA)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={activa}
      title={activa ? tu.verTodas : formato(tu.verUnidad, { nombre })}
      onClick={alternar}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          alternar();
        }
      }}
      className={`h-full cursor-pointer rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta-500 ${
        activa ? "outline-3 outline-offset-2 outline-tinta-500" : ""
      } ${elegida !== null && !activa ? "opacity-60 hover:opacity-100" : ""}`}
    >
      {children}
    </div>
  );
}

/** Encabezado de la lista: qué unidad se está viendo y el botón para volver a todas. */
export function BarraUnidades({ nombres }: { nombres: string[] }) {
  const { elegida, elegir } = useEleccion();
  const tu = useTextos().t.marco.unidades;
  return (
    <div id={ANCLA} className="flex scroll-mt-4 flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="text-base font-semibold text-slate-900">{tu.titulo}</h2>
      {elegida === null ? (
        <span className="text-sm text-slate-500">{tu.pista}</span>
      ) : (
        <>
          <span className="rounded-full bg-tinta-50 px-3 py-1 text-sm font-medium text-tinta-800">
            {elegida === "sin" ? tu.sinUnidad : formato(tu.mostrando, { n: elegida + 1, nombre: nombres[elegida] ?? "" })}
          </span>
          <button type="button" onClick={() => elegir(null)} className="text-sm font-medium text-tinta-700 hover:underline">
            ← {tu.verTodas}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Sección plegable de una unidad. Con una unidad elegida solo se ve la suya, ya abierta; con todas,
 * cada una abre según `abierta` (la de hoy o las que tienen actividades en proceso).
 */
export function SeccionUnidad({
  indice,
  abierta,
  encabezado,
  children,
}: {
  indice: number | null;
  abierta: boolean;
  encabezado: React.ReactNode;
  children: React.ReactNode;
}) {
  const { elegida } = useEleccion();
  const propia: Eleccion = indice === null ? "sin" : indice;
  if (elegida !== null && elegida !== propia) return null;
  const sola = elegida === propia;
  return (
    <details
      // Al elegir o soltar una unidad la sección se vuelve a montar con su estado inicial.
      key={sola ? "sola" : "todas"}
      open={sola || abierta}
      className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-slate-400 transition group-open:rotate-90">
          ▸
        </span>
        {encabezado}
      </summary>
      <div className="border-t border-slate-100">{children}</div>
    </details>
  );
}
