// Hoja imprimible de una actividad generada con IA. Estilo de referencia del profesor:
// letra Inter, encabezado limpio con logo, calificación y QR; instrucciones en dos columnas;
// criterios de evaluación en etiquetas; cada problema con su puntaje, un cuadro de
// desarrollo (cuadrícula de puntos) y un cuadro de RESPUESTA.
import type { CSSProperties, ReactNode } from "react";
import type { Actividad, Reactivo } from "@/lib/tipos";
import { TextoMat, taparFormulas } from "./texto-mat";
import { fechaLarga } from "./ui";

/** Separa el planteamiento de los incisos a), b), c)… y resalta cada letra (sin mirar dentro de las fórmulas). */
function Enunciado({ texto }: { texto: string }) {
  const tapado = taparFormulas(texto);
  const inicio = tapado.search(/(?:^|\s)a\)\s/);
  const planteamiento = inicio > 0 ? texto.slice(0, inicio).trim() : inicio === 0 ? "" : texto;
  const incisos: string[] = [];
  if (inicio >= 0) {
    const cortes = [...tapado.slice(inicio).matchAll(/\s(?=[b-h]\)\s)/g)].map((m) => inicio + m.index!);
    [inicio, ...cortes].forEach((desde, i, xs) => incisos.push(texto.slice(desde, xs[i + 1] ?? texto.length).trim()));
  }
  return (
    <>
      {planteamiento && (
        <p className="whitespace-pre-line text-[15px] leading-snug text-slate-800">
          <TextoMat texto={planteamiento} />
        </p>
      )}
      {incisos.length > 0 && (
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
          {incisos.map((inc, i) => (
            <span key={i} className="mr-5 inline-block">
              <span className="font-bold text-tinta-600">{inc.slice(0, 2)}</span> <TextoMat texto={inc.slice(2).trim()} />
            </span>
          ))}
        </p>
      )}
    </>
  );
}

const cuadricula: CSSProperties = {
  backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1.3px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "11px 11px",
};

const renglones: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)",
};

function Cuadro({ alto, estilo, children }: { alto: number; estilo: CSSProperties; children?: ReactNode }) {
  return (
    <div className="sin-cortar relative mt-3 rounded-xl border border-slate-300" style={{ ...estilo, height: alto }}>
      {children}
    </div>
  );
}

