// Diagrama de ruta de avance del proyecto: Inicio → etapas → Cierre, con círculos numerados,
// ícono de línea y flechas. Una etapa completa se pinta de azul con su paloma; una en curso
// muestra su avance en el anillo. Lo usan el alumno (su avance) y el profesor (el del grupo).
import Link from "next/link";
import type { ReactNode } from "react";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import type { PasoRuta } from "@/lib/proyectos";
import type { TipoEtapaProyecto } from "@/lib/tipos";

const AZUL = "#2563eb";
const AMBAR = "#d4a017";
const TINTA = "#1e293b";

const trazo = {
  width: 34,
  height: 34,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconoFoco() {
  return (
    <svg {...trazo}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />
      <path d="M3.5 3.5l1.3 1.3M20.5 3.5l-1.3 1.3M1.5 10h1.7M20.8 10h1.7" />
    </svg>
  );
}

/** Íconos de línea por tipo de etapa. */
const ICONOS: Record<TipoEtapaProyecto, () => ReactNode> = {
  reporte: () => (
    <svg {...trazo}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M8.5 10l1.2 1.2 2-2.2M14 10.5h2M8.5 15l1.2 1.2 2-2.2M14 15.5h2" />
    </svg>
  ),
  oral_grupal: () => (
    <svg {...trazo}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  ),
  entrevista: () => (
    <svg {...trazo}>
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h8A2.5 2.5 0 0 1 16 5.5v4a2.5 2.5 0 0 1-2.5 2.5H8l-3.5 3v-3A2.5 2.5 0 0 1 3 9.5Z" />
      <path d="M19 9a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2v3l-3.5-3H11a2 2 0 0 1-2-2" />
    </svg>
  ),
  demostracion: () => (
    <svg {...trazo}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      <circle cx="12" cy="12" r="6.3" />
    </svg>
  ),
};

function IconoCierre() {
  return (
    <svg {...trazo}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3l2.7 2.7L16 9.5" />
    </svg>
  );
}

/** Paloma azul en un círculo, para lo que está completo al 100 %. */
function Paloma({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill={AZUL} stroke="#fff" strokeWidth="2" />
      <path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Un nodo: círculo con anillo de avance, número arriba y etiqueta abajo. */
function Nodo({
  avance,
  icono,
  numero,
  titulo,
  detalle,
  href,
  activo,
  estado: estadoFijo,
  t,
}: {
  avance: number;
  icono: ReactNode;
  numero?: number;
  titulo: string;
  detalle?: string;
  href?: string;
  activo?: boolean;
  estado?: string;
  t: Diccionario;
}) {
  const completo = avance >= 100;
  const enCurso = avance > 0 && !completo;
  const color = completo ? AZUL : enCurso ? AMBAR : TINTA;
  const r = 44;
  const c = 2 * Math.PI * r;
  const estado = estadoFijo ?? (completo ? t.proyecto.ruta.completa : formato(t.proyecto.ruta.avance, { p: avance }));
  const cuerpo = (
    <>
      <span className="relative grid h-[6.5rem] w-[6.5rem] place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="50" cy="50" r="49" fill={completo ? "#dbeafe" : "#f1f5f9"} />
          <circle cx="50" cy="50" r={r} fill={completo ? AZUL : "#fff"} stroke={completo ? AZUL : enCurso ? "#f5e7bd" : "#cbd5e1"} strokeWidth="3" />
          {enCurso && (
            <circle cx="50" cy="50" r={r} fill="none" stroke={AMBAR} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(avance / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
          )}
        </svg>
        <span className="relative" style={{ color: completo ? "#fff" : color }}>
          {icono}
        </span>
        {numero !== undefined && (
          <span
            className="absolute -top-3 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-sm font-bold text-white ring-2 ring-white"
            style={{ background: color }}
          >
            {numero}
          </span>
        )}
        {completo && <Paloma className="absolute right-0 bottom-0 h-7 w-7" />}
      </span>
      <span aria-hidden className="mt-1 h-2 w-2 rounded-full" style={{ background: color }} />
      <span aria-hidden className="h-4 border-l-2 border-dotted" style={{ borderColor: color }} />
      <span className={`max-w-[8.5rem] text-center text-xs font-bold tracking-wide uppercase ${activo ? "underline decoration-2 underline-offset-4" : ""}`} style={{ color }}>
        {titulo}
      </span>
      <span className={`mt-0.5 text-[11px] font-medium ${completo ? "text-blue-700" : "text-slate-500"}`}>{estado}</span>
      {detalle && <span className="text-[11px] text-slate-400">{detalle}</span>}
    </>
  );
  const clase = "flex w-[8.5rem] shrink-0 flex-col items-center pt-3";
  return href ? (
    <Link href={href} aria-current={activo ? "true" : undefined} className={`${clase} rounded-xl transition hover:bg-slate-50`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

function Flecha({ azul }: { azul: boolean }) {
  return (
    <svg viewBox="0 0 32 12" className="mt-[3.6rem] h-3 w-8 shrink-0" aria-hidden>
      <path d="M1 6h28M24 1.5L29.5 6 24 10.5" fill="none" stroke={azul ? AZUL : "#475569"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Ruta de avance: Inicio, una etapa por paso y Cierre. `enlace` hace de cada etapa un vínculo
 * (por ejemplo, a su evaluación) y `activa` resalta la etapa abierta.
 */
export function RutaProyecto({
  pasos,
  avanceTotal,
  t,
  enlace,
  activa,
  nota,
}: {
  pasos: PasoRuta[];
  avanceTotal: number;
  t: Diccionario;
  enlace?: (etapaId: string) => string;
  activa?: string;
  nota?: string;
}) {
  const tr = t.proyecto.ruta;
  if (!pasos.length) return null;
  const iniciado = pasos.some((p) => p.avance > 0);
  const completo = pasos.every((p) => p.avance >= 100);
  return (
    <figure>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{tr.titulo}</span>
        <span className={`text-sm font-semibold ${completo ? "text-blue-700" : "text-slate-600"}`}>{formato(tr.avance, { p: avanceTotal })}</span>
      </figcaption>
      {nota && <p className="mb-2 text-xs text-slate-500">{nota}</p>}
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-max items-start">
          <li className="flex items-start">
            <Nodo avance={iniciado ? 100 : 0} icono={<IconoFoco />} titulo={tr.inicio} estado={iniciado ? tr.iniciado : tr.porIniciar} t={t} />
          </li>
          {pasos.map((p, i) => (
            <li key={p.etapa.id} className="flex items-start">
              <Flecha azul={i === 0 ? iniciado : pasos[i - 1].avance >= 100} />
              <Nodo
                avance={p.avance}
                icono={ICONOS[p.etapa.tipo]()}
                numero={p.numero}
                titulo={p.etapa.nombre}
                detalle={`${t.proyecto.tipos[p.etapa.tipo]} · ${p.etapa.peso} %`}
                href={enlace?.(p.etapa.id)}
                activo={activa === p.etapa.id}
                t={t}
              />
            </li>
          ))}
          <li className="flex items-start">
            <Flecha azul={completo} />
            <Nodo avance={completo ? 100 : 0} icono={<IconoCierre />} titulo={tr.cierre} estado={completo ? tr.completo : tr.pendiente} t={t} />
          </li>
        </ol>
      </div>
    </figure>
  );
}
