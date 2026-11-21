// Actividades en plataforma: el alumno responde los reactivos en la app (web o celular).
// Los reactivos cerrados se califican aquí, por código y sin créditos; solo las respuestas
// escritas (abiertas) y los desarrollos con archivo o foto van a la IA.
import { esCerrado, letras, puntosReactivoCerrado } from "./calificar";
import { creditosPorPagina, sumarCreditos } from "./configuracion";
import type { Actividad, FormatoActividad, Grupo, PrecisionIA, Reactivo, RespuestaPlataforma, ResultadoReactivo, TipoReactivo } from "./tipos";
import { letraVersion, letrasVersiones } from "./versiones";

export const MAX_ARCHIVOS_REACTIVO = 5;
export const LARGO_RESPUESTA = 4000;

/** Tipos de reactivo que se pueden pedir en plataforma, en el orden en que se muestran. */
export const TIPOS_EN_PLATAFORMA: TipoReactivo[] = [
  "opcion_multiple",
  "seleccion_multiple",
  "verdadero_falso",
  "si_no",
  "relacion_columnas",
  "orden",
  "numerica",
  "abierto",
  "relacion_imagenes",
  "seleccion_imagenes",
  "desarrollo",
];

export function esPlataforma(act: Pick<Actividad, "formato">): boolean {
  return act.formato === "plataforma";
}

export function leerFormato(v: unknown): FormatoActividad {
  return v === "plataforma" ? "plataforma" : "manuscrita";
}

/** true si el reactivo lo califica la IA (respuesta escrita o desarrollo con archivo). */
export function vaALaIA(r: Pick<Reactivo, "tipo">) {
  return !esCerrado(r);
}

/** Letra de la opción i (0 → "a"). */
export const letra = (i: number) => String.fromCharCode(97 + i);

/** Letra al inicio de una opción impresa ("b) 9.8 m/s²" → "b"); si no trae, la de su posición. */
export function letraDeOpcion(texto: string, i: number) {
  const m = texto.trim().match(/^\(?([a-zA-Z])[).]\s/);
  return m ? m[1].toLowerCase() : letra(i);
}

/** Texto de la opción sin su letra ("b) 9.8 m/s²" → "9.8 m/s²"). */
export function sinLetra(texto: string) {
  return texto.trim().replace(/^\(?[a-zA-Z][).]\s+/, "").replace(/^\d+[.)]\s+/, "");
}

/**
 * Lo que respondió el alumno, en el mismo formato que la clave de la rúbrica, para calificarlo
 * por código y mostrarlo en la retroalimentación.
 */
export function respuestaComoTexto(r: Reactivo, resp: RespuestaPlataforma | undefined): string {
  if (!resp) return "";
  const sel = (resp.seleccion ?? []).map((x) => x.trim()).filter(Boolean);
  switch (r.tipo) {
    case "opcion_multiple":
    case "verdadero_falso":
    case "si_no":
      return sel[0] ?? "";
    case "seleccion_multiple":
    case "seleccion_imagenes":
    case "orden":
      return sel.join(", ");
    case "relacion_columnas":
    case "relacion_imagenes":
      // Una letra por elemento de la columna A, en orden: "1-c, 2-a".
      return (resp.seleccion ?? [])
        .map((l, i) => (l.trim() ? `${i + 1}-${l.trim().toLowerCase()}` : ""))
        .filter(Boolean)
        .join(", ");
    case "numerica":
    case "abierto":
      return (resp.texto ?? "").trim();
    default:
      return "";
  }
}

/** true si el alumno contestó el reactivo (texto, selección o archivo). */
export function contestado(r: Reactivo, resp: RespuestaPlataforma | undefined) {
  if (!resp) return false;
  if (r.tipo === "desarrollo") return Boolean(resp.archivos?.length);
  return respuestaComoTexto(r, resp).length > 0;
}

/**
 * Resultados que se calculan sin IA: los cerrados (contra la clave) y los abiertos o desarrollos
 * que quedaron en blanco (0 puntos). Los demás se devuelven aparte para la IA.
 */
export function calificarSinIA(
  act: Actividad,
  respuestas: RespuestaPlataforma[],
  comentarios: { correcto: string; correcta: string; sinRespuesta: string },
): { resultados: ResultadoReactivo[]; paraIA: Reactivo[] } {
  const resultados: ResultadoReactivo[] = [];
  const paraIA: Reactivo[] = [];
  for (const r of act.reactivos) {
    const resp = respuestas.find((x) => x.numero === r.numero);
    const leida = respuestaComoTexto(r, resp);
    if (vaALaIA(r)) {
      if (contestado(r, resp)) paraIA.push(r);
      else resultados.push({ numero: r.numero, puntosObtenidos: 0, respuestaLeida: "", confianza: "alta", comentario: comentarios.sinRespuesta });
      continue;
    }
    const puntos = puntosReactivoCerrado(r, leida) ?? 0;
    resultados.push({
      numero: r.numero,
      puntosObtenidos: puntos,
      respuestaLeida: leida,
      confianza: "alta",
      comentario: !leida ? comentarios.sinRespuesta : puntos >= r.puntos ? comentarios.correcto : comentarios.correcta.replace("{r}", r.respuesta),
    });
  }
  return { resultados, paraIA };
}

