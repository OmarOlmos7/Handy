// Llamadas a la API de Claude (visión) para la rúbrica y la evaluación.
// Los números finales (puntos, calificación) los calcula el código; Claude lee
// las hojas, compara procedimientos y redacta la retroalimentación.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { leerAhora, modificar } from "./almacen";
import { consumoDeRespuesta } from "./admin";
import { esCerrado, incisosCerrado, puntosReactivoCerrado } from "./calificar";
import { parametrosIA } from "./configuracion";
import { DOMINIOS_RECURSOS, extraerJson, limpiarRecursos } from "./recursos";
import { svgSeguro } from "./svg";
import { formato, type Idioma } from "./i18n/idiomas";
import { idiomaDeActividad } from "./i18n/detectar";
import { criteriosDelReactivo, fraccionCriterios, reactivosDelCriterio } from "./elementos";
import { diccionarioDe } from "./i18n/diccionario";
import type { Actividad, CriterioEvaluacion, Escala, PrecisionIA, Reactivo, RecomendacionesEstudio, RecursoEstudio, ResultadoReactivo, TipoConsumoIA } from "./tipos";

export class ErrorIA extends Error {}

// Nombre alterno para la llave: algunos entornos (por ejemplo, la nube de Claude Code)
// reservan las variables ANTHROPIC_* y no las pasan a los procesos.
const LLAVE_ALTERNA = process.env.RETROALIMENTA_CLAUDE_KEY;

export function iaDisponible() {
  return Boolean(LLAVE_ALTERNA || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function cliente() {
  if (!iaDisponible()) {
    throw new ErrorIA(
      "Falta la llave de la API de Claude. Agrega ANTHROPIC_API_KEY en el archivo .env.local y reinicia el servidor.",
    );
  }
  // Con la llave alterna se fija la URL oficial para no heredar un ANTHROPIC_BASE_URL ajeno.
  return LLAVE_ALTERNA ? new Anthropic({ apiKey: LLAVE_ALTERNA, baseURL: "https://api.anthropic.com" }) : new Anthropic();
}

export interface ImagenParaIA {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "application/pdf";
}

function bloquesImagen(imagenes: ImagenParaIA[], etiqueta: string): Anthropic.Beta.BetaContentBlockParam[] {
  return imagenes.flatMap((img, i): Anthropic.Beta.BetaContentBlockParam[] => [
    { type: "text", text: `${etiqueta} · archivo ${i + 1}:` },
    img.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: img.base64 } }
      : { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } },
  ]);
}

/** A quién se carga el consumo de tokens de una llamada (solo IDs, nunca datos del alumno). */
export interface UsoIA {
  profesorId?: string;
  actividadId?: string;
  /** Motor y esfuerzo; si falta, se toma de la actividad guardada (o el predeterminado, Medio). */
  precision?: PrecisionIA;
  /** Idioma en que la IA redacta; si falta, el de la actividad. */
  idioma?: Idioma;
}

/**
 * Idioma de la llamada: el indicado; si no, el de la actividad (el elegido al darla de alta o, en
 * actividades anteriores, el de su texto). El idioma de las pantallas del profesor no cuenta aquí:
 * solo cambia los textos de la interfaz. Sin nada, las indicaciones base (español).
 */
function idiomaDe(uso: UsoIA): Idioma | undefined {
  if (uso.idioma) return uso.idioma;
  if (!uso.actividadId) return undefined;
  try {
    const act = leerAhora().actividades.find((a) => a.id === uso.actividadId);
    return act && idiomaDeActividad(act);
  } catch {
    return undefined;
  }
}

/** Nombre del idioma para las indicaciones de la IA (las indicaciones van en español). */
const IDIOMA_PARA_IA: Record<Idioma, string> = {
  es: "español de México",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  ja: "japonés",
  pt: "portugués de Brasil",
  zh: "chino simplificado",
};

/**
 * Indicación de idioma que se agrega al final de las instrucciones. En español no cambia nada;
 * en otro idioma reemplaza las menciones al español de las instrucciones base.
 */
export function indicacionIdioma(idioma: Idioma | undefined): string {
  if (!idioma || idioma === "es") return "";
  const nombre = IDIOMA_PARA_IA[idioma];
  return (
    `\n\nIDIOMA: escribe en ${nombre} todo el texto que leerán el profesor o el alumno (títulos, instrucciones, enunciados, opciones, respuestas, ` +
    `pasos, comentarios, temas, habilidades, criterios, recomendaciones y búsquedas). Esta indicación reemplaza cualquier mención anterior al español ` +
    `o a México; usa la notación matemática habitual en ${nombre} (por ejemplo \\sin en lugar de \\operatorname{sen}) y deja las fórmulas en LaTeX.`
  );
}

/** Precisión de la llamada: la indicada o la de la actividad. */
function precisionDe(uso: UsoIA): PrecisionIA | undefined {
  if (uso.precision) return uso.precision;
  if (!uso.actividadId) return undefined;
  try {
    return leerAhora().actividades.find((a) => a.id === uso.actividadId)?.precision;
  } catch {
    return undefined;
  }
}

/** Anota los tokens de la llamada para el panel de administración; si falla, no detiene la llamada. */
function anotarConsumo(tipo: TipoConsumoIA, uso: UsoIA, respuesta: { model: string; usage: Anthropic.Beta.BetaUsage }, ok: boolean) {
  try {
    const consumo = consumoDeRespuesta(tipo, uso, respuesta, ok);
    modificar((db) => {
      (db.consumoIA ??= []).push(consumo);
    });
  } catch (e) {
    console.error("No se pudo anotar el consumo de la IA", e);
  }
}

