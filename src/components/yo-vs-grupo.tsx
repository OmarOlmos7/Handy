// Barras pareadas: el valor del alumno junto al promedio del grupo (sobre 100).
import { num } from "@/components/tablero";
import { colorDesempeno, degradadoDesempeno } from "@/lib/escala-color";

export function YoVsGrupo({
  filas,
  aprobatoria,
  yo,
  grupo,
  sufijo = "",
}: {
  filas: { nombre: string; detalle?: string; yo: number; grupo: number }[];
  aprobatoria: number;
  yo: string;
  grupo: string;
  sufijo?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-full" style={{ background: degradadoDesempeno() }} aria-hidden />
          {yo}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-full bg-slate-400" aria-hidden />
          {grupo}
        </span>
      </div>
      <ul className="space-y-3">
        {filas.map((f) => (
          <li key={f.nombre}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-700" title={f.nombre}>
                {f.nombre}
                {f.detalle && <span className="ml-1.5 text-xs text-slate-500">{f.detalle}</span>}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-slate-900">
                  {num(f.yo)}
                  {sufijo}
                </span>
                <span className="text-slate-500">
                  {" "}
                  · {num(f.grupo)}
                  {sufijo}
                </span>
              </span>
            </div>
            <div className="relative space-y-1">
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${Math.max(1, Math.min(100, f.yo))}%`, background: colorDesempeno(f.yo) }} />
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.max(1, Math.min(100, f.grupo))}%` }} />
              </div>
              <div className="absolute inset-y-[-3px] w-px bg-slate-500" style={{ left: `${aprobatoria}%` }} aria-hidden />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
