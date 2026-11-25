// Retroalimentación de una actividad en plataforma: cada reactivo con lo que contestó el alumno,
// sus puntos y el comentario (en lugar de la hoja fotografiada de las actividades manuscritas).
import { letraDeOpcion, sinLetra } from "@/lib/plataforma";
import type { Actividad, Entrega, Reactivo, RespuestaPlataforma } from "@/lib/tipos";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { TextoMat } from "./texto-mat";
import { VisorArchivos, archivoDeRuta, type ArchivoVisor } from "./visor-archivos";

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Texto de la opción con la letra dada ("b" → "b) 9.8 m/s²"). */
function opcionDe(r: Reactivo, l: string) {
  const i = (r.opciones ?? []).findIndex((o, k) => letraDeOpcion(o, k) === l);
  return i >= 0 ? `${l}) ${sinLetra(r.opciones![i])}` : `${l})`;
}

function Imagenes({ r, letras }: { r: Reactivo; letras: string[] }) {
  return (
    <span className="mt-1 flex flex-wrap gap-2">
      {letras.map((l) => {
        const im = r.imagenes?.[l.charCodeAt(0) - 97];
        return (
          <span key={l} className="w-24 text-center text-xs font-semibold text-slate-600">
            {im && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={svgUrl(im.svg)} alt={`${l})`} className="aspect-[4/3] w-full rounded-md bg-white object-contain ring-1 ring-slate-200" />
            )}
            {l})
          </span>
        );
      })}
    </span>
  );
}

function Respuesta({ r, resp, tr, tx }: { r: Reactivo; resp?: RespuestaPlataforma; tr: Diccionario["profesor"]["reporte"]; tx: Diccionario["alumno"]["responder"] }) {
  const sel = (resp?.seleccion ?? []).map((x) => x.trim().toLowerCase());
  const vacio = <span className="italic text-slate-400">{tr.sinRespuesta}</span>;
  // Evidencia digital (actividad de contenido): Word, Excel, PowerPoint, audio o video se ven con el
  // previsualizador; las fotos, como siempre.
  const evidencia = (resp?.archivos ?? []).map((ruta, i) => archivoDeRuta(ruta, resp?.nombres?.[i])).filter((a): a is ArchivoVisor => Boolean(a));
  if (evidencia.some((a) => a.clase !== "imagen") || (r.tipo !== "desarrollo" && evidencia.length)) {
    return (
      <div className="mt-1">
        <p className="text-xs text-slate-500">{tr.tusArchivos}</p>
        <div className="mt-1">
          <VisorArchivos archivos={evidencia} />
        </div>
      </div>
    );
  }
  switch (r.tipo) {
    case "opcion_multiple":
    case "seleccion_multiple":
      return sel.filter(Boolean).length ? <>{sel.filter(Boolean).map((l) => <span key={l} className="block"><TextoMat texto={opcionDe(r, l)} /></span>)}</> : vacio;
    case "orden":
      return sel.filter(Boolean).length ? (
        <ol className="list-decimal pl-5">
          {sel.filter(Boolean).map((l, i) => (
            <li key={l + i}>
              <TextoMat texto={sinLetra(opcionDe(r, l))} />
            </li>
          ))}
        </ol>
      ) : (
        vacio
      );
    case "verdadero_falso":
      return sel[0] ? <>{sel[0] === "v" ? tx.verdadero : tx.falso}</> : vacio;
    case "si_no":
      return sel[0] ? <>{sel[0] === "s" || sel[0] === "si" || sel[0] === "sí" ? tx.si : tx.no}</> : vacio;
    case "seleccion_imagenes":
      return sel.filter(Boolean).length ? <Imagenes r={r} letras={sel.filter(Boolean)} /> : vacio;
    case "relacion_columnas":
    case "relacion_imagenes": {
      const pares = (r.columnaA ?? []).map((a, i) => ({ a, l: sel[i] })).filter((p) => p.l);
      if (!pares.length) return vacio;
      return (
        <ul className="space-y-1">
          {pares.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span>
                {i + 1}. <TextoMat texto={sinLetra(p.a)} />
              </span>
              <span aria-hidden>→</span>
              {r.tipo === "relacion_imagenes" ? (
                <Imagenes r={r} letras={[p.l]} />
              ) : (
                <TextoMat texto={(() => {
                  const k = p.l.charCodeAt(0) - 97;
                  const b = r.columnaB?.[k];
                  return b ? `${p.l}) ${sinLetra(b)}` : `${p.l})`;
                })()} />
              )}
            </li>
          ))}
        </ul>
      );
    }
    case "desarrollo":
      return resp?.archivos?.length ? (
        <span className="mt-1 block">
          <span className="text-xs text-slate-500">{tr.tusArchivos}</span>
          <span className="mt-1 grid gap-2 sm:grid-cols-2">
            {resp.archivos.map((ruta) => (
              <a key={ruta} href={`/api/archivos/${ruta}`} target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/archivos/${ruta}`} alt={`${tr.reactivo} ${r.numero}`} className="w-full rounded-lg ring-1 ring-slate-200" />
              </a>
            ))}
          </span>
        </span>
      ) : (
        vacio
      );
    default:
      return resp?.texto?.trim() ? <span className="whitespace-pre-wrap">{resp.texto}</span> : vacio;
  }
}

export function RespuestasEntrega({ actividad, entrega, t, puntaje }: { actividad: Actividad; entrega: Entrega; t: Diccionario; puntaje: boolean }) {
  const tr = t.profesor.reporte;
  return (
    <ol className="space-y-4">
      {actividad.reactivos.map((r) => {
        const res = entrega.resultados.find((x) => x.numero === r.numero);
        const resp = entrega.respuestas?.find((x) => x.numero === r.numero);
        const obtenidos = res?.puntosObtenidos ?? 0;
        const completo = obtenidos >= r.puntos;
        const parcial = !completo && obtenidos > 0;
        return (
          <li
            key={r.numero}
            className={`rounded-xl bg-white p-5 text-sm shadow-sm ring-1 ${completo ? "ring-acierto/40" : parcial ? "ring-aviso/40" : "ring-error/40"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-slate-800">
                <span className="font-semibold">{r.numero}. </span>
                <TextoMat texto={r.enunciado} />
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  completo ? "bg-acierto-suave text-acierto" : parcial ? "bg-aviso-suave text-aviso" : "bg-error-suave text-error"
                }`}
              >
                {completo ? "✓" : "✗"}
                {puntaje && ` ${obtenidos}/${r.puntos}`}
              </span>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">{tr.tuRespuesta}</p>
              <div className="mt-0.5 text-slate-800">
                <Respuesta r={r} resp={resp} tr={tr} tx={t.alumno.responder} />
              </div>
            </div>
            {res?.comentario && (
              <p className={`mt-2 text-sm ${completo ? "text-acierto" : "text-error"}`}>
                <TextoMat texto={res.comentario} />
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