async function pedir<T>(params: {
  tipo: TipoConsumoIA;
  uso: UsoIA;
  system: string;
  contenido: Anthropic.Beta.BetaContentBlockParam[];
  esquema: z.ZodType<T>;
}): Promise<T> {
  const { modelo, esfuerzo } = parametrosIA(precisionDe(params.uso));
  // Si un clasificador de seguridad rechaza la petición, la API la reintenta con otro modelo
  // (el motor Rápido no tiene ese respaldo).
  const respaldo = modelo.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  let respuesta;
  try {
    respuesta = await cliente().beta.messages.parse({
      model: modelo,
      max_tokens: 16000,
      ...respaldo,
      output_config: { effort: esfuerzo, format: betaZodOutputFormat(params.esquema) },
      system: params.system + indicacionIdioma(idiomaDe(params.uso)),
      messages: [{ role: "user", content: params.contenido }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ErrorIA("La llave de la API de Claude no es válida.");
    if (e instanceof Anthropic.RateLimitError) throw new ErrorIA("Límite de uso de la API alcanzado. Intenta en un minuto.");
    if (e instanceof Anthropic.APIError) throw new ErrorIA(`Error de la API de Claude (${e.status ?? "red"}): ${e.message}`);
    throw e;
  }
  anotarConsumo(params.tipo, params.uso, respuesta, Boolean(respuesta.parsed_output) && respuesta.stop_reason !== "refusal" && respuesta.stop_reason !== "max_tokens");
  if (respuesta.stop_reason === "refusal") throw new ErrorIA("La IA no pudo procesar estas imágenes.");
  if (respuesta.stop_reason === "max_tokens") throw new ErrorIA("La respuesta de la IA quedó incompleta.");
  if (!respuesta.parsed_output) throw new ErrorIA("La IA devolvió un formato inesperado.");
  return respuesta.parsed_output as T;
}

// ---------- Rúbrica a partir de la solución del profesor ----------

const TIPOS = ["verdadero_falso", "opcion_multiple", "relacion_columnas", "parentesis", "desarrollo", "abierto"] as const;

const EsquemaRubrica = z.object({
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      tipo: z.enum(TIPOS),
      enunciado: z.string(),
      respuesta: z.string(),
      puntos: z.number(),
      tema: z.string(),
      habilidad: z.string(),
      pagina: z.number().int(),
      y: z.number(),
      pasos: z.array(z.object({ nombre: z.string(), peso: z.number() })),
      solucionPasos: z.array(z.string()),
    }),
  ),
  criterios: z.array(z.object({ nombre: z.string(), porcentaje: z.number(), descripcion: z.string(), reactivos: z.array(z.number().int()) })),
  recomendaciones: z.array(z.string()),
});

const SISTEMA_RUBRICA = `Eres un asistente de evaluación para profesores de secundaria y bachillerato en México.
Recibes las páginas escaneadas de una actividad impresa resuelta a mano por el profesor. Tu tarea es convertirla en una rúbrica.

Para cada reactivo, en el orden en que aparece:
- numero: el número del reactivo tal como está en la hoja.
- tipo: verdadero_falso, opcion_multiple, relacion_columnas, parentesis, desarrollo (problemas matemáticos, algoritmos o procedimientos) o abierto (ensayo, explicación, dibujo o boceto).
- enunciado: el texto impreso del reactivo, breve.
- respuesta: la respuesta del profesor. Opción múltiple: la letra y el texto, como "c) m/s²". Verdadero o falso: "V" o "F". Relación de columnas: pares como "1-c, 2-a, 3-b". Paréntesis: las letras en orden, como "(b) (a) (c)". Desarrollo: el resultado final con unidades. Abierto: los criterios que debe cumplir la respuesta.
- puntos: el valor del reactivo si está escrito en la hoja; si no, 1 para cerrados, 2 para abiertos y 3 para desarrollos.
- tema y habilidad: etiquetas cortas en español (tema de la materia; habilidad como "Comprensión de conceptos", "Resolución de problemas", "Interpretación de gráficas", "Comunicación escrita").
- pagina (desde 1) e y: posición vertical aproximada del inicio del reactivo en esa página, de 0 (arriba) a 1 (abajo).
- pasos: solo para desarrollo. La estructura que siguió el profesor (por ejemplo Datos, Ecuación, Sustitución, Desarrollo, Resultado con unidades), con pesos que sumen 1. Respeta la estructura que use el profesor. Para los demás tipos, lista vacía.
- solucionPasos: solo para desarrollo. Una línea por paso con lo que escribió el profesor. Para los demás tipos, lista vacía.

Las indicaciones del profesor pueden traer criterios de evaluación con porcentajes (por ejemplo "Procedimiento 60 %, Resultado 30 %, Limpieza 10 %") y recomendaciones para calificar. Entre las imágenes también puede venir una hoja con su rúbrica o sus criterios; esa hoja no es un reactivo.
- criterios: los criterios que indicó el profesor, con su porcentaje (0 si no dio porcentaje) y una descripción breve de qué se evalúa. Si no indicó criterios, lista vacía; no los inventes. reactivos: los números de los reactivos que califica ese criterio (por ejemplo, los criterios del "Ejercicio 2" solo califican el reactivo 2); lista vacía si aplica a todos.
- Si los criterios aplican a los desarrollos (procedimiento, resultado, unidades…), refléjalos en los pasos y sus pesos. Si indicó cuántos puntos vale cada reactivo, respétalo.
- recomendaciones: las recomendaciones que dio el profesor para evaluar, una por elemento, redactadas de forma breve e imperativa (por ejemplo "Acepta procedimientos alternativos si son correctos"). Si no dio ninguna, lista vacía.

Si algo es ilegible, escribe tu mejor lectura y menciónalo en el enunciado entre corchetes.`;

export interface PropuestaRubrica {
  reactivos: Reactivo[];
  criterios: CriterioEvaluacion[];
  recomendaciones: string[];
}

const NOTA_SIN_SOLUCION = `

ACTIVIDAD SIN SOLUCIÓN: es una producción escrita, un ensayo o un análisis. Se valora la composición escrita y sus elementos de contenido, coherencia y lingüísticos (ortografía, gramática, vocabulario, puntuación), no una respuesta única.`;

const NOTA_RUBRICA_SIN_SOLUCION = `${NOTA_SIN_SOLUCION}
Las páginas que recibes son la actividad en blanco, sin resolver. Para cada reactivo usa tipo "abierto" (salvo los cerrados que sí tengan respuesta única) y en respuesta escribe los criterios que debe cumplir la producción del alumno. Si el profesor no dio criterios, propón tres con porcentajes: Contenido, Coherencia y Elementos lingüísticos.`;

export async function proponerRubrica(
  imagenes: ImagenParaIA[],
  datos: { titulo: string; instrucciones?: string; sinSolucion?: boolean },
  uso: UsoIA,
): Promise<PropuestaRubrica> {
  const salida = await pedir({
    tipo: "rubrica",
    uso,
    system: SISTEMA_RUBRICA + (datos.sinSolucion ? NOTA_RUBRICA_SIN_SOLUCION : ""),
    esquema: EsquemaRubrica,
    contenido: [
      ...bloquesImagen(imagenes, datos.sinSolucion ? "Actividad en blanco" : "Solución del profesor"),
      {
        type: "text",
        text: `Actividad: ${datos.titulo}\nIndicaciones del profesor: ${datos.instrucciones?.trim() || "ninguna"}\n\nGenera la rúbrica.`,
      },
    ],
  });
  return normalizarRubrica(salida);
}

