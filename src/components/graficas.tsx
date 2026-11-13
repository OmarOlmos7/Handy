// Gráficas en SVG/CSS sin dependencias, para el tablero de analíticas.
// El color de cada marca sale de la escala de desempeño; los textos van en tinta neutra.
import { colorDesempeno, degradadoDesempeno } from "@/lib/escala-color";

const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Leyenda de la escala de color: degradado con marcas. */
export function LeyendaDesempeno({ aprobatoria }: { aprobatoria: number }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <span>Escala de color</span>
      <div className="relative w-48 sm:w-64">
        <div className="h-2.5 rounded-full" style={{ background: degradadoDesempeno() }} />
        <div className="relative mt-0.5 h-3.5">
          {[0, aprobatoria, 70, 85, 100].map((v) => (
            <span key={v} className="absolute -translate-x-1/2 tabular-nums text-[10px] text-slate-500" style={{ left: `${v}%` }}>
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Barras horizontales sobre 100, coloreadas por desempeño, con la línea aprobatoria. */
export function BarrasH({
  filas,
  aprobatoria,
  sufijo = "",
}: {
  filas: { nombre: string; valor: number; detalle?: string }[];
  aprobatoria: number;
  sufijo?: string;
}) {
  if (filas.length === 0) return <p className="text-sm text-slate-500">Sin datos todavía.</p>;
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.nombre} title={`${f.nombre}: ${num(f.valor)}${sufijo} de 100${f.detalle ? ` · ${f.detalle}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-slate-700">
              {f.nombre}
              {f.detalle && <span className="ml-1.5 text-xs text-slate-500">{f.detalle}</span>}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {num(f.valor)}
              {sufijo}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(1, Math.min(100, f.valor))}%`, background: colorDesempeno(f.valor) }}
            />
            <div className="absolute inset-y-[-3px] w-px bg-slate-500" style={{ left: `${aprobatoria}%` }} aria-hidden />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Columnas verticales. El color de cada una sale de `colorDe` (por defecto, su valor sobre 100).
 * `max` fija la escala del eje.
 */
export function Columnas({
  filas,
  max,
  sufijo = "",
  colorDe = (f) => colorDesempeno(f.valor),
  lineaEn,
}: {
  filas: { nombre: string; valor: number; detalle?: string; color?: string }[];
  max: number;
  sufijo?: string;
  colorDe?: (f: { nombre: string; valor: number; color?: string }) => string;
  /** Valor donde dibujar una línea de referencia punteada (por ejemplo, la aprobatoria). */
  lineaEn?: number;
}) {
  if (filas.length === 0) return <p className="text-sm text-slate-500">Sin datos todavía.</p>;
  const tope = Math.max(max, 1);
  return (
    <div>
      <div className="relative flex h-48 items-end gap-2 border-b border-slate-200">
        {lineaEn !== undefined && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400"
            style={{ bottom: `${(lineaEn / tope) * 100}%` }}
            aria-hidden
          >
            <span className="absolute -top-4 right-0 text-[10px] text-slate-500">{lineaEn}</span>
          </div>
        )}
        {filas.map((f, i) => (
          <div
            key={`${f.nombre}-${i}`}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${f.nombre}: ${num(f.valor)}${sufijo}${f.detalle ? ` · ${f.detalle}` : ""}`}
          >
            <span className="mb-1 text-center text-xs font-semibold tabular-nums text-slate-700">{num(f.valor)}</span>
            <div
              className="mx-auto w-full max-w-14 rounded-t-md transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(1, (f.valor / tope) * 100)}%`, background: f.color ?? colorDe(f) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {filas.map((f, i) => (
          <span key={`${f.nombre}-${i}`} className="flex-1 truncate text-center text-xs text-slate-500" title={f.nombre}>
            {f.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Gráfica de pastel (dona) con leyenda. Cada rebanada lleva su etiqueta y su porcentaje en texto. */
export function Pastel({
  rebanadas,
  centro,
  subcentro,
}: {
  rebanadas: { nombre: string; valor: number; color: string }[];
  centro: string;
  subcentro?: string;
}) {
  const total = rebanadas.reduce((s, r) => s + r.valor, 0);
  const radio = 52;
  const circ = 2 * Math.PI * radio;
  const visibles = rebanadas.filter((r) => r.valor > 0);
  const hueco = visibles.length > 1 ? 2.5 : 0; // separación entre rebanadas
  let acumulado = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={rebanadas.map((r) => `${r.nombre}: ${r.valor}`).join(", ")}>
        <circle cx="70" cy="70" r={radio} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {total > 0 &&
          visibles.map((r) => {
            const largo = (r.valor / total) * circ;
            const inicio = acumulado;
            acumulado += largo;
            return (
              <circle
                key={r.nombre}
                cx="70"
                cy="70"
                r={radio}
                fill="none"
                stroke={r.color}
                strokeWidth="18"
                strokeDasharray={`${Math.max(0, largo - hueco)} ${circ}`}
                strokeDashoffset={-inicio}
                transform="rotate(-90 70 70)"
              >
                <title>{`${r.nombre}: ${r.valor} (${Math.round((r.valor / total) * 100)}%)`}</title>
              </circle>
            );
          })}
        <text x="70" y={subcentro ? 68 : 75} textAnchor="middle" className="fill-slate-900 text-[22px] font-semibold">
          {centro}
        </text>
        {subcentro && (
          <text x="70" y="86" textAnchor="middle" className="fill-slate-500 text-[10px]">
            {subcentro}
          </text>
        )}
      </svg>
      <ul className="w-full space-y-1.5 text-sm">
        {rebanadas.map((r) => (
          <li key={r.nombre} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: r.color }} />
            <span className="flex-1 text-slate-700">{r.nombre}</span>
            <span className="tabular-nums font-semibold text-slate-900">{r.valor}</span>
            <span className="w-10 text-right tabular-nums text-xs text-slate-500">{total ? Math.round((r.valor / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gráfica de radar sobre 100 (3 o más ejes), con el anillo aprobatorio punteado. */
export function Radar({ ejes, aprobatoria }: { ejes: { nombre: string; valor: number }[]; aprobatoria: number }) {
  const n = ejes.length;
  const c = 150;
  const r = 100;
  const punto = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [c + Math.cos(ang) * (r * v) / 100, c + Math.sin(ang) * (r * v) / 100];
  };
  const poligono = (v: (i: number) => number) =>
    ejes.map((_, i) => punto(i, v(i)).map((x) => x.toFixed(1)).join(",")).join(" ");
  const promedio = ejes.reduce((s, e) => s + e.valor, 0) / Math.max(1, n);
  const color = colorDesempeno(promedio);
  return (
    <svg viewBox="-70 -5 440 310" className="mx-auto h-auto w-full max-w-md" role="img" aria-label={ejes.map((e) => `${e.nombre}: ${num(e.valor)}`).join(", ")}>
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={poligono(() => v)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {ejes.map((_, i) => {
        const [x, y] = punto(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <polygon points={poligono(() => aprobatoria)} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" />
      <polygon points={poligono((i) => ejes[i].valor)} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {ejes.map((e, i) => {
        const [x, y] = punto(i, e.valor);
        return (
          <circle key={e.nombre} cx={x} cy={y} r="5" fill={colorDesempeno(e.valor)} stroke="#fff" strokeWidth="2">
            <title>{`${e.nombre}: ${num(e.valor)}`}</title>
          </circle>
        );
      })}
      {ejes.map((e, i) => {
        const [x, y] = punto(i, 122);
        const anchor = Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end";
        return (
          <text key={e.nombre} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-slate-700 text-[10px]">
            <tspan>{e.nombre.length > 24 ? `${e.nombre.slice(0, 23)}…` : e.nombre}</tspan>
            <tspan x={x} dy="12" className="fill-slate-900 font-semibold">
              {num(e.valor)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
