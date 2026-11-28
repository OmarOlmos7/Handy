// Redacción con IA de la ruta de mejora del perfil CREAR. A la IA solo van los números del perfil
// (calculados por el código) y el modelo CREAR del curso: nunca el nombre ni la matrícula.
import "server-only";
import { z } from "zod";
import { pedir, type UsoIA } from "./ia";
import { PROMPT_RUTA_MEJORA, VERSION_RUTA_MEJORA } from "./perfil/prompts/ruta_mejora_v1";

const EsquemaRuta = z.object({
  resumen: z.string(),
  fortalezas: z.array(z.string()),
  areas: z.array(z.string()),
  recomendaciones: z.array(z.string()),
});

export type TextosRuta = z.infer<typeof EsquemaRuta>;

export async function redactarRutaMejora(datos: unknown, uso: UsoIA): Promise<TextosRuta & { prompt: string }> {
  const salida = await pedir({
    tipo: "perfil_ruta",
    uso,
    system: PROMPT_RUTA_MEJORA,
    esquema: EsquemaRuta,
    contenido: [{ type: "text", text: `Datos del perfil:\n${JSON.stringify(datos, null, 1)}` }],
  });
  const recorta = (xs: string[], n: number) => xs.map((x) => x.trim().slice(0, 400)).filter(Boolean).slice(0, n);
  return {
    prompt: VERSION_RUTA_MEJORA,
    resumen: salida.resumen.trim().slice(0, 800),
    fortalezas: recorta(salida.fortalezas, 3),
    areas: recorta(salida.areas, 3),
    recomendaciones: recorta(salida.recomendaciones, 5),
  };
}
