// IA de los proyectos: propone la rúbrica base de cada etapa y, si el profesor la pide, una
// sugerencia de evaluación a partir de la evidencia. Los puntajes finales los decide el profesor
// y los promedios los calcula lib/proyectos. A la IA nunca van el nombre ni la matrícula.
import "server-only";
import { z } from "zod";
import { bloquesMaterial, pedir, type UsoIA } from "./ia";
import type { MaterialParaIA } from "./material-ia";
import { NIVELES_RUBRICA, limpiarCriterio, repartirCien } from "./proyectos";
import type { CriterioProyecto, EtapaProyecto, TipoEtapaProyecto } from "./tipos";

const TIPO_PARA_IA: Record<TipoEtapaProyecto, string> = {
  reporte: "avance de reporte escrito (documento, hoja de cálculo o presentación que se entrega)",
  oral_grupal: "presentación oral grupal (exposición en equipo ante el grupo, con apoyo visual)",
  entrevista: "entrevista oral individual (el profesor pregunta a cada alumno sobre su aporte y lo que aprendió)",
  demostracion: "demostración del proyecto (prototipo, producto o resultado funcionando ante evaluadores)",
};

const EsquemaRubrica = z.object({
  criterios: z.array(
    z.object({
      nombre: z.string(),
      descripcion: z.string(),
      porcentaje: z.number(),
      excelente: z.string(),
      bueno: z.string(),
      suficiente: z.string(),
      insuficiente: z.string(),
    }),
  ),
});

const SISTEMA_RUBRICA = `Eres un asistente de evaluación para profesores de secundaria, bachillerato y universidad en México.
El profesor evalúa un proyecto por etapas y te pide la rúbrica analítica de una etapa. Varios profesores la usarán de forma independiente, así que debe ser clara y observable.
- De 4 a 6 elementos (criterios) propios del tipo de etapa y del proyecto, sin repetir ideas.
- nombre: corto (2 a 5 palabras). descripcion: qué se evalúa, en una oración.
- porcentaje: peso del elemento; entre todos suman 100.
- excelente, bueno, suficiente, insuficiente: lo que se observa en cada nivel, en una o dos oraciones concretas y verificables (evita "muy bien", "regular").
- Si la etapa tiene evidencia digital (documento, presentación, audio o video), incluye elementos sobre la calidad de esa evidencia; si es oral, sobre dominio del tema, comunicación y respuestas a preguntas; en equipo, sobre la participación de todos.
- Si el profesor indicó criterios o porcentajes, respétalos.`;

