// Ejemplos ilustrativos (datos inventados) de lo que recibe el profesor al terminar,
// para la sección "Qué recibes al terminar" de la página principal.
import type { ReactNode } from "react";
import type { Diccionario } from "@/lib/i18n/diccionario";

type T = Diccionario["entregable"];

export type TipoEntregable = "hoja" | "alumno" | "grupo" | "excel";

const mano = "font-mano text-[17px] leading-none text-[#1d43c9]";

function Marco({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-4 h-[232px] overflow-hidden rounded-lg ring-1 ring-slate-200 ${className}`} aria-hidden>
      {children}
    </div>
  );
}

function Numero({ n, bien }: { n: number; bien: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${bien ? "bg-acierto" : "bg-error"}`}>
        {n}
      </span>
      <span className={`text-sm font-bold ${bien ? "text-acierto" : "text-error"}`}>{bien ? "✓" : "✗"}</span>
    </span>
  );
}

function HojaCorregida({ t }: { t: T }) {
  return (
    <Marco className="grid grid-cols-[1fr_38%] bg-papel">
      <div className="relative space-y-3 p-3 text-[11px] text-slate-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="absolute right-2 top-2 h-7 w-auto opacity-30" />
        <p>
          <span className="font-semibold">{t.nombre}</span> <span className={mano}>Ana López</span>
        </p>
        <p className="flex items-center gap-2">
          {t.p1} <span className={mano}>{t.newton}</span> <Numero n={1} bien />
        </p>
        <p className="flex items-center gap-2">
          2. F = m·a, m = 5 kg, a = 2 m/s²
        </p>
        <p className="flex items-center gap-2 pl-3">
          <span className={mano}>F = 5 · 2 = 10</span> <Numero n={2} bien={false} />
        </p>
        <p className="flex items-center gap-2">
          3. {t.p3} <Numero n={3} bien />
        </p>
        <p className="absolute bottom-2 right-3 rounded-md border-2 border-error px-2 font-mano text-xl text-error">8.5</p>
      </div>
      <div className="space-y-2 border-l border-dashed border-slate-300 bg-white p-2 text-[10px] leading-snug text-slate-600">
        <p className="font-semibold uppercase tracking-wide text-slate-400">{t.comentarios}</p>
        <p>
          <b className="text-acierto">1.</b> {t.c1}
        </p>
        <p>
          <b className="text-error">2.</b> {t.c2}
        </p>
        <p>
          <b className="text-acierto">3.</b> {t.c3}
        </p>
      </div>
    </Marco>
  );
}

