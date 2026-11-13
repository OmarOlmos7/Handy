// Piezas compartidas de los tableros de analíticas (grupo y actividad).
import type { ReactNode } from "react";
import { Tarjeta } from "@/components/ui";
import type { ResumenAlumno } from "@/lib/analiticas";

export const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Color del texto de un puntaje sobre 100, con los mismos umbrales del resto de la app. */
export function tonoPuntaje(p: number) {
  if (p >= 85) return "text-acierto";
  if (p >= 70) return "text-aviso";
  return "text-error";
}

export function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

export function Seccion({ titulo, nota, children, className = "" }: { titulo: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <Tarjeta className={className}>
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
      <div className="mt-4">{children}</div>
    </Tarjeta>
  );
}

export function TablaAlumnos({
  filas,
  vacio,
  motivos,
  titulo = "Promedio",
  entregas = true,
}: {
  filas: ResumenAlumno[];
  vacio: string;
  motivos?: boolean;
  /** Encabezado de la columna del valor (Promedio en el grupo, Puntaje en una actividad). */
  titulo?: string;
  /** Muestra la columna de entregas (no aplica en una sola actividad). */
  entregas?: boolean;
}) {
  if (filas.length === 0) return <p className="text-sm text-slate-500">{vacio}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="pb-2 font-medium">Alumno</th>
          <th className="pb-2 text-right font-medium">{titulo}</th>
          {motivos ? <th className="pb-2 pl-4 font-medium">Motivo</th> : entregas ? <th className="pb-2 text-right font-medium">Entregas</th> : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filas.map((r) => (
          <tr key={r.alumno.matricula}>
            <td className="py-2 text-slate-800">{r.alumno.nombre}</td>
            <td className={`py-2 text-right font-semibold tabular-nums ${tonoPuntaje(r.promedio)}`}>{num(r.promedio)}</td>
            {motivos ? (
              <td className="py-2 pl-4 text-xs text-slate-600">{r.motivos.join(" · ")}</td>
            ) : entregas ? (
              <td className="py-2 text-right tabular-nums text-slate-600">
                {r.puntajes.length - r.noEntregadas}/{r.puntajes.length}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

