// Gráficas del proyecto para el alumno: la línea de etapas (de Inicio a Final) con el estado de
// cada una y las columnas con la calificación por etapa y la acumulada al cierre. SVG sin librerías.
import type { Diccionario } from "@/lib/i18n/diccionario";
import { ICONO_ETAPA, type EtapaAlumno, type ResumenAlumnoProyecto } from "@/lib/proyectos";

const COLOR_ESTADO: Record<EtapaAlumno["estado"], { circulo: string; texto: string }> = {
  cerrada: { circulo: "bg-acierto text-white ring-acierto", texto: "text-acierto" },
  en_evaluacion: { circulo: "bg-amber-400 text-white ring-amber-400", texto: "text-aviso" },
  entregada: { circulo: "bg-tinta-500 text-white ring-tinta-500", texto: "text-tinta-700" },
  pendiente: { circulo: "bg-white text-slate-500 ring-slate-300", texto: "text-slate-500" },
};

/** Línea de etapas con su estado; la línea se rellena hasta la última etapa cerrada. */
export function LineaEtapas({ resumen, t }: { resumen: ResumenAlumnoProyecto; t: Diccionario }) {
  const ta = t.proyecto.alumno;
  const n = resumen.etapas.length;
  const ultimaCerrada = resumen.etapas.reduce((u, e, i) => (e.estado === "cerrada" ? i : u), -1);
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="relative flex min-w-max gap-0" style={{ minWidth: `${Math.max(n, 3) * 8.5}rem` }}>
        {resumen.etapas.map((e, i) => {
          const c = COLOR_ESTADO[e.estado];
          return (
            <li key={e.etapa.id} className="relative flex flex-1 flex-col items-center px-2 text-center">
              {/* Tramo hacia la etapa siguiente. */}
              {i < n - 1 && <span aria-hidden className={`absolute top-6 left-1/2 h-1 w-full ${i < ultimaCerrada ? "bg-acierto" : "bg-slate-200"}`} />}
              <span className={`relative z-10 grid h-12 w-12 place-items-center rounded-full text-lg font-bold ring-4 ${c.circulo}`}>
                {e.estado === "cerrada" && e.resultado?.calificacion !== null && e.resultado ? (
                  <span className="text-sm">{Math.round(e.resultado.calificacion ?? 0)}</span>
                ) : (
                  <span aria-hidden>{ICONO_ETAPA[e.etapa.tipo]}</span>
                )}
              </span>
              <span className="mt-2 max-w-[9rem] text-xs font-semibold text-slate-800">
                {i + 1}. {e.etapa.nombre}
              </span>
              <span className={`text-[11px] font-medium ${c.texto}`}>{ta.estados[e.estado]}</span>
              <span className="text-[11px] text-slate-400">{e.etapa.peso} %</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

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