function normalizarRubrica(salida: z.infer<typeof EsquemaRubrica>): PropuestaRubrica {
  const reactivos = salida.reactivos.map((r, i) => {
    const sumaPesos = r.pasos.reduce((s, p) => s + p.peso, 0) || 1;
    return {
      ...r,
      numero: r.numero || i + 1,
      puntos: r.puntos > 0 ? r.puntos : 1,
      pagina: Math.max(1, r.pagina),
      y: Math.max(0, Math.min(1, r.y)),
      pasos: r.tipo === "desarrollo" && r.pasos.length ? r.pasos.map((p) => ({ ...p, peso: p.peso / sumaPesos })) : undefined,
      solucionPasos: r.tipo === "desarrollo" && r.solucionPasos.length ? r.solucionPasos : undefined,
    };
  });
  return {
    reactivos,
    criterios: salida.criterios
      .filter((c) => c.nombre.trim())
      .map(normalizarCriterio),
    recomendaciones: salida.recomendaciones.filter((r) => r.trim()),
  };
}

/**
 * Une la rúbrica nueva con los reactivos que ya tenía la actividad (por número), para no
 * perder lo que se imprime en la hoja: opciones, columnas y renglones.
 */
export function unirConHoja(anteriores: Reactivo[], nuevos: Reactivo[]): Reactivo[] {
  return nuevos.map((r) => {
    const a = anteriores.find((x) => x.numero === r.numero);
    return a ? { ...r, opciones: a.opciones, columnaA: a.columnaA, columnaB: a.columnaB, lineas: a.lineas, ilustracion: a.ilustracion } : r;
  });
}

// ---------- Actividad nueva generada con IA ----------


const EsquemaActividad = z.object({
  instrucciones: z.array(z.string()),
  criterios: z.array(z.object({ nombre: z.string(), porcentaje: z.number(), descripcion: z.string(), reactivos: z.array(z.number().int()) })),
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      tipo: z.enum(TIPOS),
      enunciado: z.string(),
      opciones: z.array(z.string()),
      columnaA: z.array(z.string()),
      columnaB: z.array(z.string()),
      puntos: z.number(),
      tema: z.string(),
      habilidad: z.string(),
      lineas: z.number().int(),
      ilustracion: z.string(),
      ubicacionIlustracion: z.enum(["derecha", "abajo"]),
    }),
  ),
});

const SISTEMA_ACTIVIDAD = `Eres un diseñador de actividades para profesores de secundaria y bachillerato en México.
El profesor describe la actividad que quiere: tipos de reactivos, ponderaciones (puntos o porcentajes), temas, nivel y cualquier otra condición. Diseña una actividad impresa para que el alumno la resuelva a mano y la entregue con una foto.

Reglas:
- Respeta exactamente lo que pide el profesor: cantidad y tipo de reactivos, temas y puntos. Si indica los puntos de cada reactivo, úsalos tal cual aunque el total no coincida con la escala. Si no indica puntos o da porcentajes, reparte los puntos para que el total sea igual a la escala de calificación indicada (100 o 10), salvo que pida otro total.
- instrucciones: exactamente 3 instrucciones breves para el alumno (máximo 20 palabras cada una), en imperativo. Marca con **doble asterisco** las palabras clave (por ejemplo "Resuelve en orden: **datos** con unidades → **ecuaciones** → **desarrollo** → **respuesta** en recuadro."). Incluye cómo responder cada tipo de reactivo que uses, unidades y redondeo si aplica. No menciones puntos ni porcentajes (la hoja ya los muestra) ni la instrucción de escanear el QR.
- criterios: cómo se evalúa cada problema, con porcentajes que sumen 100. reactivos: los números de los reactivos que califica cada criterio; lista vacía si aplica a todos. Usa los que indique el profesor; si no indica y hay problemas de desarrollo, propón algo como Datos 5 %, Ecuaciones 15 %, Desarrollo 60 %, Respuesta 20 %. Si solo hay reactivos cerrados, lista vacía. descripcion: qué se evalúa, breve.
- tipo: verdadero_falso, opcion_multiple, relacion_columnas, parentesis (relación con letras entre paréntesis), desarrollo (problemas con procedimiento) o abierto (explicación, ensayo, dibujo).
- enunciado: el texto completo del reactivo, listo para imprimirse. No incluyas las opciones dentro del enunciado. Nunca escribas los puntos ni la ponderación dentro del enunciado: la hoja los muestra aparte. Si un problema tiene varias preguntas, escribe primero el planteamiento con sus datos y al final los incisos en orden: "a) … b) … c) …". Sé eficiente con las palabras: si los incisos comparten el verbo, escríbelo una sola vez antes de los incisos y no lo repitas (por ejemplo "Calcula: a) El momento de inercia del disco. b) El torque respecto al eje. c) La aceleración angular."). Sé conciso: planteamientos de máximo 45 palabras y hasta 3 incisos por problema, salvo que el profesor pida otra cosa. La actividad debe caber en las páginas tamaño carta indicadas (cada problema de desarrollo ocupa casi media página).
- opciones: solo para opción múltiple, de 3 a 5 opciones con su letra, como "a) 9.8 m/s²". Para los demás tipos, lista vacía.
- columnaA y columnaB: solo para relación de columnas y paréntesis. columnaA numerada ("1. Inercia"), columnaB con letras ("a) Resistencia de un cuerpo a cambiar su movimiento"); mezcla el orden de columnaB. El alumno escribe la letra de columnaB junto a cada elemento de columnaA. Para los demás, listas vacías.
- ilustracion: solo si el profesor pide una ilustración, figura, gráfica, diagrama o esquema para el reactivo (puede pedirla para cualquier tipo, también opción múltiple). Si no la pide para ese reactivo, cadena vacía: no agregues dibujos por tu cuenta. Cuando la pida, dibújala en SVG: un solo elemento <svg> con xmlns="http://www.w3.org/2000/svg", viewBox="0 0 160 120" si va a la derecha o viewBox="0 0 320 200" si va abajo; solo figuras simples (line, rect, circle, ellipse, path, polygon, polyline, text); trazo #1e293b de 1.5 a 2, acentos en #2554e8; etiquetas cortas en font-family="Arial" de 10 a 12 px. En gráficas, dibuja ejes con su nombre y unidades (por ejemplo "t (s)", "x (m)"), marcas con valores legibles y una cuadrícula tenue (#e2e8f0) si ayuda a leer datos; los valores deben ser exactos y coherentes con el enunciado. Sin imágenes, scripts, enlaces ni estilos externos. No pongas la respuesta en el dibujo, salvo que el reactivo sea leer la gráfica.
- ubicacionIlustracion: dónde va el dibujo, como lo indique el profesor: "derecha" (pequeño, a la derecha del texto) o "abajo" (más grande, debajo del enunciado, recomendado para gráficas que el alumno debe leer). Si no indica, "derecha" para esquemas y "abajo" para gráficas con datos. Sin dibujo, "derecha"
- lineas: tamaño del espacio para responder: 0 para reactivos cerrados, de 4 a 8 para abiertos y de 10 a 16 para desarrollo (más incisos, más espacio).
- puntos, tema (de la materia) y habilidad ("Comprensión de conceptos", "Resolución de problemas", "Interpretación de gráficas", "Comunicación escrita", etc.).
- Expresiones matemáticas, físicas y químicas: escríbelas en LaTeX entre signos de dólar para que se impriman con tipografía de libro, tanto en el enunciado como en opciones y columnas. En línea con $…$ (por ejemplo "$\\int_0^1 x e^{x^2}\\,dx$", "$F = m a$", "$v_0 = 12\\ \\text{m/s}$", "$\\frac{3}{4}$", "$\\ce{H2SO4}$"); usa $$…$$ solo para una fórmula larga que deba ir en su propio renglón. No uses símbolos Unicode sueltos como ∫, ², √ o ½ fuera de LaTeX. Usa \\dfrac para fracciones dentro de integrales y ecuaciones principales, y la notación en español: \\operatorname{sen} para seno y \\operatorname{tg} solo si el profesor lo usa (si no, \\tan). Las letras de los incisos y opciones ("a)", "b)") van fuera de los signos de dólar. El texto normal y las palabras van fuera de LaTeX.
- No escribas espacios en blanco, paréntesis vacíos ni líneas para responder dentro de los textos: la hoja impresa ya los agrega (círculos, casillas V/F, paréntesis y renglones).
- No incluyas las respuestas: la solución se prepara después.
- Usa español de México, lenguaje adecuado para adolescentes y datos realistas. No pidas datos personales al alumno.`;

