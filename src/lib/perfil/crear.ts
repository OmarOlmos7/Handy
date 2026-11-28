// Modelo CREAR: Comprender, Representar, Estrategia, Aplicar y Resultado, más la transferencia a
// casos nuevos. Cada etapa se asocia a un nivel de la taxonomía SOLO y a un proceso de Bloom
// revisada. El profesor adapta el modelo a la disciplina de su curso partiendo de una plantilla.
// Funciones puras.
import type { DefinicionEtapaCrear, EtapaCrear, ModeloCrearCurso } from "../tipos";

export const ETAPAS_CREAR: readonly EtapaCrear[] = ["comprender", "representar", "estrategia", "aplicar", "resultado", "transferencia"];

/** Nivel de la taxonomía SOLO que corresponde a cada etapa lograda. */
export type NivelSolo =
  | "preestructural"
  | "uniestructural"
  | "multiestructural_basico"
  | "multiestructural_avanzado"
  | "relacional_basico"
  | "relacional_avanzado"
  | "relacional_consolidado"
  | "abstracto_extendido";

export const SOLO_DE_ETAPA: Record<EtapaCrear, NivelSolo> = {
  comprender: "multiestructural_basico",
  representar: "multiestructural_avanzado",
  estrategia: "relacional_basico",
  aplicar: "relacional_avanzado",
  resultado: "relacional_consolidado",
  transferencia: "abstracto_extendido",
};

export const CAMPOS_ETAPA: readonly (keyof DefinicionEtapaCrear)[] = ["elementos", "procesos", "modelos", "evidencias"];

/** Largo máximo de cada campo que escribe el profesor. */
export const LARGO_CAMPO = 800;

type Plantilla = Record<EtapaCrear, DefinicionEtapaCrear>;

const d = (elementos: string, procesos: string, modelos: string, evidencias: string): DefinicionEtapaCrear => ({ elementos, procesos, modelos, evidencias });

