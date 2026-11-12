// Llamadas a la API de Claude (visión) para la rúbrica y la evaluación.
// Los números finales (puntos, calificación) los calcula el código; Claude lee
// las hojas, compara procedimientos y redacta la retroalimentación.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { esCerrado, puntosReactivoCerrado } from "./calificar";
import { svgSeguro } from "./svg";
import type { Actividad, CriterioEvaluacion, Reactivo, ResultadoReactivo } from "./tipos";

const MODELO = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

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

async function pedir<T>(params: {
  system: string;
  contenido: Anthropic.Beta.BetaContentBlockParam[];
  esquema: z.ZodType<T>;
}): Promise<T> {
  let respuesta;
  try {
    respuesta = await cliente().beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      // Si un clasificador de seguridad rechaza la petición, la API la reintenta con otro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(params.esquema) },
      system: params.system,
      messages: [{ role: "user", content: params.contenido }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ErrorIA("La llave de la API de Claude no es válida.");
    if (e instanceof Anthropic.RateLimitError) throw new ErrorIA("Límite de uso de la API alcanzado. Intenta en un minuto.");
    if (e instanceof Anthropic.APIError) throw new ErrorIA(`Error de la API de Claude (${e.status ?? "red"}): ${e.message}`);
    throw e;
  }
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
  criterios: z.array(z.object({ nombre: z.string(), porcentaje: z.number(), descripcion: z.string() })),
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
- criterios: los criterios que indicó el profesor, con su porcentaje (0 si no dio porcentaje) y una descripción breve de qué se evalúa. Si no indicó criterios, lista vacía; no los inventes.
- Si los criterios aplican a los desarrollos (procedimiento, resultado, unidades…), refléjalos en los pasos y sus pesos. Si indicó cuántos puntos vale cada reactivo, respétalo.
- recomendaciones: las recomendaciones que dio el profesor para evaluar, una por elemento, redactadas de forma breve e imperativa (por ejemplo "Acepta procedimientos alternativos si son correctos"). Si no dio ninguna, lista vacía.

Si algo es ilegible, escribe tu mejor lectura y menciónalo en el enunciado entre corchetes.`;

export interface PropuestaRubrica {
  reactivos: Reactivo[];
  criterios: CriterioEvaluacion[];
  recomendaciones: string[];
}

export async function proponerRubrica(
  imagenes: ImagenParaIA[],
  datos: { titulo: string; instrucciones?: string },
): Promise<PropuestaRubrica> {
  const salida = await pedir({
    system: SISTEMA_RUBRICA,
    esquema: EsquemaRubrica,
    contenido: [
      ...bloquesImagen(imagenes, "Solución del profesor"),
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
      .map((c) => ({ ...c, porcentaje: Math.max(0, Math.min(100, Math.round(c.porcentaje))) })),
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
  criterios: z.array(z.object({ nombre: z.string(), porcentaje: z.number(), descripcion: z.string() })),
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
    }),
  ),
});

const SISTEMA_ACTIVIDAD = `Eres un diseñador de actividades para profesores de secundaria y bachillerato en México.
El profesor describe la actividad que quiere: tipos de reactivos, ponderaciones (puntos o porcentajes), temas, nivel y cualquier otra condición. Diseña una actividad impresa para que el alumno la resuelva a mano y la entregue con una foto.

Reglas:
- Respeta exactamente lo que pide el profesor: cantidad y tipo de reactivos, temas y puntos. Si indica los puntos de cada reactivo, úsalos tal cual aunque el total no sea 10. Si da porcentajes, reparte los puntos para que el total sea 10 (o el total que indique).
- instrucciones: exactamente 3 instrucciones breves para el alumno (máximo 20 palabras cada una), en imperativo. Marca con **doble asterisco** las palabras clave (por ejemplo "Resuelve en orden: **datos** con unidades → **ecuaciones** → **desarrollo** → **respuesta** en recuadro."). Incluye cómo responder cada tipo de reactivo que uses, unidades y redondeo si aplica. No menciones puntos ni porcentajes (la hoja ya los muestra) ni la instrucción de escanear el QR.
- criterios: cómo se evalúa cada problema, con porcentajes que sumen 100. Usa los que indique el profesor; si no indica y hay problemas de desarrollo, propón algo como Datos 5 %, Ecuaciones 15 %, Desarrollo 60 %, Respuesta 20 %. Si solo hay reactivos cerrados, lista vacía. descripcion: qué se evalúa, breve.
- tipo: verdadero_falso, opcion_multiple, relacion_columnas, parentesis (relación con letras entre paréntesis), desarrollo (problemas con procedimiento) o abierto (explicación, ensayo, dibujo).
- enunciado: el texto completo del reactivo, listo para imprimirse. No incluyas las opciones dentro del enunciado. Nunca escribas los puntos ni la ponderación dentro del enunciado: la hoja los muestra aparte. Si un problema tiene varias preguntas, escribe primero el planteamiento con sus datos y al final los incisos en orden: "a) … b) … c) …". Sé eficiente con las palabras: si los incisos comparten el verbo, escríbelo una sola vez antes de los incisos y no lo repitas (por ejemplo "Calcula: a) El momento de inercia del disco. b) El torque respecto al eje. c) La aceleración angular."). Sé conciso: planteamientos de máximo 45 palabras y hasta 3 incisos por problema, salvo que el profesor pida otra cosa. La actividad debe caber en las páginas tamaño carta indicadas (cada problema de desarrollo ocupa casi media página).
- opciones: solo para opción múltiple, de 3 a 5 opciones con su letra, como "a) 9.8 m/s²". Para los demás tipos, lista vacía.
- columnaA y columnaB: solo para relación de columnas y paréntesis. columnaA numerada ("1. Inercia"), columnaB con letras ("a) Resistencia de un cuerpo a cambiar su movimiento"); mezcla el orden de columnaB. El alumno escribe la letra de columnaB junto a cada elemento de columnaA. Para los demás, listas vacías.
- ilustracion: para problemas de desarrollo y preguntas abiertas, un dibujo pequeño y esquemático en SVG que ayude a entender el ejercicio (por ejemplo, el disco con la cuerda y la fuerza, la llave con el ángulo, el bloque con sus fuerzas). Reglas del SVG: un solo elemento <svg> con viewBox="0 0 160 120" y xmlns="http://www.w3.org/2000/svg"; solo figuras simples (line, rect, circle, ellipse, path, polygon, text); trazo #1e293b de 1.5 a 2, acentos en #2554e8; etiquetas cortas (letras o datos como "F", "R", "60°") en font-family="Arial" de 10 a 12 px; sin imágenes, scripts, enlaces ni estilos externos. No pongas la respuesta en el dibujo. Para reactivos cerrados, cadena vacía.
- lineas: tamaño del espacio para responder: 0 para reactivos cerrados, de 4 a 8 para abiertos y de 10 a 16 para desarrollo (más incisos, más espacio).
- puntos, tema (de la materia) y habilidad ("Comprensión de conceptos", "Resolución de problemas", "Interpretación de gráficas", "Comunicación escrita", etc.).
- No escribas espacios en blanco, paréntesis vacíos ni líneas para responder dentro de los textos: la hoja impresa ya los agrega (círculos, casillas V/F, paréntesis y renglones).
- No incluyas las respuestas: la solución se prepara después.
- Usa español de México, lenguaje adecuado para adolescentes y datos realistas. No pidas datos personales al alumno.`;

export interface ActividadGenerada {
  instrucciones: string[];
  criterios: CriterioEvaluacion[];
  reactivos: Reactivo[];
}

export async function generarActividad(datos: { titulo: string; materia: string; grupo: string; prompt: string; paginas?: number }): Promise<ActividadGenerada> {
  const salida = await pedir({
    system: SISTEMA_ACTIVIDAD,
    esquema: EsquemaActividad,
    contenido: [
      {
        type: "text",
        text: `Materia: ${datos.materia}\nGrupo: ${datos.grupo}\nTítulo: ${datos.titulo}\nPáginas tamaño carta: ${datos.paginas ?? 1}\n\nLo que pide el profesor:\n${datos.prompt}`,
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
      .map((c) => ({ ...c, porcentaje: Math.max(0, Math.min(100, Math.round(c.porcentaje))) })),
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
        ilustracion: cerrado
          ? undefined
          : r.ilustracion.trim().toLowerCase() === "conservar"
            ? anteriores.find((x) => x.numero === i + 1)?.ilustracion
            : svgSeguro(r.ilustracion),
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
export async function editarActividad(act: Actividad, peticion: string): Promise<ActividadGenerada> {
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
    })),
  };
  const salida = await pedir({
    system: SISTEMA_EDITAR,
    esquema: EsquemaActividad,
    contenido: [
      {
        type: "text",
        text: `Actividad actual:\n${JSON.stringify(actual, null, 1)}\n\nPáginas tamaño carta: ${act.paginas}\n\nPetición del profesor:\n${peticion}`,
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
- Para abiertos, en respuesta pon los criterios que debe cumplir una buena respuesta y un ejemplo breve.
- Respeta el número, el tipo y los puntos de cada reactivo tal como vienen. Si la actividad viene en imágenes, léela de ahí.
- pagina e y: si la actividad viene como texto, usa pagina 1 e y 0.
- Sigue las condiciones que dé el profesor para resolverla (nivel de detalle, método, cifras significativas, etc.).`;

export async function resolverActividad(
  act: Actividad,
  datos: { condiciones: string; imagenes?: ImagenParaIA[] },
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
- puntosSugeridos: puntos que asignarías según la rúbrica (entre 0 y el valor del reactivo).
- comentario: retroalimentación breve para el alumno, en segunda persona, máximo 15 palabras. Si es correcto, una frase de reconocimiento corta.
- pagina, y, x: dónde está la respuesta en la hoja del alumno (página desde 1; y de 0 arriba a 1 abajo; x de 0 izquierda a 1 derecha, al final de la respuesta). Ahí se dibuja la marca de corrección.

Si el profesor dio criterios de evaluación con porcentajes o recomendaciones, síguelos al asignar puntos y al redactar los comentarios.

Además:
- positivos: 2 o 3 aspectos que el alumno hizo bien, concretos.
- mejoras: 2 o 3 aspectos a mejorar, concretos y accionables.
Escribe en español claro y amable, adecuado para adolescentes.`;

function criteriosParaIA(act: Actividad) {
  let t = "";
  if (act.criterios?.length)
    t += `\nCriterios de evaluación: ${act.criterios.map((c) => `${c.nombre}${c.porcentaje ? ` (${c.porcentaje} %)` : ""}: ${c.descripcion}`).join("; ")}`;
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
  }));
}

export interface EvaluacionAlumno {
  resultados: ResultadoReactivo[];
  positivos: string[];
  mejoras: string[];
}

const cuartos = (n: number) => Math.round(n * 4) / 4;

export async function evaluarEntrega(act: Actividad, imagenes: ImagenParaIA[]): Promise<EvaluacionAlumno> {
  const salida = await pedir({
    system: `${SISTEMA_EVALUACION}\n\nActividad: ${act.titulo}\nIndicaciones del profesor: ${act.instrucciones?.trim() || "ninguna"}${criteriosParaIA(act)}\nRúbrica:\n${JSON.stringify(rubricaParaIA(act), null, 1)}`,
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
        comentario: "No se encontró este reactivo en la hoja. Verifica.",
        ubicacion: { pagina: r.pagina, y: r.y ?? 0.5 },
      };
    }
    let puntos: number;
    let pasos: number[] | undefined;
    if (esCerrado(r)) {
      puntos = puntosReactivoCerrado(r, ia.respuestaLeida) ?? 0;
    } else if (r.tipo === "desarrollo" && r.pasos?.length) {
      pasos = r.pasos.map((_, i) => {
        const v = ia.pasos[i] ?? 0;
        return v >= 0.75 ? 1 : v >= 0.25 ? 0.5 : 0;
      });
      const fraccion = r.pasos.reduce((s, p, i) => s + p.peso * pasos![i], 0);
      puntos = cuartos(fraccion * r.puntos);
    } else {
      puntos = cuartos(Math.max(0, Math.min(r.puntos, ia.puntosSugeridos)));
    }
    return {
      numero: r.numero,
      puntosObtenidos: puntos,
      respuestaLeida: ia.respuestaLeida,
      confianza: ia.confianza,
      // En cerrados el comentario debe coincidir con lo que calculó el código.
      comentario:
        esCerrado(r) && puntos === 0
          ? `La respuesta correcta es ${r.respuesta}.`
          : esCerrado(r) && puntos === r.puntos
            ? "Correcto."
            : ia.comentario,
      pasos,
      ubicacion: {
        pagina: Math.max(1, Math.min(imagenes.length, ia.pagina || r.pagina)),
        y: Math.max(0, Math.min(1, ia.y)),
        x: Math.max(0, Math.min(1, ia.x)),
      },
    };
  });

  return { resultados, positivos: salida.positivos, mejoras: salida.mejoras };
}