export interface ActividadGenerada {
  instrucciones: string[];
  criterios: CriterioEvaluacion[];
  reactivos: Reactivo[];
}

export async function generarActividad(
  datos: { titulo: string; materia: string; grupo: string; prompt: string; paginas?: number; escala?: Escala; sinSolucion?: boolean },
  uso: UsoIA,
): Promise<ActividadGenerada> {
  const salida = await pedir({
    tipo: "generar",
    uso,
    system:
      SISTEMA_ACTIVIDAD +
      (datos.sinSolucion
        ? `${NOTA_SIN_SOLUCION}\nUsa reactivos tipo "abierto" con espacio amplio para escribir (lineas de 12 a 16). En criterios, usa los que indique el profesor o propón Contenido, Coherencia y Elementos lingüísticos con porcentajes que sumen 100.`
        : ""),
    esquema: EsquemaActividad,
    contenido: [
      {
        type: "text",
        text: `Materia: ${datos.materia}\nGrupo: ${datos.grupo}\nTítulo: ${datos.titulo}\nPáginas tamaño carta: ${datos.paginas ?? 1}\nEscala de calificación: sobre ${datos.escala ?? 100}\n\nLo que pide el profesor:\n${datos.prompt}`,
      },
    ],
  });
  if (salida.reactivos.length === 0) throw new ErrorIA("La IA no generó reactivos. Describe con más detalle la actividad.");
  return normalizarGenerada(salida);
}

function normalizarGenerada(salida: z.infer<typeof EsquemaActividad>, anteriores: Reactivo[] = []): ActividadGenerada {
  // La hoja dibuja sus propios espacios para responder: se quitan los que la IA haya escrito.
  const limpiar = (t: string) =>
    t
      .replace(/\(\s*_*\s*\)|_{3,}/g, "")
      .replace(/[([]\s*(valor:?\s*)?\d+(\.\d+)?\s*(puntos?|pts?\.?|%)\s*[)\]]/gi, "").replace(/[ \t]{2,}/g, " ").trim();
  const lista = (xs: string[]) => (xs.length ? xs.map(limpiar) : undefined);
  return {
    instrucciones: salida.instrucciones.filter((t) => t.trim() && !/\bQR\b/i.test(t)),
    criterios: salida.criterios
      .filter((c) => c.nombre.trim() && c.porcentaje > 0)
      .map(normalizarCriterio),
    reactivos: salida.reactivos.map((r, i) => {
      const cerrado = r.tipo !== "desarrollo" && r.tipo !== "abierto";
      return {
        numero: i + 1,
        tipo: r.tipo,
        enunciado: limpiar(r.enunciado),
        respuesta: "",
        puntos: r.puntos > 0 ? r.puntos : 1,
        tema: r.tema,
        habilidad: r.habilidad,
        pagina: 1,
        opciones: r.tipo === "opcion_multiple" ? lista(r.opciones) : undefined,
        columnaA: lista(r.columnaA),
        columnaB: lista(r.columnaB),
        lineas: cerrado ? 0 : Math.max(3, Math.min(18, r.lineas || (r.tipo === "desarrollo" ? 12 : 6))),
        // Al editar, "conservar" deja el dibujo que ya tenía el reactivo con ese número.
        ilustracion:
          r.ilustracion.trim().toLowerCase() === "conservar"
            ? anteriores.find((x) => x.numero === i + 1)?.ilustracion
            : svgSeguro(r.ilustracion),
        ubicacionIlustracion: r.ubicacionIlustracion === "abajo" ? "abajo" : undefined,
      };
    }),
  };
}

// ---------- Editar la hoja con un prompt ----------

const SISTEMA_EDITAR = `${SISTEMA_ACTIVIDAD}

Ahora recibes una actividad que ya existe y una petición del profesor para mejorarla o editarla.
- Aplica exactamente lo que pide y conserva todo lo demás igual: mismos reactivos, textos, opciones, columnas, puntos y criterios, salvo lo que pida cambiar.
- Devuelve la actividad completa (instrucciones, criterios y todos los reactivos), no solo los cambios.
- ilustracion: escribe "conservar" para dejar el dibujo actual del reactivo, cadena vacía para quitarlo, o un SVG nuevo si el profesor pide otro dibujo o un reactivo nuevo lo necesita.`;