/** Plantillas de partida por disciplina. El profesor las ajusta a su curso. */
export const PLANTILLAS: Record<string, Plantilla> = {
  general: {
    comprender: d("Datos, conceptos y condiciones del caso; lo que se pide.", "Identifica y nombra los elementos pertinentes; reformula la pregunta.", "Lista de datos, glosario, preguntas guía.", "Datos completos y la pregunta escrita con sus palabras."),
    representar: d("Relaciones entre los elementos del caso.", "Construye una representación textual o gráfica de su interpretación.", "Esquema, diagrama, tabla o mapa conceptual.", "Una representación donde aparecen juntos todos los elementos pertinentes."),
    estrategia: d("Principios, modelos o métodos del área que resuelven el caso.", "Elige el método, ordena los pasos y explica por qué.", "Plan de solución, secuencia de pasos.", "Pasos escritos y justificados antes de desarrollar."),
    aplicar: d("Operaciones, argumentos o productos que pide la estrategia.", "Ejecuta la estrategia de forma completa y coherente.", "Desarrollo, cálculo, argumentación o producto.", "Desarrollo completo donde cada paso se apoya en el anterior."),
    resultado: d("Resultado final y criterios de validez.", "Declara el resultado, lo verifica y corrige si hace falta.", "Verificación, comparación con lo esperado, conclusión.", "Resultado explícito y justificado; errores detectados y corregidos."),
    transferencia: d("Casos de otro contexto que usan los mismos conceptos.", "Aplica el proceso completo sin apoyo a un caso nuevo y generaliza.", "Caso de transferencia marcado por el profesor.", "Caso nuevo resuelto con CREAR completo y una generalización."),
  },
  fisica: {
    comprender: d("Magnitudes, unidades, sistema de referencia, incógnita.", "Extrae datos con unidades e identifica qué se pide.", "Tabla de datos, conversión de unidades.", "Datos con unidades homogéneas e incógnita definida."),
    representar: d("Cuerpos, fuerzas, trayectorias, estados inicial y final.", "Dibuja la situación física y ubica las magnitudes.", "Diagrama de cuerpo libre, esquema, gráfica.", "Diagrama con ejes, sentidos y todas las magnitudes."),
    estrategia: d("Leyes y principios (Newton, conservación, cinemática).", "Elige la ley o el modelo y plantea las ecuaciones.", "Ecuaciones del modelo, supuestos.", "Ecuaciones planteadas y el principio que las justifica."),
    aplicar: d("Sustitución, despeje, operaciones con unidades.", "Desarrolla el álgebra y los cálculos.", "Desarrollo algebraico y numérico.", "Sustitución correcta y desarrollo sin saltos."),
    resultado: d("Valor final, unidades, orden de magnitud, sentido físico.", "Verifica unidades y coherencia física.", "Análisis dimensional, caso límite.", "Resultado con unidades y una verificación escrita."),
    transferencia: d("Fenómenos de otro contexto con las mismas leyes.", "Reconoce el mismo principio en una situación nueva.", "Problema de contexto distinto.", "Resuelve el caso nuevo y explica qué principio comparte."),
  },
  matematicas: {
    comprender: d("Datos, condiciones, variables y lo que se pide.", "Identifica la información y el tipo de problema.", "Lista de datos y definiciones.", "Variables definidas y condiciones del problema."),
    representar: d("Relaciones entre variables.", "Traduce el enunciado a una representación matemática.", "Gráfica, figura, tabla o expresión simbólica.", "Representación correcta y completa del enunciado."),
    estrategia: d("Teoremas, propiedades y métodos.", "Elige el método y ordena los pasos.", "Plan: método, fórmulas y orden.", "Método elegido y justificado."),
    aplicar: d("Operaciones algebraicas, cálculo, demostración.", "Ejecuta el procedimiento con rigor.", "Desarrollo paso a paso.", "Procedimiento completo y sin errores de operación."),
    resultado: d("Solución y su validez.", "Comprueba la solución en el enunciado.", "Sustitución de vuelta, estimación.", "Solución comprobada y expresada como se pide."),
    transferencia: d("Problemas de otro contexto con la misma estructura.", "Aplica el método a una situación nueva.", "Problema de aplicación distinto.", "Caso nuevo resuelto y estructura común identificada."),
  },
  quimica: {
    comprender: d("Sustancias, cantidades, condiciones y unidades.", "Identifica reactivos, productos y lo que se pide.", "Tabla de datos, nomenclatura.", "Sustancias y datos con unidades correctas."),
    representar: d("Reacción, estructuras, sistema.", "Representa la reacción o el proceso.", "Ecuación química, estructura de Lewis, esquema de proceso.", "Ecuación balanceada o representación correcta."),
    estrategia: d("Leyes ponderales, estequiometría, equilibrio.", "Plantea la ruta de cálculo.", "Factores de conversión, relaciones molares.", "Ruta de cálculo con las relaciones necesarias."),
    aplicar: d("Cálculos estequiométricos o de concentración.", "Ejecuta los cálculos con unidades.", "Desarrollo numérico.", "Cálculos correctos con unidades."),
    resultado: d("Cantidad final, cifras significativas, sentido químico.", "Verifica unidades, cifras y coherencia.", "Comparación con valores esperados.", "Resultado con unidades, cifras y verificación."),
    transferencia: d("Procesos químicos de otro contexto.", "Aplica la misma ruta a un caso nuevo.", "Caso de aplicación industrial o cotidiana.", "Caso nuevo resuelto con la misma ruta."),
  },
  programacion: {
    comprender: d("Entradas, salidas, restricciones y casos de prueba.", "Identifica qué debe hacer el programa.", "Especificación, ejemplos de entrada y salida.", "Entradas, salidas y restricciones escritas."),
    representar: d("Estructuras de datos y flujo del problema.", "Modela el problema antes de codificar.", "Diagrama de flujo, pseudocódigo, diagrama de clases.", "Modelo que cubre todos los casos."),
    estrategia: d("Algoritmos y patrones.", "Elige el algoritmo y lo descompone en pasos.", "Pseudocódigo, descomposición en funciones.", "Algoritmo elegido y su justificación."),
    aplicar: d("Código, pruebas y depuración.", "Implementa y prueba la solución.", "Código fuente y pruebas.", "Código que corre y cumple los casos de prueba."),
    resultado: d("Salida, eficiencia y casos límite.", "Verifica la salida y revisa casos límite.", "Pruebas, análisis de complejidad.", "Resultados verificados y casos límite probados."),
    transferencia: d("Problemas nuevos con el mismo patrón.", "Reutiliza el algoritmo en otro problema.", "Problema distinto con el mismo patrón.", "Solución nueva que reutiliza y adapta el patrón."),
  },
  escritura: {
    comprender: d("Propósito, destinatario, tema y fuentes.", "Identifica qué se pide escribir y para quién.", "Lectura guiada, lista de ideas.", "Propósito y destinatario explícitos; ideas clave."),
    representar: d("Estructura del texto y relación entre ideas.", "Organiza las ideas antes de redactar.", "Esquema, mapa de ideas, tesis.", "Esquema con tesis e ideas de apoyo."),
    estrategia: d("Tipo de texto, argumentos, orden.", "Decide la estructura y los argumentos.", "Plan de párrafos, tipo textual.", "Plan de párrafos con argumentos y evidencias."),
    aplicar: d("Redacción, cohesión, coherencia, ortografía.", "Redacta el texto según el plan.", "Borrador completo.", "Texto coherente, cohesionado y con evidencias."),
    resultado: d("Texto final y criterios de calidad.", "Revisa y corrige el texto.", "Lista de cotejo, autocorrección.", "Versión revisada con correcciones."),
    transferencia: d("Otros géneros o propósitos.", "Adapta lo aprendido a otro tipo de texto.", "Texto de otro género.", "Texto nuevo que aplica la misma estructura."),
  },
  lenguas: {
    comprender: d("Vocabulario, estructuras y situación comunicativa.", "Comprende el mensaje y la intención.", "Lectura o audición con preguntas.", "Ideas principales e intención identificadas."),
    representar: d("Elementos del contexto y registro.", "Representa la situación comunicativa.", "Esquema de la situación, mapa de vocabulario.", "Registro y elementos del contexto identificados."),
    estrategia: d("Funciones comunicativas y estrategias.", "Planea qué decir y cómo.", "Guion, plan del mensaje.", "Plan con funciones y estructuras a usar."),
    aplicar: d("Producción oral o escrita.", "Produce el mensaje con corrección y fluidez.", "Texto, diálogo, presentación.", "Producción comprensible y adecuada al nivel."),
    resultado: d("Adecuación, corrección, eficacia.", "Revisa y corrige su producción.", "Autoevaluación con descriptores del MCER.", "Producción revisada y errores corregidos."),
    transferencia: d("Otras situaciones comunicativas.", "Usa la lengua en una situación nueva.", "Tarea comunicativa real.", "Comunicación eficaz en un contexto nuevo."),
  },
  sociales: {
    comprender: d("Hechos, actores, fuentes y contexto.", "Identifica hechos, actores y fuentes.", "Lectura de fuentes, cronología.", "Hechos y actores ubicados en su contexto."),
    representar: d("Relaciones entre actores, causas y consecuencias.", "Representa el fenómeno social.", "Mapa de actores, línea de tiempo, mapa causal.", "Representación con causas, actores y consecuencias."),
    estrategia: d("Marcos teóricos, enfoques de análisis.", "Elige el enfoque y las preguntas de análisis.", "Plan de análisis, preguntas guía.", "Enfoque elegido y justificado."),
    aplicar: d("Análisis, argumentación con evidencias.", "Analiza y argumenta con fuentes.", "Ensayo, análisis de caso.", "Argumentos sustentados en evidencias citadas."),
    resultado: d("Conclusiones y su validez.", "Concluye y contrasta con otras perspectivas.", "Contraste de fuentes, autocrítica.", "Conclusión justificada y contrastada."),
    transferencia: d("Fenómenos de otra época o región.", "Aplica el análisis a otro caso.", "Caso comparado.", "Análisis nuevo que usa los mismos conceptos."),
  },
  negocios: {
    comprender: d("Datos del caso, actores, mercado y objetivo.", "Identifica la situación y el problema de negocio.", "Lectura del caso, datos financieros.", "Problema de negocio definido con sus datos."),
    representar: d("Relaciones entre variables del negocio.", "Representa la situación del negocio.", "Lienzo de modelo de negocio, FODA, diagrama de procesos.", "Modelo o matriz completa del caso."),
    estrategia: d("Modelos de decisión y herramientas del área.", "Plantea alternativas y criterios de decisión.", "Árbol de decisión, plan estratégico.", "Alternativas con criterios de decisión."),
    aplicar: d("Cálculos, análisis y propuesta.", "Desarrolla el análisis y la propuesta.", "Estados financieros, plan de mercadotecnia.", "Análisis completo y propuesta sustentada."),
    resultado: d("Recomendación y su viabilidad.", "Valida la recomendación y sus riesgos.", "Indicadores, análisis de sensibilidad.", "Recomendación justificada con indicadores."),
    transferencia: d("Casos de otra industria.", "Aplica el modelo a otra empresa o mercado.", "Caso de otra industria.", "Caso nuevo resuelto con el mismo modelo."),
  },
};

