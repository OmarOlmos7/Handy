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
import type { Actividad, CriterioEvaluacion, Escala, FormatoActividad, PrecisionIA, TipoReactivo, Reactivo, RecomendacionesEstudio, RecursoEstudio, ResultadoReactivo, TipoConsumoIA, VersionActividad } from "./tipos";
import { coinciden, letraVersion } from "./versiones";

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
/** Tipos de una actividad en plataforma (el alumno responde en la app). */
const TIPOS_PLATAFORMA_IA = [
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
] as const;
const TIPOS_TODOS = [...TIPOS, "seleccion_multiple", "numerica", "si_no", "orden", "relacion_imagenes", "seleccion_imagenes"] as const;

/** Formato de la clave de los reactivos en plataforma (para resolver y verificar). */
const RESPUESTAS_PLATAFORMA = `- Reactivos en plataforma: selección múltiple y selección de imágenes, solo las letras correctas separadas por coma ("a, c"); sí/no, "Sí" o "No"; orden, las letras de los elementos en el orden correcto ("c, a, b, d"); relación con imágenes, pares número-letra de imagen ("1-b, 2-a"); numérica, el número con sus unidades y nada más ("9.8 m/s²"). Las imágenes se describen con su letra.`;

const EsquemaRubrica = z.object({
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      tipo: z.enum(TIPOS_TODOS),
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
- respuesta: la respuesta del profesor. Opción múltiple: la letra y el texto, como "c) m/s²". Verdadero o falso: "V" o "F". Relación de columnas: pares como "1-c, 2-a, 3-b". Paréntesis: las letras en orden, como "(b) (a) (c)". Elegir la palabra correcta de un conjunto en cada renglón: "1) palabra, 2) palabra", solo la correcta, sin marcas ni alternativas. Desarrollo: el resultado final con unidades. Abierto: los criterios que debe cumplir la respuesta.
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

/** En plataforma: los mismos campos más las imágenes con letra y el margen de las numéricas. */
const EsquemaActividadPlataforma = z.object({
  instrucciones: z.array(z.string()),
  criterios: z.array(z.object({ nombre: z.string(), porcentaje: z.number(), descripcion: z.string(), reactivos: z.array(z.number().int()) })),
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      tipo: z.enum(TIPOS_PLATAFORMA_IA),
      enunciado: z.string(),
      opciones: z.array(z.string()),
      columnaA: z.array(z.string()),
      columnaB: z.array(z.string()),
      imagenes: z.array(z.object({ svg: z.string(), descripcion: z.string() })),
      tolerancia: z.number(),
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

const SISTEMA_ACTIVIDAD_PLATAFORMA = `Eres un diseñador de actividades para profesores de secundaria y bachillerato en México.
El profesor describe la actividad que quiere: tipos de reactivos, ponderaciones (puntos o porcentajes), temas, nivel y cualquier otra condición. Diseña una actividad EN PLATAFORMA: el alumno la responde dentro de la app, en su computadora o su celular (no es una hoja impresa).

Reglas:
- Respeta exactamente lo que pide el profesor: cantidad y tipo de reactivos, temas y puntos. Si indica los puntos de cada reactivo, úsalos tal cual. Si no indica puntos o da porcentajes, reparte los puntos para que el total sea igual a la escala de calificación indicada (100 o 10), salvo que pida otro total.
- instrucciones: exactamente 3 instrucciones breves para el alumno (máximo 20 palabras cada una), en imperativo, con **doble asterisco** en las palabras clave. Explica cómo responder en la app (elegir, escribir, ordenar, subir la foto de su desarrollo), unidades y redondeo si aplica. No menciones puntos.
- criterios: como se evalúa, con porcentajes que sumen 100; reactivos: los números que califica cada criterio (lista vacía si aplica a todos). Si solo hay reactivos cerrados, lista vacía.
- tipo, según lo que pida el profesor:
  · opcion_multiple: una sola respuesta correcta. opciones: de 3 a 5, con su letra ("a) 9.8 m/s²").
  · seleccion_multiple: dos o más respuestas correctas. opciones: de 4 a 6 con su letra. El enunciado dice "Selecciona todas las correctas".
  · verdadero_falso: una afirmación para marcar verdadera o falsa.
  · si_no: una pregunta que se responde Sí o No.
  · relacion_columnas: columnaA numerada ("1. Inercia") y columnaB con letras ("a) …"), con el orden de columnaB mezclado; columnaB puede traer una o dos opciones de más como distractores.
  · orden: ordenar pasos, eventos o elementos. opciones: los elementos con su letra ("a) …"), en orden MEZCLADO (nunca en el orden correcto); el enunciado dice qué criterio de orden seguir.
  · numerica: una pregunta con una sola respuesta numérica. El enunciado indica las unidades y el redondeo esperado. tolerancia: margen aceptado (±) en esas unidades, adecuado al redondeo (por ejemplo 0.05 si pides dos decimales); 0 si basta con el 1 %.
  · abierto: respuesta corta o ensayo que el alumno escribe en la app. lineas: 3 para respuesta corta, de 6 a 10 para ensayo.
  · relacion_imagenes: columnaA numerada con conceptos y en imagenes de 3 a 6 dibujos que se identifican con letras (a, b, c… en ese orden), mezclados respecto a columnaA.
  · seleccion_imagenes: el enunciado pide elegir la o las imágenes que cumplen algo; imagenes: de 3 a 6 dibujos (a, b, c…), con una o más correctas.
  · desarrollo: un problema con procedimiento que el alumno resuelve a mano y sube como foto o archivo. lineas: 0.
- Para los tipos que no los usan, opciones, columnaA, columnaB e imagenes van como listas vacías y tolerancia 0.
- imagenes: cada una es un dibujo en SVG (un solo elemento <svg> con xmlns="http://www.w3.org/2000/svg" y viewBox="0 0 160 120"), solo figuras simples (line, rect, circle, ellipse, path, polygon, polyline, text), colores sobrios y trazos claros; sin imágenes externas, scripts ni enlaces. No escribas dentro del dibujo el nombre de lo que representa si eso revela la respuesta. descripcion: qué muestra el dibujo, breve (la usa la IA para preparar la solución; el alumno no la ve).
- ilustracion (dibujo de apoyo del enunciado) y ubicacionIlustracion: igual que en una hoja: solo si el profesor la pide; si no, cadena vacía y "derecha".
- enunciado: completo y claro, sin las opciones, sin puntos y sin espacios para responder. LaTeX entre $…$ para expresiones matemáticas, físicas y químicas (también en opciones y columnas); las letras de las opciones van fuera de LaTeX.
- puntos, tema (de la materia) y habilidad ("Comprensión de conceptos", "Resolución de problemas", "Interpretación de gráficas", "Comunicación escrita", etc.).
- No incluyas las respuestas: la solución se prepara después.
- Usa español de México, lenguaje adecuado para adolescentes y datos realistas. No pidas datos personales al alumno.`;

export interface ActividadGenerada {
  instrucciones: string[];
  criterios: CriterioEvaluacion[];
  reactivos: Reactivo[];
}

export async function generarActividad(
  datos: { titulo: string; materia: string; grupo: string; prompt: string; paginas?: number; escala?: Escala; sinSolucion?: boolean; formato?: FormatoActividad },
  uso: UsoIA,
): Promise<ActividadGenerada> {
  if (datos.formato === "plataforma") {
    const salida = await pedir({
      tipo: "generar",
      uso,
      system: SISTEMA_ACTIVIDAD_PLATAFORMA + (datos.sinSolucion ? `${NOTA_SIN_SOLUCION}\nUsa reactivos tipo "abierto" (ensayo, lineas de 8 a 10).` : ""),
      esquema: EsquemaActividadPlataforma,
      contenido: [
        {
          type: "text",
          text: `Materia: ${datos.materia}\nGrupo: ${datos.grupo}\nTítulo: ${datos.titulo}\nEscala de calificación: sobre ${datos.escala ?? 100}\n\nLo que pide el profesor:\n${datos.prompt}`,
        },
      ],
    });
    if (salida.reactivos.length === 0) throw new ErrorIA("La IA no generó reactivos. Describe con más detalle la actividad.");
    return normalizarGenerada(salida, [], true);
  }
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

type ReactivoGenerado = Omit<z.infer<typeof EsquemaActividad>["reactivos"][number], "tipo"> & {
  tipo: TipoReactivo;
  imagenes?: { svg: string; descripcion: string }[];
  tolerancia?: number;
};

/** Tipos cuyas opciones con letra se muestran (y se califican) en la app o en la hoja. */
const CON_OPCIONES: readonly string[] = ["opcion_multiple", "seleccion_multiple", "orden"];

function normalizarGenerada(
  salida: { instrucciones: string[]; criterios: z.infer<typeof EsquemaActividad>["criterios"]; reactivos: ReactivoGenerado[] },
  anteriores: Reactivo[] = [],
  plataforma = false,
): ActividadGenerada {
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
      const anterior = anteriores.find((x) => x.numero === i + 1);
      // "conservar" deja las imágenes que ya tenía el reactivo (al editar).
      const imagenes =
        r.imagenes?.length === 1 && r.imagenes[0].svg.trim().toLowerCase() === "conservar"
          ? anterior?.imagenes
          : (r.imagenes ?? [])
              .map((im) => ({ svg: svgSeguro(im.svg) ?? "", descripcion: im.descripcion.trim().slice(0, 300) }))
              .filter((im) => im.svg);
      const conImagenes = r.tipo === "relacion_imagenes" || r.tipo === "seleccion_imagenes";
      return {
        numero: i + 1,
        tipo: r.tipo,
        enunciado: limpiar(r.enunciado),
        respuesta: "",
        puntos: r.puntos > 0 ? r.puntos : 1,
        tema: r.tema,
        habilidad: r.habilidad,
        pagina: 1,
        opciones: CON_OPCIONES.includes(r.tipo) ? lista(r.opciones) : undefined,
        columnaA: lista(r.columnaA),
        columnaB: lista(r.columnaB),
        lineas: cerrado || (plataforma && r.tipo === "desarrollo") ? 0 : Math.max(3, Math.min(18, r.lineas || (r.tipo === "desarrollo" ? 12 : 6))),
        imagenes: conImagenes && imagenes?.length ? imagenes.slice(0, 8) : undefined,
        tolerancia: r.tipo === "numerica" && r.tolerancia && r.tolerancia > 0 ? r.tolerancia : undefined,
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

const INSTRUCCIONES_EDITAR = `Ahora recibes una actividad que ya existe y una petición del profesor para mejorarla o editarla.
- Aplica exactamente lo que pide y conserva todo lo demás igual: mismos reactivos, textos, opciones, columnas, puntos y criterios, salvo lo que pida cambiar.
- Devuelve la actividad completa (instrucciones, criterios y todos los reactivos), no solo los cambios.
- ilustracion: escribe "conservar" para dejar el dibujo actual del reactivo, cadena vacía para quitarlo, o un SVG nuevo si el profesor pide otro dibujo o un reactivo nuevo lo necesita.`;

const SISTEMA_EDITAR = `${SISTEMA_ACTIVIDAD}\n\n${INSTRUCCIONES_EDITAR}`;

/** Edita la hoja (instrucciones, criterios y reactivos) siguiendo la petición del profesor. */
export async function editarActividad(act: Actividad, peticion: string, uso: UsoIA): Promise<ActividadGenerada> {
  const plataforma = act.formato === "plataforma";
  const actual = {
    titulo: act.titulo,
    instrucciones: act.instruccionesAlumno ?? [],
    criterios: act.criterios ?? [],
    reactivos: act.reactivos.map((r) => ({
      ...(plataforma
        ? { imagenes: (r.imagenes ?? []).map((im, i) => ({ svg: "(dibujo)", descripcion: `${String.fromCharCode(97 + i)}) ${im.descripcion}` })), tolerancia: r.tolerancia ?? 0 }
        : {}),
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
  const texto = `Actividad actual:\n${JSON.stringify(actual, null, 1)}\n\nPáginas tamaño carta: ${act.paginas}\nEscala de calificación: sobre ${act.escala ?? 10}\n\nPetición del profesor:\n${peticion}`;
  if (plataforma) {
    const salida = await pedir({
      tipo: "editar",
      uso,
      system: `${SISTEMA_ACTIVIDAD_PLATAFORMA}\n\n${INSTRUCCIONES_EDITAR}\n- imagenes: para dejar las imágenes actuales del reactivo, devuelve una sola imagen con svg "conservar"; si pide otras, dibújalas todas de nuevo.`,
      esquema: EsquemaActividadPlataforma,
      contenido: [{ type: "text", text: texto }],
    });
    if (salida.reactivos.length === 0) throw new ErrorIA("La IA dejó la actividad sin reactivos. Revisa tu petición.");
    return normalizarGenerada(salida, act.reactivos, true);
  }
  const salida = await pedir({
    tipo: "editar",
    uso,
    system: SISTEMA_EDITAR,
    esquema: EsquemaActividad,
    contenido: [{ type: "text", text: texto }],
  });
  if (salida.reactivos.length === 0) throw new ErrorIA("La IA dejó la actividad sin reactivos. Revisa tu petición.");
  return normalizarGenerada(salida, act.reactivos);
}

// ---------- Versiones de la actividad (B, C…) ----------

const EsquemaVersion = z.object({
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      enunciado: z.string(),
      opciones: z.array(z.string()),
      columnaA: z.array(z.string()),
      columnaB: z.array(z.string()),
      ilustracion: z.string(),
    }),
  ),
});

const SISTEMA_VERSION = `Eres un diseñador de actividades para profesores de secundaria y bachillerato en México.
Recibes una actividad impresa (versión A) y debes escribir otra versión para que los alumnos que se sientan juntos no copien. Todas las versiones se califican con la misma rúbrica.

Reglas:
- Cambia solo los valores numéricos (datos, cantidades, coeficientes, medidas, valores en gráficas). Conserva el mismo contexto, los mismos nombres, las mismas preguntas, el mismo procedimiento de solución, las mismas unidades y la misma dificultad.
- Elige valores realistas y fáciles de trabajar a mano (como los de la versión A), que den resultados razonables y bien definidos: sin divisiones entre cero, raíces negativas, ángulos imposibles, probabilidades fuera de 0 a 1 ni datos contradictorios. Los valores nuevos deben ser claramente distintos de los de la versión A.
- Resuelve mentalmente cada reactivo con los valores nuevos y verifica que tenga solución correcta.
- Opción múltiple: conserva el número de opciones y sus letras. Recalcula las opciones para que exactamente una sea la correcta con los valores nuevos y los distractores sean errores típicos; la correcta puede quedar en otra letra.
- Relación de columnas y paréntesis: si los elementos tienen números, actualízalos para que la relación correcta siga siendo única.
- Reactivos sin valores numéricos (conceptos, verdadero o falso sin datos, abiertos): cópialos igual.
- Selección múltiple: como la opción múltiple, pero puede haber varias correctas. Numérica: cambia los datos (la respuesta cambiará). Orden, sí/no, relación con imágenes y selección de imágenes: cópialos igual, salvo que tengan valores numéricos.
- ilustracion: si el reactivo de la versión A tiene dibujo con valores (ejes, medidas, datos de una gráfica), redibújalo en SVG con los valores nuevos y el mismo estilo; si el dibujo no tiene valores que cambien, escribe "conservar"; si no tiene dibujo, cadena vacía.
- Conserva el formato: LaTeX entre $…$, incisos "a) … b) …", opciones con su letra, columnaA numerada y columnaB con letras. No escribas puntos, espacios para responder ni respuestas.
- Devuelve todos los reactivos, con el mismo número que en la versión A.`;

/** Rango sugerido de cambio para cada versión, para que las versiones no repitan valores entre sí. */
const CAMBIO_VERSION: Record<string, string> = {
  B: "aumenta la mayoría de los datos entre 20 % y 60 %",
  C: "disminuye la mayoría de los datos entre 20 % y 50 %",
  D: "aumenta la mayoría de los datos entre 70 % y 150 %",
  E: "combina datos más grandes y más pequeños que en la versión A (entre −40 % y +100 %)",
};

/** Escribe otra versión de la hoja con valores numéricos distintos (sin solución todavía). */
export async function generarVersion(act: Actividad, letra: string, uso: UsoIA): Promise<VersionActividad> {
  const original = act.reactivos.map((r) => ({
    numero: r.numero,
    tipo: r.tipo,
    enunciado: r.enunciado,
    opciones: r.opciones ?? [],
    columnaA: r.columnaA ?? [],
    columnaB: r.columnaB ?? [],
    ilustracion: r.ilustracion ?? "",
  }));
  const salida = await pedir({
    tipo: "generar",
    uso,
    system: SISTEMA_VERSION,
    esquema: EsquemaVersion,
    contenido: [
      {
        type: "text",
        text: `Actividad: ${act.titulo}\nVersión A:\n${JSON.stringify(original, null, 1)}\n\nEscribe la versión ${letra}. Sugerencia para que no se repita con las demás versiones: ${CAMBIO_VERSION[letra] ?? "usa valores distintos a los de las otras versiones"}.`,
      },
    ],
  });
  const limpiar = (t: string) => t.replace(/\(\s*_*\s*\)|_{3,}/g, "").replace(/[ \t]{2,}/g, " ").trim();
  // Lo que no venga completo se queda como en la versión A (mismo número de opciones y renglones).
  const igualLargo = (nuevas: string[], antes?: string[]) => (antes?.length && nuevas.length === antes.length ? nuevas.map(limpiar) : antes);
  return {
    letra,
    reactivos: act.reactivos.map((r) => {
      const v = salida.reactivos.find((x) => x.numero === r.numero);
      const dibujo = v?.ilustracion.trim() ?? "";
      return {
        numero: r.numero,
        enunciado: v?.enunciado.trim() ? limpiar(v.enunciado) : r.enunciado,
        opciones: v ? igualLargo(v.opciones, r.opciones) : r.opciones,
        columnaA: v ? igualLargo(v.columnaA, r.columnaA) : r.columnaA,
        columnaB: v ? igualLargo(v.columnaB, r.columnaB) : r.columnaB,
        ilustracion: !r.ilustracion || !dibujo || dibujo.toLowerCase() === "conservar" ? r.ilustracion : (svgSeguro(dibujo) ?? r.ilustracion),
        respuesta: "",
      };
    }),
  };
}

/** Escribe las versiones B, C… de la actividad, en paralelo. */
export async function generarVersiones(act: Actividad, cantidad: number, uso: UsoIA): Promise<VersionActividad[]> {
  const letras = Array.from({ length: Math.max(0, cantidad - 1) }, (_, i) => letraVersion(i + 1));
  return Promise.all(letras.map((l) => generarVersion(act, l, uso)));
}

const EsquemaSolucionVersion = z.object({
  reactivos: z.array(z.object({ numero: z.number().int(), respuesta: z.string(), solucionPasos: z.array(z.string()), valores: z.array(z.number()) })),
});

const NOTA_VALORES = `- valores: los resultados numéricos finales de la respuesta, como números decimales y en el orden de los incisos (por ejemplo [2.5, 0.75]); lista vacía si la respuesta no es numérica.`;

const SISTEMA_RESOLVER_VERSION = `Eres un profesor experto de secundaria y bachillerato en México. Recibes la solución de la versión A de una actividad y la versión nueva, que solo cambia los valores numéricos. Resuelve la versión nueva siguiendo exactamente el mismo método, los mismos pasos y el mismo formato que la solución de la versión A, con los valores nuevos.
- Haz cada cálculo con cuidado y verifícalo. La respuesta debe ser correcta para los valores de la versión nueva.
- respuesta: con el mismo formato que en la versión A (opción múltiple: letra y texto de la opción correcta de la versión nueva; verdadero o falso: "V" o "F"; relación: pares como "1-c, 2-a"; desarrollo: resultado final con unidades, en texto simple sin LaTeX; abierto: los mismos criterios que la versión A, ajustados a los datos nuevos).
- solucionPasos: solo para desarrollo, una línea por paso como en la versión A, con LaTeX entre $…$; para los demás, lista vacía.
${RESPUESTAS_PLATAFORMA}
${NOTA_VALORES}`;

const EsquemaVerificacion = z.object({
  reactivos: z.array(z.object({ numero: z.number().int(), respuesta: z.string(), valores: z.array(z.number()) })),
});

const SISTEMA_VERIFICAR = `Eres un profesor experto de secundaria y bachillerato en México. Resuelve cada reactivo de la actividad con cuidado, de forma independiente, y verifica tus cálculos.
- respuesta: opción múltiple, la letra y el texto de la opción correcta; verdadero o falso, "V" o "F"; relación de columnas, pares como "1-c, 2-a"; paréntesis, las letras en orden; desarrollo, el resultado final con unidades en texto simple; abierto, una respuesta breve.
${RESPUESTAS_PLATAFORMA}
${NOTA_VALORES}`;

/** Imágenes del reactivo como texto para la IA: "a) descripción". */
function imagenesComoTexto(r: Reactivo) {
  return r.imagenes?.length ? r.imagenes.map((im, i) => `${String.fromCharCode(97 + i)}) ${im.descripcion}`) : undefined;
}

/** Reactivos de una versión como texto para la IA (sin solución). */
function reactivosComoTexto(act: Actividad) {
  return act.reactivos.map((r) => ({ numero: r.numero, tipo: r.tipo, enunciado: r.enunciado, opciones: r.opciones, columnaA: r.columnaA, columnaB: r.columnaB, imagenes: imagenesComoTexto(r) }));
}

/**
 * Resuelve otra versión con el método de la solución de la versión A y la verifica con una segunda
 * resolución independiente. Los reactivos en que no coinciden quedan marcados para que el profesor
 * los revise.
 */
export async function resolverVersion(act: Actividad, version: VersionActividad, uso: UsoIA): Promise<VersionActividad> {
  const comoVersion: Actividad = {
    ...act,
    reactivos: act.reactivos.map((r) => {
      const v = version.reactivos.find((x) => x.numero === r.numero);
      return v ? { ...r, enunciado: v.enunciado, opciones: v.opciones, columnaA: v.columnaA, columnaB: v.columnaB } : r;
    }),
  };
  const referencia = act.reactivos.map((r) => ({
    numero: r.numero,
    tipo: r.tipo,
    enunciado: r.enunciado,
    opciones: r.opciones,
    columnaA: r.columnaA,
    columnaB: r.columnaB,
    imagenes: imagenesComoTexto(r),
    pasos: r.pasos?.map((p) => p.nombre),
    solucionPasos: r.solucionPasos,
    respuesta: r.respuesta,
  }));
  const [solucion, verificacion] = await Promise.all([
    pedir({
      tipo: "resolver",
      uso,
      system: SISTEMA_RESOLVER_VERSION,
      esquema: EsquemaSolucionVersion,
      contenido: [
        {
          type: "text",
          text: `Actividad: ${act.titulo}\nCondiciones del profesor para resolver: ${act.condicionesSolucion?.trim() || "ninguna"}\nSolución de la versión A:\n${JSON.stringify(referencia, null, 1)}\n\nVersión ${version.letra} (resuélvela):\n${JSON.stringify(reactivosComoTexto(comoVersion), null, 1)}`,
        },
      ],
    }),
    pedir({
      tipo: "resolver",
      uso,
      system: SISTEMA_VERIFICAR,
      esquema: EsquemaVerificacion,
      contenido: [{ type: "text", text: `Actividad: ${act.titulo}\nReactivos:\n${JSON.stringify(reactivosComoTexto(comoVersion), null, 1)}` }],
    }),
  ]);
  const revisar: { numero: number; otra: string }[] = [];
  const reactivos = version.reactivos.map((v) => {
    const base = act.reactivos.find((r) => r.numero === v.numero);
    const s = solucion.reactivos.find((x) => x.numero === v.numero);
    const otra = verificacion.reactivos.find((x) => x.numero === v.numero);
    if (!base || !s) return v;
    if (!otra || !coinciden(base.tipo, s, otra)) revisar.push({ numero: v.numero, otra: otra?.respuesta ?? "" });
    return { ...v, respuesta: s.respuesta.trim(), solucionPasos: base.tipo === "desarrollo" && s.solucionPasos.length ? s.solucionPasos : undefined };
  });
  return { ...version, reactivos, revisar: revisar.length ? revisar : undefined };
}

/** Resuelve todas las versiones de la actividad (que ya tiene la solución de la A), en paralelo. */
export async function resolverVersiones(act: Actividad, uso: UsoIA): Promise<VersionActividad[] | undefined> {
  if (!act.versiones?.length) return act.versiones;
  return Promise.all(act.versiones.map((v) => resolverVersion(act, v, uso)));
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
- Sigue las condiciones que dé el profesor para resolverla (nivel de detalle, método, cifras significativas, etc.).
${RESPUESTAS_PLATAFORMA}
- En plataforma, desarrollo es un problema que el alumno resuelve a mano y sube como foto: escribe sus pasos y solución como en cualquier desarrollo.`;

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
    imagenes: imagenesComoTexto(r),
    tolerancia: r.tolerancia,
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
- comentario: retroalimentación breve para el alumno, en segunda persona, máximo 15 palabras. En reactivos cerrados con varios renglones no repitas las respuestas ni las opciones: ya se marcan sobre la hoja. Si es correcto, una frase de reconocimiento corta. Sin LaTeX ni signos de dólar: se imprime en el PDF tal cual.
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
      // Si tiene varios renglones, las respuestas ya se marcan sobre la hoja: no se repiten.
      comentario:
        esCerrado(r) && puntos === 0 && nIncisos > 1
          ? ia.comentario
          : esCerrado(r) && puntos === 0
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

// ---------- Evaluación de respuestas en plataforma (solo escritas y con archivo) ----------

const EsquemaEvaluacionPlataforma = z.object({
  reactivos: z.array(
    z.object({
      numero: z.number().int(),
      respuestaLeida: z.string(),
      puntosSugeridos: z.number(),
      confianza: z.enum(["alta", "media", "baja"]),
      comentario: z.string(),
      pasos: z.array(z.number()),
      criterios: z.array(z.number()),
    }),
  ),
  positivos: z.array(z.string()),
  mejoras: z.array(z.string()),
});

const SISTEMA_EVALUACION_PLATAFORMA = `Eres un asistente de evaluación para profesores de secundaria y bachillerato en México.
El alumno respondió una actividad en la app. Recibes la rúbrica confirmada por el profesor y SOLO los reactivos que requieren tu juicio: respuestas escritas (cortas o ensayos) y desarrollos que el alumno resolvió a mano y subió como foto o archivo. Los reactivos cerrados ya los calificó el sistema y no los recibes. Tu sugerencia la puede revisar el profesor.

Para cada reactivo que recibes:
- respuestaLeida: respuestas escritas, una síntesis fiel de lo que respondió (máximo 40 palabras). Desarrollos con foto: su resultado final tal como lo escribió; cadena vacía si no se lee.
- confianza: alta si se entiende con claridad; media si hay alguna duda; baja si la foto o la letra no permiten leerlo con seguridad. Nunca adivines.
- pasos: solo para desarrollo, un valor por cada paso de la rúbrica en el mismo orden: 1 completo y correcto, 0.5 parcial o con error menor, 0 falta o es incorrecto. Acepta procedimientos distintos si son correctos, salvo que el profesor indique lo contrario. Para los demás, lista vacía.
- criterios: solo para respuestas escritas que traen "criterios" en la rúbrica: un valor por cada criterio, en ese orden (1 lo cumple, 0.5 a medias, 0 no). Para los demás, lista vacía.
- puntosSugeridos: puntos según la rúbrica (entre 0 y el valor del reactivo).
- comentario: retroalimentación breve para el alumno, en segunda persona, máximo 20 palabras, sin LaTeX.

Si el profesor dio criterios con porcentajes o recomendaciones, síguelos.
Además:
- positivos: 2 o 3 aspectos que el alumno hizo bien en estas respuestas, concretos.
- mejoras: 2 o 3 aspectos a mejorar, concretos y accionables.
Escribe en español claro y amable, adecuado para adolescentes.`;

/** Lo que el alumno respondió en un reactivo que califica la IA. */
export interface RespuestaParaIA {
  numero: number;
  texto?: string;
  imagenes?: ImagenParaIA[];
}

/**
 * Evalúa con la IA solo las respuestas escritas y los desarrollos con archivo de una entrega en
 * plataforma. A la IA van la rúbrica, el texto y las fotos: nunca el nombre ni la matrícula.
 */
export async function evaluarRespuestasPlataforma(act: Actividad, respuestas: RespuestaParaIA[], uso: UsoIA): Promise<EvaluacionAlumno> {
  const numeros = new Set(respuestas.map((x) => x.numero));
  const rubrica = rubricaParaIA(act).filter((r) => numeros.has(r.numero));
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = respuestas.flatMap((x): Anthropic.Beta.BetaContentBlockParam[] => [
    { type: "text", text: x.imagenes?.length ? `Reactivo ${x.numero}: desarrollo del alumno en ${x.imagenes.length} archivo(s).` : `Reactivo ${x.numero}, respuesta escrita del alumno:\n${x.texto ?? ""}` },
    ...(x.imagenes?.length ? bloquesImagen(x.imagenes, `Reactivo ${x.numero}`) : []),
  ]);
  const salida = await pedir({
    tipo: "evaluacion",
    uso,
    system: `${SISTEMA_EVALUACION_PLATAFORMA}${act.sinSolucion ? NOTA_EVAL_SIN_SOLUCION : ""}${act.sinPuntaje ? NOTA_EVAL_SIN_PUNTAJE : ""}\n\nActividad: ${act.titulo}\nIndicaciones del profesor: ${act.instrucciones?.trim() || "ninguna"}${criteriosParaIA(act)}\nRúbrica de estos reactivos:\n${JSON.stringify(rubrica, null, 1)}`,
    esquema: EsquemaEvaluacionPlataforma,
    contenido: [...contenido, { type: "text", text: "Evalúa estas respuestas con la rúbrica." }],
  });
  const fijos = diccionarioDe(idiomaDe({ ...uso, actividadId: uso.actividadId ?? act.id }) ?? "es").alumno.correccion;
  const resultados = act.reactivos
    .filter((r) => numeros.has(r.numero))
    .map((r): ResultadoReactivo => {
      const ia = salida.reactivos.find((x) => x.numero === r.numero);
      if (!ia) return { numero: r.numero, puntosObtenidos: 0, respuestaLeida: "", confianza: "baja", comentario: fijos.noEncontrado };
      let puntos: number;
      let pasos: number[] | undefined;
      let criterios: number[] | undefined;
      if (r.tipo === "desarrollo" && r.pasos?.length) {
        pasos = r.pasos.map((_, i) => {
          const v = ia.pasos[i] ?? 0;
          return v >= 0.75 ? 1 : v >= 0.25 ? 0.5 : 0;
        });
        puntos = cuartos(r.pasos.reduce((s, p, i) => s + p.peso * pasos![i], 0) * r.puntos);
      } else if (r.tipo === "abierto" && criteriosDelReactivo(act, r.numero).length && ia.criterios.length) {
        const valores = (act.criterios ?? []).map(() => 0);
        criteriosDelReactivo(act, r.numero).forEach(({ indice }, j) => {
          const v = ia.criterios[j] ?? 0;
          valores[indice] = v >= 0.75 ? 1 : v >= 0.25 ? 0.5 : 0;
        });
        criterios = valores;
        puntos = cuartos((fraccionCriterios(act, criterios, r.numero) ?? 0) * r.puntos);
      } else {
        puntos = cuartos(Math.max(0, Math.min(r.puntos, ia.puntosSugeridos)));
      }
      return {
        numero: r.numero,
        puntosObtenidos: puntos,
        respuestaLeida: ia.respuestaLeida,
        confianza: ia.confianza,
        comentario: ia.comentario,
        pasos,
        ...(criterios ? { criterios } : {}),
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

// ---------- Plan de evaluación del curso ----------

const EsquemaPlan = z.object({
  pesos: z.array(z.object({ etiqueta: z.string(), porcentaje: z.number() })),
  notas: z.string(),
});

const SISTEMA_PLAN = `Eres un asistente para profesores de secundaria y bachillerato en México.
El profesor describe con sus palabras cómo quiere ponderar la calificación final de su curso por tipo de actividad (por ejemplo: "exámenes 50%, tareas 30% y proyecto 20%").
Recibes también la lista de tipos de actividad (etiquetas) que ya existen en el curso.
Devuelve el plan de evaluación:
- pesos: un elemento por tipo de actividad con su porcentaje de la calificación final.
  Usa exactamente el nombre de la etiqueta del curso cuando el profesor se refiera a ella, aunque lo escriba distinto (singular o plural, mayúsculas, sinónimos claros como "parciales" para "Examen").
  Si menciona un tipo que aún no existe en el curso, inclúyelo con el nombre que usó, en singular y con mayúscula inicial.
  Para las actividades sin etiqueta usa el nombre "" (cadena vacía), solo si el profesor las menciona.
  Los porcentajes deben sumar 100. Si el profesor da pesos que no suman 100 o da proporciones ("el doble que las tareas"), conviértelos a porcentajes que sumen 100. Si no da un número para algún tipo que menciona, reparte lo que falte en partes iguales.
  No incluyas tipos que el profesor no mencionó.
- notas: una o dos oraciones en español que expliquen cómo interpretaste las instrucciones (por ejemplo, qué etiqueta usaste para cada cosa o cómo ajustaste los porcentajes). Cadena vacía si no hubo nada que aclarar.`;

/** Convierte las instrucciones de ponderación del profesor en porcentajes por tipo de actividad (sin datos de alumnos). */
export async function generarPlanEvaluacion(instrucciones: string, etiquetas: string[], uso: UsoIA): Promise<{ pesos: { etiqueta: string; porcentaje: number }[]; notas: string }> {
  return pedir({
    tipo: "plan",
    uso: { ...uso, precision: uso.precision ?? { motor: "medio", esfuerzo: "bajo" } },
    system: SISTEMA_PLAN,
    esquema: EsquemaPlan,
    contenido: [
      {
        type: "text",
        text: `Tipos de actividad del curso: ${JSON.stringify(etiquetas)}\nInstrucciones del profesor:\n${instrucciones}`,
      },
    ],
  });
}

// ---------- Temario (syllabus) de una asignatura ----------

const EsquemaTemario = z.object({
  nombre: z.string(),
  nivel: z.string(),
  unidades: z.array(z.object({ nombre: z.string(), temas: z.array(z.object({ nombre: z.string(), subtemas: z.array(z.string()) })) })),
});

export type TemarioGenerado = z.infer<typeof EsquemaTemario>;

const SISTEMA_TEMARIO = `Eres un asistente para profesores de secundaria, bachillerato y universidad.
Arma el temario (syllabus) de una asignatura en tres niveles: unidades, temas de cada unidad y subtemas de cada tema.
- Si recibes un documento o un texto con el programa de la materia, transcribe fielmente sus unidades, temas y subtemas, en el orden en que aparecen. No inventes temas que no están, no resumas y conserva la numeración del documento si la tiene (por ejemplo "Unidad 2. Dinámica", "2.1 Leyes de Newton"). Ignora lo que no es temario: objetivos, criterios de evaluación, bibliografía, horarios y datos de la escuela o del profesor.
- Si recibes indicaciones del profesor (unidades, temas y nivel), propón un temario completo y bien ordenado para ese nivel, con nombres breves y claros. Respeta el número de unidades y los temas que pida.
- nombre: el nombre de la asignatura (del documento o de las indicaciones; cadena vacía si no se sabe).
- nivel: el nivel o grado si se menciona (por ejemplo "2.º de secundaria"); cadena vacía si no.
- Cada unidad debe tener al menos un tema. Un tema puede no tener subtemas.`;

/** Temario desde un PDF, desde el texto de un documento o desde las indicaciones del profesor. Sin datos de alumnos. */
export async function generarTemario(
  entrada: { pdf?: Buffer; texto?: string; indicaciones?: string; nombre?: string; nivel?: string },
  uso: UsoIA,
): Promise<TemarioGenerado> {
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (entrada.pdf) contenido.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: entrada.pdf.toString("base64") } });
  const datos = [
    entrada.nombre && `Asignatura: ${entrada.nombre}`,
    entrada.nivel && `Nivel: ${entrada.nivel}`,
    entrada.texto && `Texto del documento del profesor:\n${entrada.texto}`,
    entrada.indicaciones && `Indicaciones del profesor:\n${entrada.indicaciones}`,
    entrada.pdf && "Transcribe el temario del documento adjunto.",
  ].filter(Boolean);
  contenido.push({ type: "text", text: datos.join("\n\n") });
  return pedir({
    tipo: "temario",
    uso: { ...uso, precision: uso.precision ?? { motor: "medio", esfuerzo: "bajo" } },
    system: SISTEMA_TEMARIO,
    esquema: EsquemaTemario,
    contenido,
  });
}

// ---------- Mapa del temario: temas afines ----------

const EsquemaRelaciones = z.object({
  relaciones: z.array(z.object({ a: z.string(), b: z.string(), motivo: z.string() })),
});

const SISTEMA_RELACIONES = `Eres un asistente para profesores. Recibes el temario de una asignatura: cada unidad, tema y subtema tiene un código (por ejemplo "2" es la unidad 2, "2.3" su tema 3 y "2.3.1" el primer subtema de ese tema).
Encuentra los temas y subtemas afines: los que se necesitan uno al otro (prerrequisito), se aplican juntos o tratan la misma idea desde otra unidad.
- Cuando una unidad completa es base de otra unidad completa (por ejemplo, unidades y mediciones, o vectores, para toda la dinámica), relaciona las dos unidades con sus códigos de unidad ("1" y "4") en lugar de muchos temas sueltos.
- Si una unidad es herramienta de todas las demás (como mediciones o vectores en física), relaciónala con cada una de esas unidades.
- Da prioridad a las relaciones entre unidades distintas; dentro de una misma unidad solo las que no sean obvias por el orden.
- No relaciones un subtema con su propio tema.
- Devuelve de 8 a 40 relaciones, las más útiles para que el alumno vea cómo se conecta el temario.
- a y b: los códigos exactamente como aparecen. motivo: de 3 a 8 palabras (por ejemplo "la aceleración se usa en la segunda ley").`;

/** Propone temas y subtemas afines del temario. Solo recibe nombres de temas (sin datos de alumnos). */
export async function relacionarTemario(unidades: { nombre: string; temas: { nombre: string; subtemas: string[] }[] }[], uso: UsoIA) {
  const codigos = new Map<string, { u: number; t?: number; s?: number }>();
  const lineas: string[] = [];
  unidades.forEach((u, i) => {
    codigos.set(`${i + 1}`, { u: i });
    lineas.push(`${i + 1} Unidad: ${u.nombre}`);
    u.temas.forEach((t, j) => {
      const ct = `${i + 1}.${j + 1}`;
      codigos.set(ct, { u: i, t: j });
      lineas.push(`  ${ct} ${t.nombre}`);
      t.subtemas.forEach((sub, k) => {
        const cs = `${ct}.${k + 1}`;
        codigos.set(cs, { u: i, t: j, s: k });
        lineas.push(`    ${cs} ${sub}`);
      });
    });
  });
  const r = await pedir({
    tipo: "relaciones",
    uso: { ...uso, precision: uso.precision ?? { motor: "medio", esfuerzo: "bajo" } },
    system: SISTEMA_RELACIONES,
    esquema: EsquemaRelaciones,
    contenido: [{ type: "text", text: lineas.join("\n") }],
  });
  return r.relaciones
    .map((x) => ({ a: codigos.get(x.a.trim()), b: codigos.get(x.b.trim()), motivo: x.motivo.trim().slice(0, 120) }))
    .filter((x): x is { a: { u: number; t?: number; s?: number }; b: { u: number; t?: number; s?: number }; motivo: string } => Boolean(x.a && x.b));
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
