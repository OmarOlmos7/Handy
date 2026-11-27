// Gráficas del proyecto para el alumno: las columnas con la calificación por etapa y la acumulada al cierre. SVG sin librerías.
import type { Diccionario } from "@/lib/i18n/diccionario";
import { ICONO_ETAPA, type ResumenAlumnoProyecto } from "@/lib/proyectos";

/** Columnas: calificación de cada etapa cerrada (0-100) y línea de la acumulada (puntos de 100). */
export function GraficaProyecto({ resumen, t }: { resumen: ResumenAlumnoProyecto; t: Diccionario }) {
  const ta = t.proyecto.alumno;
  const n = resumen.etapas.length;
  if (!n) return null;
  const ancho = Math.max(640, n * 110 + 60);
  const alto = 220;
  const izq = 36;
  const abajo = 28;
  const arriba = 12;
  const util = alto - abajo - arriba;
  const paso = (ancho - izq - 10) / n;
  const y = (v: number) => arriba + util - (Math.max(0, Math.min(100, v)) / 100) * util;
  const puntos = resumen.etapas
    .map((e, i) => (e.acumulada === null ? null : `${izq + paso * i + paso / 2},${y(e.acumulada)}`))
    .filter((p): p is string => p !== null);
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold text-slate-800">{ta.grafica}</figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full min-w-[20rem] max-w-3xl" role="img" aria-label={ta.grafica}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={izq} x2={ancho - 6} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v ? "3 3" : undefined} />
              <text x={izq - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                {v}
              </text>
            </g>
          ))}
          {resumen.etapas.map((e, i) => {
            const cal = e.estado === "cerrada" ? (e.resultado?.calificacion ?? 0) : null;
            const x = izq + paso * i + paso * 0.2;
            const w = paso * 0.6;
            const color = cal === null ? "#e2e8f0" : cal >= 85 ? "#16a34a" : cal >= 70 ? "#f59e0b" : "#dc2626";
            return (
              <g key={e.etapa.id}>
                {cal === null ? (
                  <rect x={x} y={arriba} width={w} height={util} rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeDasharray="4 3" />
                ) : (
                  <>
                    <rect x={x} y={y(cal)} width={w} height={Math.max(2, arriba + util - y(cal))} rx="4" fill={color} opacity="0.85" />
                    <text x={x + w / 2} y={y(cal) - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">
                      {Math.round(cal)}
                    </text>
                  </>
                )}
                <text x={x + w / 2} y={alto - 10} textAnchor="middle" fontSize="11" fill="#475569">
                  {ICONO_ETAPA[e.etapa.tipo]} {i + 1}
                </text>
              </g>
            );
          })}
          {puntos.length > 0 && (
            <>
              <polyline points={puntos.join(" ")} fill="none" stroke="#3b6ef6" strokeWidth="2.5" />
              {puntos.map((p) => {
                const [cx, cy] = p.split(",").map(Number);
                return <circle key={p} cx={cx} cy={cy} r="4" fill="#fff" stroke="#3b6ef6" strokeWidth="2.5" />;
              })}
            </>
          )}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-acierto opacity-85" /> {ta.leyendaEtapa}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#3b6ef6]" /> {ta.leyendaAcumulada}
        </span>
      </div>
    </figure>
  );
}

/** Anillo de avance (porcentaje del proyecto ya cerrado, por peso). */
export function AnilloAvance({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0" role="img" aria-label={`${etiqueta}: ${valor}%`}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(valor / 100) * c} ${c}`} transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">
        {valor}%
      </text>
    </svg>
  );
}