export const DISCIPLINAS = Object.keys(PLANTILLAS);

/** Palabras de la materia que sugieren cada plantilla, en orden de prioridad. */
const PISTAS: [string, RegExp][] = [
  ["fisica", /f[ií]sica|mec[aá]nica|electricidad|termodin/i],
  ["quimica", /qu[ií]mica|bioqu/i],
  ["programacion", /program|computaci|algoritm|software|inform[aá]tica/i],
  ["matematicas", /matem|c[aá]lculo|[aá]lgebra|geometr|estad[ií]stica|trigonom|probabilidad/i],
  ["lenguas", /ingl[eé]s|franc[eé]s|alem[aá]n|japon[eé]s|portugu[eé]s|italiano|chino|lengua extranjera|english/i],
  ["escritura", /redacci|literatura|lectura|escritura|espa[nñ]ol|comunicaci[oó]n oral/i],
  ["negocios", /negocio|administraci|mercadotecnia|marketing|econom|finanz|contabil|empren/i],
  ["sociales", /historia|sociolog|ciencias sociales|geograf|civismo|filosof|derecho|pol[ií]tica|psicolog/i],
];

/** Plantilla que sugiere el nombre de la materia; "general" si no se reconoce. */
export function disciplinaDeMateria(materia: string): string {
  return PISTAS.find(([, re]) => re.test(materia))?.[0] ?? "general";
}