/** Edita la hoja (instrucciones, criterios y reactivos) siguiendo la petición del profesor. */
export async function editarActividad(act: Actividad, peticion: string, uso: UsoIA): Promise<ActividadGenerada> {
  const actual = {
    titulo: act.titulo,
    instrucciones: act.instruccionesAlumno ?? [],
    criterios: act.criterios ?? [],
    reactivos: act.reactivos.map((r) => ({
      numero: r.numero,
      tipo: r.tipo,
      enunciado: r.enunciado,
      opciones: r.opciones ?? [],
      columnaA: r.columnaA ?? [],
      columnaB: r.columnaB ?? [],
      puntos: r.puntos,
      tema: r.tema,
      habilidad: r.habilidad,
      lineas: r.lineas ?? 0,
      ilustracion: r.ilustracion ? "(tiene dibujo)" : "",
      ubicacionIlustracion: r.ubicacionIlustracion ?? "derecha",
    })),
  };
  const salida = await pedir({
    tipo: "editar",
    uso,
    system: SISTEMA_EDITAR,
    esquema: EsquemaActividad,
    contenido: [
      {
        type: "text",
        text: `Actividad actual:\n${JSON.stringify(actual, null, 1)}\n\nPáginas tamaño carta: ${act.paginas}\nEscala de calificación: sobre ${act.escala ?? 10}\n\nPetición del profesor:\n${peticion}`,
      },
    ],
  });
  if (salida.reactivos.length === 0) throw new ErrorIA("La IA dejó la actividad sin reactivos. Revisa tu petición.");
  return normalizarGenerada(salida, act.reactivos);
}

// ---------- Solución generada con IA ----------

const SISTEMA_RESOLVER = `Eres un profesor experto de secundaria y bachillerato en México. Resuelve la actividad que se te da como la resolvería el profesor, para usarla como rúbrica de evaluación.

${SISTEMA_RUBRICA.split("\n").slice(2).join("\n")}

Además:
- Resuelve cada reactivo con cuidado y verifica tus cálculos. La respuesta debe ser correcta.
- Para desarrollo, escribe en solucionPasos el procedimiento completo, una línea por paso, con unidades.
- En solucionPasos escribe las expresiones en LaTeX entre $…$ (por ejemplo "$u = x^2,\\ du = 2x\\,dx$"). En respuesta usa texto simple sin LaTeX (por ejemplo "1/2 (e - 1) ≈ 0.86"), porque se copia a campos de texto y al PDF corregido.
- Para abiertos, en respuesta pon los criterios que debe cumplir una buena respuesta y un ejemplo breve.
- Respeta el número, el tipo y los puntos de cada reactivo tal como vienen. Si la actividad viene en imágenes, léela de ahí.
- pagina e y: si la actividad viene como texto, usa pagina 1 e y 0.
- Sigue las condiciones que dé el profesor para resolverla (nivel de detalle, método, cifras significativas, etc.).`;

export async function resolverActividad(
  act: Actividad,
  datos: { condiciones: string; imagenes?: ImagenParaIA[] },
  uso: UsoIA,
): Promise<PropuestaRubrica> {
  const comoTexto = act.reactivos.map((r) => ({
    numero: r.numero,
    tipo: r.tipo,
    enunciado: r.enunciado,
    opciones: r.opciones,
    columnaA: r.columnaA,
    columnaB: r.columnaB,
    puntos: r.puntos,
    tema: r.tema,
  }));
  const salida = await pedir({
    tipo: "resolver",
    uso,
    system: SISTEMA_RESOLVER,
    esquema: EsquemaRubrica,
    contenido: [
      ...(datos.imagenes?.length ? bloquesImagen(datos.imagenes, "Actividad en blanco") : []),
      {
        type: "text",
        text:
          `Actividad: ${act.titulo}\n` +
          (comoTexto.length ? `Reactivos:\n${JSON.stringify(comoTexto, null, 1)}\n` : "") +
          `Criterios e indicaciones del profesor para evaluar: ${act.instrucciones?.trim() || "ninguno"}${criteriosParaIA(act)}\n` +
          `Condiciones para resolver: ${datos.condiciones.trim() || "ninguna"}\n\nResuelve la actividad y genera la rúbrica.`,
      },
    ],
  });
  const propuesta = normalizarRubrica(salida);
  // Los criterios impresos en la hoja se conservan si la IA no propone otros.
  if (!propuesta.criterios.length && act.criterios?.length) propuesta.criterios = act.criterios;
  if (!comoTexto.length) return propuesta;
  // Lo impreso (enunciado, tipo, puntos) manda: la IA solo agrega respuestas y pasos.
  return {
    ...propuesta,
    reactivos: act.reactivos.map((r) => {
      const ia = propuesta.reactivos.find((x) => x.numero === r.numero);
      return ia ? { ...r, respuesta: ia.respuesta, pasos: ia.pasos, solucionPasos: ia.solucionPasos, habilidad: r.habilidad || ia.habilidad } : r;
    }),
  };
}

// ---------- Evaluación de la entrega de un alumno ----------

const EsquemaEvaluacion = z.object({
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      respuestaLeida: z.string(),
      puntosSugeridos: z.number(),
      confianza: z.enum(["alta", "media", "baja"]),
      comentario: z.string(),
      pasos: z.array(z.number()),
      criterios: z.array(z.number()),
      subrayados: z.array(z.object({ pagina: z.number().int(), y: z.number(), x0: z.number(), x1: z.number(), comentario: z.string() })),
      elementos: z.array(z.object({ pagina: z.number().int(), y: z.number(), x: z.number() })),
      incisos: z.array(z.object({ pagina: z.number().int(), y: z.number(), x: z.number(), yCorrecta: z.number(), xCorrecta: z.number() })),
      pagina: z.number().int(),
      y: z.number(),
      x: z.number(),
    }),
  ),
  positivos: z.array(z.string()),
  mejoras: z.array(z.string()),
});