/** Rúbrica base de una etapa del proyecto (elementos con su peso y la descripción de cada nivel). */
export async function generarRubricaEtapa(
  datos: { titulo: string; descripcion: string; materia?: string; etapa: Pick<EtapaProyecto, "nombre" | "tipo" | "instrucciones" | "porEquipo" | "conEvidencia">; indicaciones?: string },
  uso: UsoIA,
): Promise<CriterioProyecto[]> {
  const e = datos.etapa;
  const salida = await pedir({
    tipo: "proyecto_rubrica",
    uso,
    system: SISTEMA_RUBRICA,
    esquema: EsquemaRubrica,
    contenido: [
      {
        type: "text",
        text: [
          datos.materia ? `Materia: ${datos.materia}` : "",
          `Proyecto: ${datos.titulo}`,
          datos.descripcion ? `Descripción del proyecto: ${datos.descripcion}` : "",
          `Etapa: ${e.nombre}`,
          `Tipo de etapa: ${TIPO_PARA_IA[e.tipo]}`,
          `Se evalúa ${e.porEquipo ? "por equipo" : "a cada alumno"}; ${e.conEvidencia ? "con evidencia que se sube a la app" : "sin archivo de evidencia (se observa en vivo)"}.`,
          e.instrucciones ? `Lo que debe hacer y entregar el alumno:\n${e.instrucciones}` : "",
          datos.indicaciones ? `Indicaciones del profesor para la rúbrica:\n${datos.indicaciones}` : "",
          "Genera la rúbrica de la etapa.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });
  const criterios = salida.criterios.filter((c) => c.nombre.trim()).slice(0, 8);
  const porcentajes = repartirCien(criterios.map((c) => c.porcentaje));
  return criterios.map((c, i) =>
    limpiarCriterio({ id: `c${i + 1}`, nombre: c.nombre, descripcion: c.descripcion, porcentaje: porcentajes[i], niveles: [c.excelente, c.bueno, c.suficiente, c.insuficiente] }, i),
  );
}

const EsquemaSugerencia = z.object({
  criterios: z.array(z.object({ numero: z.number().int(), nivel: z.enum(["excelente", "bueno", "suficiente", "insuficiente"]), puntaje: z.number(), comentario: z.string() })),
  comentario: z.string(),
  mejoras: z.array(z.string()),
});

const SISTEMA_SUGERENCIA = `Eres un asistente de evaluación para profesores. Recibes la evidencia que entregó un alumno (o un equipo) en una etapa de un proyecto y la rúbrica de esa etapa.
Propón una evaluación que el profesor revisará y corregirá antes de guardarla:
- Para cada elemento de la rúbrica (por su número): el nivel que mejor describe la evidencia, un puntaje de 0 a 100 coherente con el nivel (excelente ≈ 100, bueno ≈ 85, suficiente ≈ 70, insuficiente ≤ 50) y un comentario breve, concreto y respetuoso dirigido al alumno (en segunda persona), que cite lo que se ve en la evidencia.
- comentario: retroalimentación general en 2 o 3 oraciones.
- mejoras: de 2 a 4 áreas de mejora accionables.
- Si un elemento no se puede juzgar con la evidencia (por ejemplo, la exposición oral o un audio o video que no puedes ver), asígnale el nivel "suficiente" con puntaje 70 y di en su comentario que lo debe valorar el profesor.
- No inventes contenido que no esté en la evidencia.`;

export interface SugerenciaEvaluacion {
  criterios: { criterioId: string; puntaje: number; comentario: string }[];
  comentario: string;
  mejoras: string[];
}

/** Sugerencia de evaluación de la evidencia de una etapa con su rúbrica. */
export async function sugerirEvaluacionEtapa(
  datos: { titulo: string; etapa: EtapaProyecto; material: MaterialParaIA },
  uso: UsoIA,
): Promise<SugerenciaEvaluacion> {
  const e = datos.etapa;
  const rubrica = e.criterios
    .map(
      (c, i) =>
        `${i + 1}. ${c.nombre} (${c.porcentaje} %): ${c.descripcion}\n` +
        NIVELES_RUBRICA.map((n, k) => `   - ${n.clave}: ${c.niveles[k] || "—"}`).join("\n"),
    )
    .join("\n");
  const salida = await pedir({
    tipo: "proyecto_evaluar",
    uso,
    system: SISTEMA_SUGERENCIA,
    esquema: EsquemaSugerencia,
    contenido: [
      ...bloquesMaterial(datos.material, "Evidencia"),
      {
        type: "text",
        text: `Proyecto: ${datos.titulo}\nEtapa: ${e.nombre} (${TIPO_PARA_IA[e.tipo]})\n${e.instrucciones ? `Instrucciones de la etapa:\n${e.instrucciones}\n` : ""}\nRúbrica:\n${rubrica}\n\nPropón la evaluación.`,
      },
    ],
  });
  const criterios = e.criterios.map((c, i) => {
    const s = salida.criterios.find((x) => x.numero === i + 1);
    const nivel = NIVELES_RUBRICA.find((n) => n.clave === s?.nivel);
    const puntaje = s && Number.isFinite(s.puntaje) ? Math.round(Math.max(0, Math.min(100, s.puntaje))) : (nivel?.valor ?? 70);
    return { criterioId: c.id, puntaje, comentario: (s?.comentario ?? "").trim().slice(0, 1500) };
  });
  return {
    criterios,
    comentario: salida.comentario.trim().slice(0, 3000),
    mejoras: salida.mejoras.map((m) => m.trim()).filter(Boolean).slice(0, 6),
  };
}