export const esDisciplina = (v: unknown): v is string => typeof v === "string" && v in PLANTILLAS;

/** Copia de la plantilla de una disciplina (o la general). */
export function plantilla(disciplina: string): Plantilla {
  const p = PLANTILLAS[disciplina] ?? PLANTILLAS.general;
  return Object.fromEntries(ETAPAS_CREAR.map((e) => [e, { ...p[e] }])) as Plantilla;
}

/** Modelo del curso: el que guardó el profesor o, si no hay, la plantilla de su materia (versión 0). */
export function modeloDelCurso(lista: ModeloCrearCurso[] | undefined, grupo: { id: string; materia: string }): ModeloCrearCurso & { guardado: boolean } {
  const guardado = (lista ?? []).find((m) => m.grupoId === grupo.id);
  if (guardado) return { ...guardado, guardado: true };
  const disciplina = disciplinaDeMateria(grupo.materia);
  return { grupoId: grupo.id, disciplina, etapas: plantilla(disciplina), version: 0, actualizadoEn: "", guardado: false };
}

/** Etapas con el texto limpio y recortado; un campo vacío toma el de la plantilla. */
export function limpiarEtapas(etapas: unknown, disciplina: string): Plantilla {
  const base = plantilla(disciplina);
  const entrada = (etapas && typeof etapas === "object" ? etapas : {}) as Record<string, Record<string, unknown> | undefined>;
  return Object.fromEntries(
    ETAPAS_CREAR.map((e) => [
      e,
      Object.fromEntries(
        CAMPOS_ETAPA.map((c) => {
          const v = entrada[e]?.[c];
          const texto = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, LARGO_CAMPO) : "";
          return [c, texto || base[e][c]];
        }),
      ),
    ]),
  ) as unknown as Plantilla;
}

/**
 * Lista con el modelo del curso guardado. Si cambió algo, sube la versión y conserva la anterior
 * (así cada análisis sabe con qué definición se hizo). Si no cambió nada, la lista queda igual.
 */
export function guardarModelo(
  lista: ModeloCrearCurso[] | undefined,
  grupoId: string,
  disciplina: string,
  etapas: Plantilla,
  ahora = new Date(),
): { lista: ModeloCrearCurso[]; cambio: boolean } {
  const actual = (lista ?? []).find((m) => m.grupoId === grupoId);
  if (actual && actual.disciplina === disciplina && JSON.stringify(actual.etapas) === JSON.stringify(etapas)) return { lista: lista ?? [], cambio: false };
  const anteriores = actual ? [...(actual.anteriores ?? []), { version: actual.version, disciplina: actual.disciplina, etapas: actual.etapas, actualizadoEn: actual.actualizadoEn }].slice(-20) : [];
  const nuevo: ModeloCrearCurso = { grupoId, disciplina, etapas, version: (actual?.version ?? 0) + 1, actualizadoEn: ahora.toISOString(), ...(anteriores.length ? { anteriores } : {}) };
  return { lista: [...(lista ?? []).filter((m) => m.grupoId !== grupoId), nuevo], cambio: true };
}