const SISTEMA_EVALUACION = `Eres un asistente de evaluación para profesores de secundaria y bachillerato en México.
Recibes la rúbrica confirmada por el profesor y las páginas escaneadas de la actividad de un alumno, escrita a mano.
Tu sugerencia la revisará el profesor antes de enviarla al alumno.

Para cada reactivo de la rúbrica:
- respuestaLeida: transcribe exactamente lo que el alumno marcó o escribió. Opción múltiple: la letra elegida. V/F: "V" o "F". Relación de columnas: pares como "1-c, 2-a". Paréntesis: las letras en orden. Desarrollo: su resultado final. Si está en blanco, cadena vacía.
- confianza: alta si se lee con claridad; media si hay alguna duda; baja si la letra, la foto o el tachón no permiten leerlo con seguridad. Nunca adivines: si no se lee, usa confianza baja.
- pasos: solo para desarrollo, un valor por cada paso de la rúbrica en el mismo orden: 1 si el paso está completo y correcto, 0.5 si está parcial o con un error menor, 0 si falta o es incorrecto. Acepta procedimientos distintos al del profesor si son correctos, salvo que sus indicaciones digan lo contrario. Para los demás tipos, lista vacía.
- criterios: solo para reactivos abiertos que traen "criterios" en la rúbrica: un valor por cada uno de esos criterios, en ese orden: 1 si lo cumple, 0.5 si lo cumple a medias, 0 si no. Evalúa cada reactivo solo con sus propios criterios: nunca le descuentes por criterios de otro ejercicio. Para los demás, lista vacía.
- subrayados: solo si el estilo de corrección es "subrayado" (se indica abajo); si no, lista vacía. Los fragmentos concretos del texto del alumno que hay que corregir (una palabra, frase o renglón con error de contenido, coherencia, ortografía, gramática o cálculo), máximo 6 por reactivo, cada uno con pagina, y (la línea base del renglón, de 0 arriba a 1 abajo), x0 y x1 (inicio y fin del fragmento, de 0 izquierda a 1 derecha) y comentario (qué corregir, máximo 8 palabras, sin LaTeX).
- elementos: si el reactivo trae "pasos" o "criterios" en la rúbrica, una ubicación por cada uno, en el mismo orden: pagina, y (0 arriba a 1 abajo) y x (0 izquierda a 1 derecha) del punto exacto de la hoja del alumno donde se ve ese paso o criterio (por ejemplo, el renglón con el ciclo for para "Uso de ciclos", o el renglón con el error). Si falta, señala dónde debería estar. Ahí se dibuja su marca. Para los demás, lista vacía.
- incisos: solo para relación de columnas, paréntesis y reactivos de elegir la palabra correcta de un conjunto en cada renglón numerado (encerrar o subrayar): una ubicación por renglón, en orden (1, 2, 3…), con pagina, y (0 arriba a 1 abajo) y x (0 izquierda a 1 derecha). Si el alumno escribió una letra: justo a la derecha de esa letra. Si eligió una palabra: el centro de la palabra que eligió. xCorrecta, yCorrecta: el centro de la opción correcta de ese renglón según la respuesta de la rúbrica (si no hay opciones impresas, igual que x, y). Ahí se marca si acertó. Para los demás, lista vacía. En respuestaLeida de esos reactivos de elegir palabra, escribe cada renglón como "1) palabra, 2) palabra", con la palabra completa tal como la eligió.
- puntosSugeridos: puntos que asignarías según la rúbrica (entre 0 y el valor del reactivo).
- comentario: retroalimentación breve para el alumno, en segunda persona, máximo 15 palabras. Si es correcto, una frase de reconocimiento corta. Sin LaTeX ni signos de dólar: se imprime en el PDF tal cual.
- pagina, y, x: dónde está la respuesta en la hoja del alumno (página desde 1; y de 0 arriba a 1 abajo; x de 0 izquierda a 1 derecha, al final de la respuesta). Ahí se dibuja la marca de corrección.

Si el profesor dio criterios de evaluación con porcentajes o recomendaciones, síguelos al asignar puntos y al redactar los comentarios.

Además:
- positivos: 2 o 3 aspectos que el alumno hizo bien, concretos.
- mejoras: 2 o 3 aspectos a mejorar, concretos y accionables.
Escribe en español claro y amable, adecuado para adolescentes.`;

/** Criterio propuesto por la IA: porcentaje entre 0 y 100 y reactivos solo si los indicó. */
function normalizarCriterio(c: { nombre: string; porcentaje: number; descripcion: string; reactivos: number[] }): CriterioEvaluacion {
  const reactivos = [...new Set(c.reactivos.filter((n) => Number.isInteger(n) && n > 0))];
  return {
    nombre: c.nombre,
    porcentaje: Math.max(0, Math.min(100, Math.round(c.porcentaje))),
    descripcion: c.descripcion,
    ...(reactivos.length ? { reactivos } : {}),
  };
}

function criteriosParaIA(act: Actividad) {
  let t = "";
  if (act.criterios?.length)
    t += `\nCriterios de evaluación: ${act.criterios
      .map((c) => {
        const aplica = reactivosDelCriterio(c);
        return `${c.nombre}${c.porcentaje ? ` (${c.porcentaje} %)` : ""}: ${c.descripcion}${aplica ? ` [solo reactivo ${aplica.join(", ")}]` : ""}`;
      })
      .join("; ")}`;
  if (act.recomendaciones?.length) t += `\nRecomendaciones para evaluar: ${act.recomendaciones.join("; ")}`;
  return t;
}

function rubricaParaIA(act: Actividad) {
  return act.reactivos.map((r) => ({
    numero: r.numero,
    tipo: r.tipo,
    enunciado: r.enunciado,
    respuesta: r.respuesta,
    puntos: r.puntos,
    pasos: r.pasos?.map((p) => p.nombre),
    solucionDelProfesor: r.solucionPasos,
    // Solo los criterios que califican este reactivo (los de otros ejercicios no cuentan).
    criterios: r.tipo === "abierto" ? criteriosDelReactivo(act, r.numero).map(({ criterio: c }) => `${c.nombre}${c.porcentaje ? ` (${c.porcentaje} %)` : ""}: ${c.descripcion}`) : undefined,
  }));
}

export interface EvaluacionAlumno {
  resultados: ResultadoReactivo[];
  positivos: string[];
  mejoras: string[];
}

const cuartos = (n: number) => Math.round(n * 4) / 4;

const NOTA_EVAL_SIN_SOLUCION = `${NOTA_SIN_SOLUCION}
No hay solución de referencia: valora cada reactivo con los criterios de evaluación y la respuesta de la rúbrica (que describe lo que debe cumplir). En los comentarios señala concretamente qué corregir del contenido, la coherencia o el lenguaje.`;

const NOTA_EVAL_SIN_PUNTAJE = `

RÚBRICA SIN PUNTAJE: el alumno no recibe calificación; solo se identifican aciertos y se marcan elementos a corregir. Asigna los puntos completos del reactivo si está bien y 0 si hay algo que corregir; el comentario dice qué corregir.`;