function CuerpoReactivo({ r }: { r: Reactivo }) {
  if (r.tipo === "opcion_multiple" && r.opciones?.length) {
    return (
      <ul className="mt-2.5 grid grid-cols-2 gap-x-8 gap-y-2 text-[14.5px]">
        {r.opciones.map((o) => (
          <li key={o} className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-block h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-slate-400" />
            <span>
              <span className="font-bold text-tinta-600">{o.slice(0, 2)}</span>
              <TextoMat texto={o.slice(2)} />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (r.tipo === "verdadero_falso") {
    return (
      <p className="mt-2.5 flex gap-3 text-sm font-semibold text-slate-500">
        <span className="rounded-lg border-[1.5px] border-slate-300 px-4 py-1">V</span>
        <span className="rounded-lg border-[1.5px] border-slate-300 px-4 py-1">F</span>
      </p>
    );
  }
  if ((r.tipo === "relacion_columnas" || r.tipo === "parentesis") && (r.columnaA?.length || r.columnaB?.length)) {
    return (
      <div className="mt-2.5 grid grid-cols-2 gap-8 text-[14.5px]">
        <ol className="space-y-2">
          {r.columnaA?.map((a) => (
            <li key={a} className="flex gap-2.5">
              <span className="inline-block h-6 w-9 shrink-0 rounded-md border-[1.5px] border-slate-300" />
              <span>
                <TextoMat texto={a} />
              </span>
            </li>
          ))}
        </ol>
        <ul className="space-y-2 border-l border-slate-200 pl-5">
          {r.columnaB?.map((b) => (
            <li key={b}>
              <span className="font-bold text-tinta-600">{b.slice(0, 2)}</span>
              <TextoMat texto={b.slice(2)} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (r.tipo === "abierto") {
    return <Cuadro alto={Math.min(10, Math.max(4, r.lineas || 5)) * 32 + 16} estilo={renglones} />;
  }
  // Problema de desarrollo: cuadrícula de puntos para el procedimiento y cuadro de respuesta.
  return (
    <Cuadro alto={Math.min(290, Math.max(210, (r.lineas || 12) * 17 + 36))} estilo={cuadricula}>
      <div className="absolute bottom-3 right-3 h-[68px] w-[29%] rounded-lg border-[1.5px] border-slate-800 bg-white px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Respuesta</span>
      </div>
    </Cuadro>
  );
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
  const criterios = (actividad.criterios ?? []).filter((c) => c.porcentaje > 0);
  const instrucciones = [...(actividad.instruccionesAlumno ?? []).slice(0, 3), "Al terminar, escanea el QR y envía una foto de cada hoja completa."];
  const fecha = fechaLarga(actividad.fechaAplicacion);
  return (
    <article className="hoja-actividad mx-auto max-w-[8.5in] rounded-xl bg-white px-10 py-9 font-hoja text-slate-800 shadow-md ring-1 ring-slate-200">
      <header className="sin-cortar flex items-stretch gap-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-[74px] w-auto" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-tinta-600">{curso}</p>
              <h1 className="mt-0.5 text-[28px] font-bold leading-[1.1] tracking-tight text-slate-900">{actividad.titulo}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {fecha} · {actividad.reactivos.length} reactivos · {total} puntos
              </p>
            </div>
          </div>
          <div className="mt-auto flex items-end gap-6 pt-5 text-[15px] font-semibold text-slate-800">
            <span className="flex flex-[3] items-end gap-2">
              Nombre <span className="mb-1 flex-1 border-b border-slate-400" />
            </span>
            <span className="flex flex-[2] items-end gap-2">
              Matrícula <span className="mb-1 flex-1 border-b border-slate-400" />
            </span>
          </div>
        </div>
        <div className="flex w-[130px] shrink-0 flex-col justify-between rounded-xl border-[1.5px] border-slate-800 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Calificación</span>
          <span className="text-right text-lg text-slate-500">/ 10</span>
        </div>
        <div className="flex w-[130px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Código QR para entregar" className="h-[100px] w-[100px]" />
          <span className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-slate-500">Escanea para entregar</span>
        </div>
      </header>

      <div className="mt-5 border-t-[3px] border-slate-800" />

      <section className="sin-cortar mt-4">
        <ol className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-[14px] leading-snug text-slate-700">
          {instrucciones.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-tinta-600">{i + 1}</span>
              <span>
                <TextoMat texto={t} />
              </span>
            </li>
          ))}
        </ol>
        {criterios.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="mr-1 font-bold text-slate-900">Evaluación por problema:</span>
            {criterios.map((c) => (
              <span key={c.nombre} className="rounded-full bg-tinta-50 px-3 py-0.5 font-semibold text-tinta-600">
                {c.nombre} {c.porcentaje}%
              </span>
            ))}
          </p>
        )}
      </section>

      <ol className="mt-5 space-y-6">
        {actividad.reactivos.map((r) => (
          <li key={r.numero} className={r.tipo === "desarrollo" || r.tipo === "abierto" ? "" : "sin-cortar"}>
            <div className="flex items-start gap-3 [break-after:avoid] [break-inside:avoid]">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-[15px] font-bold text-white">
                {r.numero}
              </span>
              <div className="min-w-0 flex-1">
                <Enunciado texto={r.enunciado} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full border border-slate-300 px-3 py-0.5 text-[13px] font-bold text-slate-800">
                  {r.puntos} {r.puntos === 1 ? "pt" : "pts"}
                </span>
                {r.ilustracion && (
                  // Dibujo de la IA ya revisado por svgSeguro; como <img> no puede ejecutar nada.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.ilustracion)}`}
                    alt=""
                    className="h-[105px] w-[140px] rounded-lg border border-slate-200 bg-white p-1"
                  />
                )}
              </div>
            </div>
            <div className={r.tipo === "desarrollo" || r.tipo === "abierto" ? "" : "pl-10"}>
              <CuerpoReactivo r={r} />
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-8 flex [break-before:avoid] items-center justify-between text-xs text-slate-500">
        <span>iEureka-Grader</span>
        <span>
          {actividad.titulo} · {fecha}
        </span>
      </footer>
    </article>
  );
}