function ReporteAlumno({ t }: { t: T }) {
  const elementos: [string, number][] = [100, 90, 75, 60].map((v, i) => [t.elementos[i], v]);
  return (
    <Marco className="bg-white p-3 text-[11px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-800">Ana López Ruiz</p>
          <p className="text-slate-500">{t.grupoAlumno}</p>
        </div>
        <p className="text-2xl font-bold text-acierto">8.5</p>
      </div>
      <div className="mt-2 space-y-1">
        {elementos.map(([e, v]) => (
          <div key={e} className="grid grid-cols-[70px_1fr_30px] items-center gap-2">
            <span className="text-slate-600">{e}</span>
            <span className="h-2 rounded-full bg-slate-100">
              <span className={`block h-2 rounded-full ${v >= 85 ? "bg-acierto" : v >= 70 ? "bg-aviso" : "bg-error"}`} style={{ width: `${v}%` }} />
            </span>
            <span className="text-right text-slate-500">{v}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-acierto-suave p-1.5 text-acierto">
          <p className="font-semibold">{t.positivos}</p>
          <p>{t.positivo}</p>
        </div>
        <div className="rounded-md bg-aviso-suave p-1.5 text-aviso">
          <p className="font-semibold">{t.aMejorar}</p>
          <p>{t.mejora}</p>
        </div>
      </div>
    </Marco>
  );
}

function ReporteGrupo({ t }: { t: T }) {
  const temas: [string, number][] = [92, 71, 84, 58].map((v, i) => [t.temas[i], v]);
  return (
    <Marco className="bg-white p-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-slate-50 p-1.5">
          <p className="text-lg font-bold text-slate-800">7.9</p>
          <p className="text-slate-500">{t.promedio}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-1.5">
          <p className="text-lg font-bold text-slate-800">32</p>
          <p className="text-slate-500">{t.alumnos}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-1.5">
          <p className="text-lg font-bold text-error">#4</p>
          <p className="text-slate-500">{t.menorAcierto}</p>
        </div>
      </div>
      <p className="mt-2 font-semibold text-slate-700">{t.aciertoTema}</p>
      <div className="mt-1 flex h-[70px] items-end gap-3 border-b border-slate-200 px-1">
        {temas.map(([t, v]) => (
          <div key={t} className="flex flex-1 flex-col items-center justify-end">
            <span className="text-[9px] text-slate-500">{v}%</span>
            <span className={`w-full rounded-t ${v >= 80 ? "bg-tinta-500" : "bg-aviso"}`} style={{ height: `${v * 0.55}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-3 px-1 text-[9px] text-slate-500">
        {temas.map(([t]) => (
          <span key={t} className="flex-1 text-center">
            {t}
          </span>
        ))}
      </div>
      <p className="mt-1.5 flex gap-1.5">
        <span className="rounded-full bg-acierto-suave px-2 text-acierto">{t.alto} 14</span>
        <span className="rounded-full bg-aviso-suave px-2 text-aviso">{t.medio} 12</span>
        <span className="rounded-full bg-error-suave px-2 text-error">{t.bajo} 6</span>
      </p>
    </Marco>
  );
}

function Excel({ t }: { t: T }) {
  const filas: [string, string, string][] = [
    ["López Ruiz, Ana", "A0301", "8.5"],
    ["Díaz Soto, Bruno", "A0302", "9.2"],
    ["García Paz, Carla", "A0303", "7.0"],
    ["Hernández Gil, Diego", "A0304", "6.4"],
    ["Morales Vega, Elena", "A0305", "9.8"],
  ];
  return (
    <Marco className="bg-white text-[11px]">
      <div className="flex items-center gap-2 bg-[#107c41] px-3 py-1.5 text-white">
        <span className="rounded bg-white px-1 text-[10px] font-bold text-[#107c41]">X</span>
        <span>{t.archivo}</span>
      </div>
      <div className="grid grid-cols-[22px_1fr_72px_84px] font-mono text-[10.5px]">
        {["", "A", "B", "C"].map((c, i) => (
          <span key={i} className="border-b border-r border-slate-200 bg-slate-100 py-0.5 text-center text-slate-500">
            {c}
          </span>
        ))}
        {[["1", ...t.columnas], ...filas.map((f, i) => [String(i + 2), ...f])].map((fila, i) =>
          fila.map((celda, j) => (
            <span
              key={`${i}-${j}`}
              className={`truncate border-b border-r border-slate-200 px-1.5 py-[3px] ${
                j === 0 ? "bg-slate-100 text-center text-slate-500" : i === 0 ? "bg-slate-50 font-semibold text-slate-700" : "text-slate-700"
              } ${j === 3 && i > 0 ? "text-right" : ""}`}
            >
              {celda}
            </span>
          )),
        )}
      </div>
      <p className="flex items-center gap-2 px-3 py-2 text-slate-500">
        <span className="rounded-full bg-tinta-50 px-2 font-semibold text-tinta-700">{t.csv}</span>
        {t.listo}
      </p>
    </Marco>
  );
}

export function EjemploEntregable({ tipo, t }: { tipo: TipoEntregable; t: T }) {
  switch (tipo) {
    case "hoja":
      return <HojaCorregida t={t} />;
    case "alumno":
      return <ReporteAlumno t={t} />;
    case "grupo":
      return <ReporteGrupo t={t} />;
    case "excel":
      return <Excel t={t} />;
  }
}
