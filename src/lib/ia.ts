// Llamadas a la API de Claude (visión) para la rúbrica y la evaluación.
// Los números finales (puntos, calificación) los calcula el código; Claude lee
// las hojas, compara procedimientos y redacta la retroalimentación.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { esCerrado, puntosReactivoCerrado } from "./calificar";
import type { Actividad, Reactivo, ResultadoReactivo } from "./tipos";

const MODELO = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

export class ErrorIA extends Error {}

export function iaDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function cliente() {
  if (!iaDisponible()) {
    throw new ErrorIA(
      "Falta la llave de la API de Claude. Agrega ANTHROPIC_API_KEY en el archivo .env.local y reinicia el servidor.",
    );
  }
  return new Anthropic();
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

Si algo es ilegible, escribe tu mejor lectura y menciónalo en el enunciado entre corchetes.`;

export async function proponerRubrica(
  imagenes: ImagenParaIA[],
  datos: { titulo: string; instrucciones?: string },
): Promise<Reactivo[]> {
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
  return salida.reactivos.map((r, i) => {
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
- pagina e y: dónde está la respuesta en la hoja del alumno (página desde 1; y de 0 arriba a 1 abajo).

Además:
- positivos: 2 o 3 aspectos que el alumno hizo bien, concretos.
- mejoras: 2 o 3 aspectos a mejorar, concretos y accionables.
Escribe en español claro y amable, adecuado para adolescentes.`;

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
    system: `${SISTEMA_EVALUACION}\n\nActividad: ${act.titulo}\nIndicaciones del profesor: ${act.instrucciones?.trim() || "ninguna"}\nRúbrica:\n${JSON.stringify(rubricaParaIA(act), null, 1)}`,
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
      },
    };
  });

  return { resultados, positivos: salida.positivos, mejoras: salida.mejoras };
}