export async function evaluarEntrega(act: Actividad, imagenes: ImagenParaIA[], uso: UsoIA): Promise<EvaluacionAlumno> {
  const fijos = diccionarioDe(idiomaDe({ ...uso, actividadId: uso.actividadId ?? act.id }) ?? "es").alumno.correccion;
  const salida = await pedir({
    tipo: "evaluacion",
    uso,
    system: `${SISTEMA_EVALUACION}${act.sinSolucion ? NOTA_EVAL_SIN_SOLUCION : ""}${act.sinPuntaje ? NOTA_EVAL_SIN_PUNTAJE : ""}\n\nEstilo de corrección: ${act.estiloCorreccion === "subrayado" ? "subrayado" : "margen"}\nActividad: ${act.titulo}\nIndicaciones del profesor: ${act.instrucciones?.trim() || "ninguna"}${criteriosParaIA(act)}\nRúbrica:\n${JSON.stringify(rubricaParaIA(act), null, 1)}`,
    esquema: EsquemaEvaluacion,
    contenido: [...bloquesImagen(imagenes, "Hoja del alumno"), { type: "text", text: "Evalúa esta entrega con la rúbrica." }],
  });

  const resultados = act.reactivos.map((r): ResultadoReactivo => {
    const ia = salida.reactivos.find((x) => x.numero === r.numero);
    if (!ia) {
      return {
        numero: r.numero,
        puntosObtenidos: 0,
        respuestaLeida: "",
        confianza: "baja",
        comentario: fijos.noEncontrado,
        ubicacion: { pagina: r.pagina, y: r.y ?? 0.5 },
      };
    }
    let puntos: number;
    let pasos: number[] | undefined;
    let criterios: number[] | undefined;
    if (esCerrado(r)) {
      puntos = puntosReactivoCerrado(r, ia.respuestaLeida) ?? 0;
    } else if (r.tipo === "desarrollo" && r.pasos?.length) {
      pasos = r.pasos.map((_, i) => {
        const v = ia.pasos[i] ?? 0;
        return v >= 0.75 ? 1 : v >= 0.25 ? 0.5 : 0;
      });
      const fraccion = r.pasos.reduce((s, p, i) => s + p.peso * pasos![i], 0);
      puntos = cuartos(fraccion * r.puntos);
    } else if (r.tipo === "abierto" && criteriosDelReactivo(act, r.numero).length && ia.criterios.length) {
      // Abiertos con criterios: los puntos salen de lo que cumple cada criterio del reactivo y su
      // porcentaje. La IA responde en el orden de los criterios del reactivo; se guardan alineados
      // con la lista completa de la actividad (los de otros reactivos quedan en 0 y no cuentan).
      const propios = criteriosDelReactivo(act, r.numero);
      const valores = (act.criterios ?? []).map(() => 0);
      propios.forEach(({ indice }, j) => {
        const v = ia.criterios[j] ?? 0;
        valores[indice] = v >= 0.75 ? 1 : v >= 0.25 ? 0.5 : 0;
      });
      criterios = valores;
      puntos = cuartos((fraccionCriterios(act, criterios, r.numero) ?? 0) * r.puntos);
    } else {
      puntos = cuartos(Math.max(0, Math.min(r.puntos, ia.puntosSugeridos)));
    }
    const subrayados =
      act.estiloCorreccion === "subrayado"
        ? ia.subrayados
            .filter((s) => s.comentario.trim() && s.x1 > s.x0)
            .slice(0, 6)
            .map((s) => ({
              pagina: Math.max(1, Math.min(imagenes.length, s.pagina || r.pagina)),
              y: Math.max(0, Math.min(1, s.y)),
              x0: Math.max(0, Math.min(1, s.x0)),
              x1: Math.max(0, Math.min(1, s.x1)),
              comentario: s.comentario.trim().slice(0, 80),
            }))
        : [];
    // Una ubicación por elemento (pasos o criterios del reactivo), en el orden de la rúbrica.
    const nElementos = pasos ? pasos.length : criterios ? criteriosDelReactivo(act, r.numero).length : 0;
    const ubicacionesElementos =
      nElementos && ia.elementos.length
        ? Array.from({ length: nElementos }, (_, j) => {
            const u = ia.elementos[j] ?? ia.elementos[ia.elementos.length - 1];
            return {
              pagina: Math.max(1, Math.min(imagenes.length, u.pagina || ia.pagina || r.pagina)),
              y: Math.max(0, Math.min(1, u.y)),
              x: Math.max(0, Math.min(1, u.x)),
            };
          })
        : [];
    // Cerrados con varios renglones: dónde marcar cada respuesta (el acierto lo decide el código).
    const nIncisos = esCerrado(r) ? incisosCerrado(r, ia.respuestaLeida).length : 0;
    const ubicacionesIncisos =
      nIncisos > 1 && ia.incisos.length
        ? ia.incisos.slice(0, nIncisos).map((u) => ({
            pagina: Math.max(1, Math.min(imagenes.length, u.pagina || ia.pagina || r.pagina)),
            y: Math.max(0, Math.min(1, u.y)),
            x: Math.max(0, Math.min(1, u.x)),
            yCorrecta: Math.max(0, Math.min(1, u.yCorrecta ?? u.y)),
            xCorrecta: Math.max(0, Math.min(1, u.xCorrecta ?? u.x)),
          }))
        : [];
    return {
      numero: r.numero,
      puntosObtenidos: puntos,
      respuestaLeida: ia.respuestaLeida,
      confianza: ia.confianza,
      // En cerrados el comentario debe coincidir con lo que calculó el código.
      comentario:
        esCerrado(r) && puntos === 0
          ? formato(fijos.correcta, { r: r.respuesta })
          : esCerrado(r) && puntos === r.puntos
            ? fijos.correcto
            : ia.comentario,
      pasos,
      ...(criterios ? { criterios } : {}),
      ...(subrayados.length ? { subrayados } : {}),
      ...(ubicacionesElementos.length ? { ubicacionesElementos } : {}),
      ...(ubicacionesIncisos.length ? { ubicacionesIncisos } : {}),
      ubicacion: {
        pagina: Math.max(1, Math.min(imagenes.length, ia.pagina || r.pagina)),
        y: Math.max(0, Math.min(1, ia.y)),
        x: Math.max(0, Math.min(1, ia.x)),
      },
    };
  });

  return { resultados, positivos: salida.positivos, mejoras: salida.mejoras };
}

// ---------- Recomendaciones de estudio ----------

const EsquemaEstudio = z.object({
  temas: z.array(z.string()),
  videos: z.array(z.object({ titulo: z.string(), busqueda: z.string() })),
  ejercicios: z.array(z.object({ tema: z.string(), enunciado: z.string(), respuesta: z.string() })),
});

const SISTEMA_ESTUDIO = `Eres un asistente para profesores de secundaria y bachillerato en México.
Recibes los resultados ya calificados de un alumno en una actividad: cada reactivo con su tema, sus puntos y el comentario de la corrección.
Prepara recomendaciones de estudio para que el alumno repase por su cuenta los temas donde perdió puntos (si no perdió puntos, los temas de la actividad para reforzar).

- temas: de 1 a 3 temas a repasar, en orden de prioridad. Cópialos EXACTAMENTE de la lista "Temas de la actividad".
- videos: de 2 a 3 videos sugeridos con ejercicios resueltos de esos temas. NO inventes enlaces ni nombres de canales: da un título descriptivo y "busqueda", el texto exacto para buscarlo en YouTube en español (por ejemplo "aceleración angular ejercicios resueltos torca").
- ejercicios: de 2 a 3 ejercicios nuevos de esos temas o equivalentes, del mismo nivel de la actividad, con datos completos. "respuesta" es SOLO el resultado final con unidades, sin procedimiento, para que el alumno lo compruebe al practicar en casa. Verifica que la respuesta sea correcta.
En "tema" de cada ejercicio usa el nombre corto del tema, sin fórmulas. En enunciados y respuestas usa LaTeX entre $...$ para fórmulas. Escribe en español de México, dirigido al alumno (tú).`;

