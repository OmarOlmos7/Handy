// Hoja imprimible de una actividad generada con IA. Estilo de referencia del profesor:
// letra Inter, encabezado limpio con logo, calificación y QR; instrucciones en dos columnas;
// criterios de evaluación en etiquetas; cada problema con número y puntaje en un renglón,
// el texto debajo, el dibujo a la derecha, un cuadro de desarrollo en blanco y, al pie,
// un recuadro de RESPUESTA por inciso.
import type { ReactNode } from "react";
import type { Actividad, Reactivo } from "@/lib/tipos";
import { TextoMat } from "./texto-mat";
import { letraDe, respuestasColumnas, respuestasIncisos, separarIncisos } from "@/lib/incisos";

export { separarIncisos };
import { escalaDe } from "@/lib/estadisticas";
import { fechaLarga } from "./ui";

/** Planteamiento e incisos con la letra resaltada. */
function Enunciado({ texto }: { texto: string }) {
  const { planteamiento, incisos } = separarIncisos(texto);
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

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Recuadro en blanco (sin rejilla ni renglones) donde el alumno escribe. Con la solución, crece con su contenido. */
function Cuadro({ alto, crecer = false, children }: { alto: number; crecer?: boolean; children?: ReactNode }) {
  return (
    <div className="sin-cortar relative mt-3 rounded-xl border border-slate-300" style={crecer ? { minHeight: alto } : { height: alto }}>
      {children}
    </div>
  );
}

/** Tinta de la solución propuesta: azul, con la misma tipografía de la hoja. */
const TINTA = "text-[#1d43c9]";

function CuerpoReactivo({ r, solucion }: { r: Reactivo; solucion: boolean }) {
  if (r.tipo === "opcion_multiple" && r.opciones?.length) {
    const correcta = solucion && r.respuesta.trim() ? letraDe(r.respuesta) : undefined;
    return (
      <ul className="mt-2.5 grid grid-cols-2 gap-x-8 gap-y-2 text-[14.5px]">
        {r.opciones.map((o) => (
          <li key={o} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 inline-block h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] ${
                correcta === letraDe(o) ? "border-[#1d43c9] bg-[#1d43c9]" : "border-slate-400"
              }`}
            />
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
    const correcta = solucion ? r.respuesta.trim().charAt(0).toUpperCase() : "";
    return (
      <p className="mt-2.5 flex gap-3 text-sm font-semibold text-slate-500">
        {["V", "F"].map((v) => (
          <span
            key={v}
            className={`rounded-lg border-[1.5px] px-4 py-1 ${correcta === v ? `border-[#1d43c9] bg-[#1d43c9]/10 ${TINTA}` : "border-slate-300"}`}
          >
            {v}
          </span>
        ))}
      </p>
    );
  }
  if ((r.tipo === "relacion_columnas" || r.tipo === "parentesis") && (r.columnaA?.length || r.columnaB?.length)) {
    const claves = solucion ? respuestasColumnas(r) : [];
    return (
      <div className="mt-2.5 grid grid-cols-2 gap-8 text-[14.5px]">
        <ol className="space-y-2">
          {r.columnaA?.map((a, i) => (
            <li key={a} className="flex gap-2.5">
              <span
                className={`inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md border-[1.5px] border-slate-300 text-[14px] font-bold ${TINTA}`}
              >
                {claves[i] ?? ""}
              </span>
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
    return (
      <Cuadro alto={Math.min(10, Math.max(4, r.lineas || 5)) * 32 + 16} crecer={solucion}>
        {solucion && r.respuesta.trim() && (
          <div className={`whitespace-pre-line p-4 text-[14.5px] leading-relaxed ${TINTA}`}>
            <TextoMat texto={r.respuesta} negritas="font-semibold" />
          </div>
        )}
      </Cuadro>
    );
  }
  // Problema de desarrollo: espacio en blanco para el procedimiento y, al pie, los recuadros de
  // respuesta de cada inciso repartidos a lo ancho (o uno solo si el problema no tiene incisos).
  const letras = separarIncisos(r.enunciado).incisos.map((inc) => inc.slice(0, 2));
  const filas = Math.ceil(Math.max(1, letras.length) / 4);
  if (solucion) return <DesarrolloResuelto r={r} letras={letras} alto={Math.min(290, Math.max(210, (r.lineas || 12) * 17 + 36))} />;
  return (
    <Cuadro alto={Math.min(290, Math.max(210, (r.lineas || 12) * 17 + 36)) + (filas - 1) * 72} >
      <div
        className={`absolute bottom-3 grid gap-2.5 ${letras.length > 1 ? "left-3 right-3" : "right-3 w-[29%]"}`}
        style={letras.length > 1 ? { gridTemplateColumns: `repeat(${Math.min(4, letras.length)}, minmax(0, 1fr))` } : undefined}
      >
        {(letras.length ? letras : [""]).map((letra) => (
          <div key={letra || "unica"} className="relative h-[64px] rounded-lg border-[1.5px] border-slate-800 bg-white">
            <span className="absolute bottom-1.5 left-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Respuesta{letra && <span className="ml-1 normal-case tracking-normal text-tinta-600 text-[12px]">{letra}</span>}
            </span>
          </div>
        ))}
      </div>
    </Cuadro>
  );
}

/** Problema de desarrollo con la solución propuesta: el procedimiento en el cuadro y la respuesta en sus recuadros. */
function DesarrolloResuelto({ r, letras, alto }: { r: Reactivo; letras: string[]; alto: number }) {
  const respuesta = respuestasIncisos(r.enunciado, r.respuesta);
  const recuadro = (clave: string, letra: string, texto: string) => (
    <div key={clave} className="flex min-h-[64px] flex-col justify-between rounded-lg border-[1.5px] border-slate-800 bg-white px-2.5 pb-1.5 pt-2">
      <span className={`text-[14px] leading-snug ${TINTA}`}>
        <TextoMat texto={texto} negritas="font-semibold" />
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Respuesta{letra && <span className="ml-1 text-[12px] normal-case tracking-normal text-tinta-600">{letra}</span>}
      </span>
    </div>
  );
  return (
    <Cuadro alto={alto} crecer>
      <div className="flex min-h-[inherit] flex-col justify-between gap-4 p-4">
        {r.solucionPasos?.length ? (
          <ol className={`space-y-1.5 text-[14.5px] leading-relaxed ${TINTA}`}>
            {r.solucionPasos.map((p, i) => (
              <li key={i}>
                <TextoMat texto={p} negritas="font-semibold" />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">La solución no trae procedimiento; revisa la respuesta final.</p>
        )}
        {"letras" in respuesta ? (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(4, respuesta.letras.length)}, minmax(0, 1fr))` }}>
            {respuesta.letras.map((letra, i) => recuadro(letra, letra, respuesta.textos[i]))}
          </div>
        ) : (
          <div className={letras.length > 1 ? "" : "ml-auto w-[45%]"}>
            {recuadro("unica", "", respuesta.completa)}
          </div>
        )}
      </div>
    </Cuadro>
  );
}

