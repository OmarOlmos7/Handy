// Hoja imprimible de una actividad generada con IA: encabezado vistoso con logo, datos del
// alumno (nombre, matrícula, calificación), instrucciones, QR de entrega y los reactivos.
import type { Actividad, Reactivo } from "@/lib/tipos";
import { fechaLarga } from "./ui";

const NOMBRE_TIPO: Record<Reactivo["tipo"], string> = {
  verdadero_falso: "Verdadero o falso",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación de columnas",
  parentesis: "Relaciona con paréntesis",
  desarrollo: "Problema de desarrollo",
  abierto: "Pregunta abierta",
};

function Renglones({ n }: { n: number }) {
  return (
    <div className="mt-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-7 border-b border-dashed border-slate-300" />
      ))}
    </div>
  );
}

function CuerpoReactivo({ r }: { r: Reactivo }) {
  if (r.tipo === "opcion_multiple" && r.opciones?.length) {
    return (
      <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 print:grid-cols-2">
        {r.opciones.map((o) => (
          <li key={o} className="flex items-start gap-2">
            <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 border-slate-400" />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (r.tipo === "verdadero_falso") {
    return (
      <p className="mt-2 flex gap-4 font-semibold text-slate-600">
        <span className="rounded-md border-2 border-slate-300 px-3 py-0.5">V</span>
        <span className="rounded-md border-2 border-slate-300 px-3 py-0.5">F</span>
      </p>
    );
  }
  if ((r.tipo === "relacion_columnas" || r.tipo === "parentesis") && (r.columnaA?.length || r.columnaB?.length)) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-6">
        <ol className="space-y-1.5">
          {r.columnaA?.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="shrink-0 font-semibold text-slate-500">(&nbsp;&nbsp;&nbsp;&nbsp;)</span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
        <ul className="space-y-1.5 border-l-2 border-tinta-100 pl-4">
          {r.columnaB?.map((b) => (
            <li key={b} className="flex gap-2">
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <Renglones n={r.lineas || (r.tipo === "desarrollo" ? 8 : r.tipo === "abierto" ? 5 : 2)} />;
}

export function HojaActividad({
  actividad,
  curso,
  qrSrc,
}: {
  actividad: Actividad;
  curso: string;
  qrSrc: string;
}) {
  const total = actividad.reactivos.reduce((s, r) => s + r.puntos, 0);
  return (
    <article className="hoja-actividad mx-auto max-w-[8.5in] rounded-xl bg-white p-8 text-[13.5px] leading-relaxed text-slate-800 shadow-md ring-1 ring-slate-200">
      <header className="sin-cortar overflow-hidden rounded-2xl ring-2 ring-tinta-600">
        <div className="flex items-center gap-4 bg-gradient-to-r from-tinta-700 via-tinta-600 to-tinta-500 px-5 py-4 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-auto rounded-lg bg-white p-1" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-tinta-100">{curso}</p>
            <h1 className="font-display text-3xl font-extrabold leading-tight">{actividad.titulo}</h1>
            <p className="text-xs text-tinta-100">
              {fechaLarga(actividad.fechaAplicacion)} · {actividad.reactivos.length} reactivos · {total} puntos
            </p>
          </div>
        </div>
        <div className="flex items-stretch gap-4 bg-tinta-50 px-5 py-4">
          <div className="flex-1 space-y-4 self-center">
            <p className="flex items-end gap-2">
              <span className="font-display text-sm font-bold text-tinta-900">Nombre:</span>
              <span className="flex-1 border-b-2 border-slate-400" />
            </p>
            <p className="flex items-end gap-2">
              <span className="font-display text-sm font-bold text-tinta-900">Matrícula:</span>
              <span className="flex-1 border-b-2 border-slate-400" />
            </p>
          </div>
          <div className="flex w-28 flex-col items-center justify-between rounded-xl border-2 border-error bg-white px-2 py-1.5 text-center">
            <span className="font-display text-xs font-bold uppercase tracking-wide text-error">Calificación</span>
            <span className="text-sm text-slate-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ 10</span>
          </div>
          <div className="flex w-28 flex-col items-center rounded-xl bg-white p-1.5 text-center ring-2 ring-tinta-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Código QR para entregar" className="h-20 w-20" />
            <span className="font-display text-[10px] font-bold leading-tight text-tinta-700">Escanea para entregar tus hojas</span>
          </div>
        </div>
      </header>

      {actividad.instruccionesAlumno?.length ? (
        <section className="sin-cortar mt-5 rounded-xl border-l-4 border-aviso bg-aviso-suave/60 px-5 py-3">
          <h2 className="font-display text-lg font-bold text-aviso">Instrucciones</h2>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {actividad.instruccionesAlumno.map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>Al terminar, escanea el código QR, toma una foto de cada hoja y envíala.</li>
          </ol>
        </section>
      ) : null}

      <ol className="mt-5 space-y-5">
        {actividad.reactivos.map((r) => (
          <li key={r.numero} className="sin-cortar flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta-600 font-display text-base font-bold text-white">
              {r.numero}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-tinta-700">{NOMBRE_TIPO[r.tipo]}</span>
                <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                  {r.puntos} {r.puntos === 1 ? "punto" : "puntos"}
                </span>
              </p>
              <p className="mt-0.5 whitespace-pre-line font-medium text-slate-900">{r.enunciado}</p>
              <CuerpoReactivo r={r} />
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-400">
        <span>iEureka-Grader · Evaluación con apoyo de IA</span>
        <span>Escribe tu nombre y matrícula en cada hoja</span>
      </footer>
    </article>
  );
}
