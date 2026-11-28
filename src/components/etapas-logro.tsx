import { Barra } from "@/components/ui";
import { ETAPAS_CREAR } from "@/lib/perfil/crear";
import type { EtapaCrear } from "@/lib/tipos";

/** Barras del logro (0-100) en cada etapa del Modelo CREAR; las etapas sin evidencia van en gris. */
export function EtapasLogro({
  porEtapa,
  nombres,
  sinDatos,
  compacto = false,
  unaColumna = false,
}: {
  porEtapa: Partial<Record<EtapaCrear, number>>;
  nombres: Record<EtapaCrear, { nombre: string }>;
  sinDatos: string;
  compacto?: boolean;
  /** Siempre en una columna (para espacios angostos). */
  unaColumna?: boolean;
}) {
  return (
    <dl className={`grid gap-x-4 ${compacto ? "gap-y-1" : "gap-y-2"} ${unaColumna ? "" : "sm:grid-cols-2"}`}>
      {ETAPAS_CREAR.map((e) => {
        const v = porEtapa[e];
        return (
          <div key={e} className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-2 text-sm">
            <dt className={v === undefined ? "text-slate-400" : "font-medium text-slate-700"}>{nombres[e].nombre}</dt>
            <dd className="contents">
              {v === undefined ? <span className="h-2 rounded-full bg-slate-100" title={sinDatos} /> : <Barra valor={v} />}
              <span className={`text-right tabular-nums ${v === undefined ? "text-slate-400" : "font-semibold text-slate-900"}`}>{v === undefined ? "—" : `${v}%`}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