export function HojaActividad({
  actividad,
  curso,
  qrSrc,
  solucion = false,
}: {
  actividad: Actividad;
  curso: string;
  /** Sin QR (por ejemplo, al mostrar la solución), el recuadro dice "Solución propuesta". */
  qrSrc?: string;
  /** Muestra la solución propuesta escrita sobre la hoja. */
  solucion?: boolean;
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
              Nombre{" "}
              <span className={`mb-1 flex-1 border-b border-slate-400 text-[15px] ${TINTA}`}>{solucion ? "Solución propuesta" : ""}</span>
            </span>
            <span className="flex flex-[2] items-end gap-2">
              Matrícula <span className="mb-1 flex-1 border-b border-slate-400" />
            </span>
          </div>
        </div>
        <div className="flex w-[130px] shrink-0 flex-col justify-between rounded-xl border-[1.5px] border-slate-800 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Calificación</span>
          <span className="text-right text-lg text-slate-500">/ {escalaDe(actividad)}</span>
        </div>
        {qrSrc && (
          <div className="flex w-[130px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Código QR para entregar" className="h-[100px] w-[100px]" />
            <span className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-slate-500">Escanea para entregar</span>
          </div>
        )}
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
            {/* Número y puntos en un renglón; el texto debajo, alineado con el número; el dibujo
                a la derecha ocupa la altura de todo el bloque. */}
            <div className="flex items-stretch gap-4 [break-after:avoid] [break-inside:avoid]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-[15px] font-bold text-white">
                    {r.numero}
                  </span>
                  <span className="rounded-full border border-slate-300 px-3 py-0.5 text-[13px] font-bold text-slate-800">
                    {r.puntos} {r.puntos === 1 ? "pt" : "pts"}
                  </span>
                </div>
                <div className="mt-2">
                  <Enunciado texto={r.enunciado} />
                </div>
              </div>
              {r.ilustracion && r.ubicacionIlustracion !== "abajo" && (
                <div className="relative min-h-[120px] w-[190px] shrink-0 rounded-lg border border-slate-200 bg-white">
                  {/* Dibujo de la IA ya revisado por svgSeguro; como <img> no puede ejecutar nada. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svgUrl(r.ilustracion)} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" />
                </div>
              )}
            </div>
            {r.ilustracion && r.ubicacionIlustracion === "abajo" && (
              // Gráfica más grande debajo del enunciado, para que el alumno lea los datos.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={svgUrl(r.ilustracion)} alt="" className="sin-cortar mx-auto mt-3 block h-[200px] w-[320px] rounded-lg border border-slate-200 bg-white p-1.5" />
            )}
            <div>
              <CuerpoReactivo r={r} solucion={solucion} />
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