/** Temas distintos de la rúbrica, en orden. */
export function temasDe(act: Pick<Actividad, "reactivos">): string[] {
  return [...new Set(act.reactivos.map((r) => r.tema?.trim()).filter((t): t is string => Boolean(t)))];
}

/** Videos sugeridos y ejercicios de repaso a partir de los resultados (sin imágenes ni datos del alumno). */
export async function recomendarEstudio(act: Actividad, resultados: ResultadoReactivo[], mejoras: string[], uso: UsoIA): Promise<Omit<RecomendacionesEstudio, "generadoEn">> {
  const detalle = act.reactivos.map((r) => {
    const res = resultados.find((x) => x.numero === r.numero);
    return { numero: r.numero, tema: r.tema, habilidad: r.habilidad, enunciado: r.enunciado, puntos: r.puntos, obtenidos: res?.puntosObtenidos ?? 0, comentario: res?.comentario ?? "" };
  });
  const salida = await pedir({
    tipo: "estudio",
    uso,
    system: SISTEMA_ESTUDIO,
    esquema: EsquemaEstudio,
    contenido: [
      {
        type: "text",
        text: `Actividad: ${act.titulo}\nTemas de la actividad: ${JSON.stringify(temasDe(act))}\nPuntos de mejora: ${mejoras.join("; ") || "ninguno"}\nResultados por reactivo:\n${JSON.stringify(detalle, null, 1)}`,
      },
    ],
  });
  // Los temas se toman de la rúbrica para enlazar los videos y lecturas buscados para la actividad.
  const validos = temasDe(act);
  let temas = salida.temas.map((t) => validos.find((v) => v.toLowerCase() === t.trim().toLowerCase())).filter((t): t is string => Boolean(t));
  if (temas.length === 0) {
    temas = act.reactivos
      .filter((r) => (resultados.find((x) => x.numero === r.numero)?.puntosObtenidos ?? 0) < r.puntos && r.tema)
      .map((r) => r.tema);
  }
  return {
    temas: [...new Set(temas)].slice(0, 3),
    videos: salida.videos.filter((v) => v.busqueda.trim()).slice(0, 3),
    ejercicios: salida.ejercicios.filter((e) => e.enunciado.trim() && e.respuesta.trim()).slice(0, 3),
  };
}

// ---------- Videos y lecturas con enlaces reales (búsqueda web) ----------

const EsquemaRecursos = z.object({
  temas: z.array(
    z.object({
      tema: z.string(),
      recursos: z.array(z.object({ tipo: z.string(), titulo: z.string(), url: z.string(), fuente: z.string().optional() })),
    }),
  ),
});

const SISTEMA_RECURSOS = `Eres un asistente para profesores de secundaria y bachillerato en México.
Para cada tema que recibes, busca en la web material de estudio en español (o en inglés solo si no hay en español) y elige:
- khan: 1 video o artículo de Khan Academy (de preferencia es.khanacademy.org) del tema.
- video: hasta 2 videos de YouTube con ejercicios resueltos del tema, de canales educativos reconocidos y con muchas vistas (por ejemplo Julioprofe, Matemáticas profe Alex, Khan Academy Español, Unicoos, Profesor10demates o equivalentes de la materia). Usa enlaces de video (youtube.com/watch?v=...), no de canales ni listas.
- openstax: 1 sección de un libro de OpenStax (openstax.org/books/.../pages/...) que explique el tema; de preferencia libros en español.
Usa SOLO enlaces que aparecieron en tus resultados de búsqueda; nunca los inventes ni los completes. Si no encuentras algo, no lo incluyas.
Responde únicamente con un bloque JSON con esta forma:
{"temas":[{"tema":"<tema tal como lo recibiste>","recursos":[{"tipo":"khan|video|openstax","titulo":"...","url":"https://...","fuente":"canal, sitio o libro y sección"}]}]}`;

/** Confirma con oEmbed que el video de YouTube existe (sin llave). Si no hay red, no lo descarta. */
async function videoExiste(url: string): Promise<boolean> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) });
    return r.ok || r.status >= 500;
  } catch {
    return true;
  }
}

/**
 * Busca en la web videos de Khan Academy, videos populares de YouTube y secciones de OpenStax
 * para los temas de la actividad. Solo van el título y los temas (nunca datos del alumno).
 */
export async function buscarRecursos(datos: { titulo: string; materia: string; temas: string[] }, uso: UsoIA): Promise<Record<string, RecursoEstudio[]>> {
  const modelo = "claude-sonnet-5-5";
  const mensajes: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Materia: ${datos.materia}\nActividad: ${datos.titulo}\nTemas:\n${datos.temas.map((t) => `- ${t}`).join("\n")}`,
    },
  ];
  let texto = "";
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    let respuesta;
    try {
      respuesta = await cliente().beta.messages.create({
        model: modelo,
        max_tokens: 8000,
        output_config: { effort: "low" },
        system: SISTEMA_RECURSOS + indicacionIdioma(idiomaDe(uso)),
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(12, datos.temas.length * 3), allowed_domains: DOMINIOS_RECURSOS }],
        messages: mensajes,
      });
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw new ErrorIA(`Error de la API de Claude (${e.status ?? "red"}): ${e.message}`);
      throw e;
    }
    anotarConsumo("recursos", uso, respuesta, respuesta.stop_reason === "end_turn");
    texto = respuesta.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    if (respuesta.stop_reason !== "pause_turn") break;
    mensajes.push({ role: "assistant", content: respuesta.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  const salida = EsquemaRecursos.safeParse(extraerJson(texto));
  if (!salida.success) throw new ErrorIA("La búsqueda de videos y lecturas devolvió un formato inesperado.");
  const limpios = limpiarRecursos(salida.data.temas, datos.temas);
  for (const tema of Object.keys(limpios)) {
    const verificados: RecursoEstudio[] = [];
    for (const r of limpios[tema]) if (r.tipo !== "video" || (await videoExiste(r.url))) verificados.push(r);
    limpios[tema] = verificados;
  }
  return limpios;
}