/**
 * Créditos de evaluar con IA una entrega en plataforma: cada archivo o foto cuenta como una
 * página y todas las respuestas escritas juntas, como una más. Los cerrados no cuestan.
 */
export function creditosPlataforma(act: Actividad, respuestas: RespuestaPlataforma[], precision?: PrecisionIA): number {
  const paraIA = act.reactivos.filter((r) => vaALaIA(r) && contestado(r, respuestas.find((x) => x.numero === r.numero)));
  const archivos = paraIA.filter((r) => r.tipo === "desarrollo").reduce((s, r) => s + (respuestas.find((x) => x.numero === r.numero)?.archivos?.length ?? 0), 0);
  const textos = paraIA.some((r) => r.tipo !== "desarrollo") ? 1 : 0;
  return sumarCreditos((archivos + textos) * creditosPorPagina(precision ?? act.precision));
}

/**
 * Versión que le toca a un alumno en plataforma: se reparten por su lugar en la lista del grupo
 * (A, B, C, A, B…), así quienes están juntos en la lista tienen versiones distintas.
 */
export function versionDeAlumno(act: Pick<Actividad, "versiones">, grupo: Pick<Grupo, "alumnos">, matricula: string): string | undefined {
  const n = letrasVersiones(act).length;
  if (n <= 1) return undefined;
  const i = grupo.alumnos.findIndex((a) => a.matricula === matricula);
  const letraV = letraVersion((i < 0 ? grupo.alumnos.length : i) % n);
  return letraV === "A" ? undefined : letraV;
}

/** Limpia lo que manda el navegador: solo reactivos de la actividad, textos acotados y letras válidas. */
export function limpiarRespuestas(act: Actividad, crudas: unknown): RespuestaPlataforma[] {
  if (!Array.isArray(crudas)) return [];
  const salida: RespuestaPlataforma[] = [];
  for (const c of crudas) {
    if (!c || typeof c !== "object") continue;
    const numero = Number((c as { numero?: unknown }).numero);
    const r = act.reactivos.find((x) => x.numero === numero);
    if (!r || salida.some((x) => x.numero === numero)) continue;
    const texto = (c as { texto?: unknown }).texto;
    const seleccion = (c as { seleccion?: unknown }).seleccion;
    const resp: RespuestaPlataforma = { numero };
    if (typeof texto === "string" && (r.tipo === "abierto" || r.tipo === "numerica")) resp.texto = texto.slice(0, r.tipo === "numerica" ? 40 : LARGO_RESPUESTA);
    if (Array.isArray(seleccion)) {
      resp.seleccion = seleccion
        .slice(0, 30)
        .map((x) => (typeof x === "string" ? x.trim().slice(0, 4) : ""))
        // V/F y Sí/No llegan como texto; lo demás son letras.
        .map((x) => (r.tipo === "verdadero_falso" || r.tipo === "si_no" ? x : letras(x)[0] ?? ""));
    }
    salida.push(resp);
  }
  return salida;
}

/** Lo que ve el alumno de un reactivo: sin la clave, la solución ni la rúbrica. */
export interface ReactivoAlumno {
  numero: number;
  tipo: TipoReactivo;
  enunciado: string;
  puntos: number;
  opciones?: string[];
  columnaA?: string[];
  columnaB?: string[];
  /** Solo los dibujos: la descripción podría revelar la respuesta. */
  imagenes?: string[];
  ilustracion?: string;
  ubicacionIlustracion?: "derecha" | "abajo";
  lineas?: number;
}

export function reactivosParaAlumno(act: Pick<Actividad, "reactivos">): ReactivoAlumno[] {
  return act.reactivos.map((r) => ({
    numero: r.numero,
    tipo: r.tipo,
    enunciado: r.enunciado,
    puntos: r.puntos,
    opciones: r.opciones,
    columnaA: r.columnaA,
    columnaB: r.columnaB,
    imagenes: r.imagenes?.map((im) => im.svg),
    ilustracion: r.ilustracion,
    ubicacionIlustracion: r.ubicacionIlustracion,
    lineas: r.lineas,
  }));
}
