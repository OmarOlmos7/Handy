// IA de los proyectos: propone la rúbrica base de cada etapa y, si el profesor la pide, una
// sugerencia de evaluación a partir de la evidencia. Los puntajes finales los decide el profesor
// y los promedios los calcula lib/proyectos. A la IA nunca van el nombre ni la matrícula.
import "server-only";
import { z } from "zod";
import { bloquesMaterial, pedir, type UsoIA } from "./ia";
import type { MaterialParaIA } from "./material-ia";
import { limpiarCriterio, nivelesDe, repartirCien } from "./proyectos";
import type { CriterioProyecto, EtapaProyecto, NivelProyecto, TipoEtapaProyecto } from "./tipos";

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
      /** Lo que se observa en cada nivel, en el orden de los niveles dados. */
      niveles: z.array(z.string()),
    }),
  ),
});

const SISTEMA_RUBRICA = `Eres un asistente de evaluación para profesores de secundaria, bachillerato y universidad en México.
El profesor evalúa un proyecto por etapas y te pide la rúbrica analítica de una etapa. Varios profesores la usarán de forma independiente, así que debe ser clara y observable.
- De 4 a 6 elementos (criterios) propios del tipo de etapa y del proyecto, sin repetir ideas. Si el profesor da una lista de criterios, usa exactamente esos (puedes mejorar su redacción) y no agregues otros.
- nombre: corto (2 a 5 palabras). descripcion: qué se evalúa, en una oración.
- porcentaje: peso del elemento; entre todos suman 100. Si el profesor dio porcentajes, respétalos.
- niveles: una descripción por cada nivel de desempeño, en el mismo orden y número de niveles que se te dan (del más alto al más bajo), en una o dos oraciones concretas y verificables (evita "muy bien", "regular"). Cada nivel trae su rango de puntos; la descripción debe corresponder a ese rango.
- Liga los elementos con las evidencias que se van a valorar (los entregables de la etapa y las que indique el profesor): di en la descripción qué evidencia se revisa.
- Si la etapa es oral, incluye dominio del tema, comunicación y respuestas a preguntas; en equipo, la participación de todos.
- Si el profesor dio más indicaciones, respétalas.`;

/** Rúbrica base de una etapa del proyecto (elementos con su peso y la descripción de cada nivel). */
export async function generarRubricaEtapa(
  datos: {
    titulo: string;
    descripcion: string;
    objetivo?: string;
    competencias?: string[];
    materia?: string;
    etapa: Pick<EtapaProyecto, "nombre" | "tipo" | "instrucciones" | "porEquipo" | "conEvidencia" | "entregables">;
    niveles: NivelProyecto[];
    /** Criterios que pide el profesor (uno por renglón, opcionalmente con su %). */
    criterios?: string;
    /** Evidencias a valorar que pide el profesor, además de los entregables. */
    evidencias?: string;
    indicaciones?: string;
  },
  uso: UsoIA,
): Promise<CriterioProyecto[]> {
  const e = datos.etapa;
  const entregables = (e.entregables ?? []).map((x) => `- ${x.nombre}${x.descripcion ? `: ${x.descripcion}` : ""}`).join("\n");
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
          datos.descripcion ? `Contexto del proyecto: ${datos.descripcion}` : "",
          datos.objetivo ? `Objetivo del proyecto: ${datos.objetivo}` : "",
          datos.competencias?.length ? `Habilidades y competencias a desarrollar:\n${datos.competencias.map((c) => `- ${c}`).join("\n")}` : "",
          `Etapa: ${e.nombre}`,
          `Tipo de etapa: ${TIPO_PARA_IA[e.tipo]}`,
          `Se evalúa ${e.porEquipo ? "por equipo" : "a cada alumno"}; ${e.conEvidencia ? "con evidencia que se sube a la app" : "sin archivo de evidencia (se observa en vivo)"}.`,
          e.instrucciones ? `Lo que debe hacer y entregar el alumno:\n${e.instrucciones}` : "",
          entregables ? `Entregables de la etapa:\n${entregables}` : "",
          `Niveles de desempeño (${datos.niveles.length}, del más alto al más bajo; rango en % de los puntos del elemento):\n${datos.niveles
            .map((n, i) => `${i + 1}. ${n.nombre}: ${n.min} a ${n.max}`)
            .join("\n")}`,
          datos.criterios?.trim() ? `Criterios que pide el profesor:\n${datos.criterios.trim()}` : "",
          datos.evidencias?.trim() ? `Evidencias a valorar:\n${datos.evidencias.trim()}` : "",
          datos.indicaciones?.trim() ? `Indicaciones del profesor para la rúbrica:\n${datos.indicaciones.trim()}` : "",
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
    limpiarCriterio({ id: `c${i + 1}`, nombre: c.nombre, descripcion: c.descripcion, porcentaje: porcentajes[i], niveles: c.niveles }, i, datos.niveles.length),
  );
}

const EsquemaSugerencia = z.object({
  criterios: z.array(z.object({ numero: z.number().int(), nivel: z.number().int(), puntaje: z.number(), comentario: z.string() })),
  comentario: z.string(),
  mejoras: z.array(z.string()),
});

const SISTEMA_SUGERENCIA = `Eres un asistente de evaluación para profesores. Recibes la evidencia que entregó un alumno (o un equipo) en una etapa de un proyecto y la rúbrica de esa etapa.
Propón una evaluación que el profesor revisará y corregirá antes de guardarla:
- Para cada elemento de la rúbrica (por su número): el número del nivel que mejor describe la evidencia, un puntaje de 0 a 100 dentro del rango de ese nivel y un comentario breve, concreto y respetuoso dirigido al alumno (en segunda persona), que cite lo que se ve en la evidencia.
- comentario: retroalimentación general en 2 o 3 oraciones.
- mejoras: de 2 a 4 áreas de mejora accionables.
- Si un elemento no se puede juzgar con la evidencia (por ejemplo, la exposición oral o un audio o video que no puedes ver), asígnale el nivel más bajo que todavía aprueba, con el mínimo de su rango, y di en su comentario que lo debe valorar el profesor.
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
  const niveles = nivelesDe(e);
  const rubrica = e.criterios
    .map(
      (c, i) =>
        `${i + 1}. ${c.nombre} (${c.porcentaje} %): ${c.descripcion}\n` +
        niveles.map((n, k) => `   - nivel ${k + 1} (${n.min} a ${n.max}): ${c.niveles[k] || "—"}`).join("\n"),
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
    // El puntaje queda dentro del rango del nivel elegido (lo decide el código, no la IA).
    const nivel = s ? niveles[Math.max(0, Math.min(niveles.length - 1, s.nivel - 1))] : undefined;
    const bruto = s && Number.isFinite(s.puntaje) ? s.puntaje : (nivel?.max ?? 70);
    const acotado = nivel ? Math.max(nivel.min, Math.min(nivel.max, bruto)) : Math.max(0, Math.min(100, bruto));
    const puntaje = Math.round(acotado * 10) / 10;
    return { criterioId: c.id, puntaje, comentario: (s?.comentario ?? "").trim().slice(0, 1500) };
  });
  return {
    criterios,
    comentario: salida.comentario.trim().slice(0, 3000),
    mejoras: salida.mejoras.map((m) => m.trim()).filter(Boolean).slice(0, 6),
  };
}
