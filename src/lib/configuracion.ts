// Configuración personal del profesor: rangos de calificación para los reportes y
// nivel de precisión de la IA (motor y esfuerzo). Funciones puras para poder probarlas.
import type { ConfiguracionProfesor, EsfuerzoIA, MotorIA, PrecisionIA, RangosCalificacion } from "./tipos";

// ---------- Rangos de calificación (sobre 100) ----------

/** Límite inferior de cada nivel: Bajo 0-69, Medio 70-84, Alto 85-95, Superior 96-100. */
export const RANGOS_PREDETERMINADOS: RangosCalificacion = { medio: 70, alto: 85, superior: 96 };

export type NivelReporte = "bajo" | "medio" | "alto" | "superior";

export const NIVELES_REPORTE: { clave: NivelReporte; nombre: string; color: string }[] = [
  { clave: "superior", nombre: "Superior", color: "#15803d" },
  { clave: "alto", nombre: "Alto", color: "#22c55e" },
  { clave: "medio", nombre: "Medio", color: "#f59e0b" },
  { clave: "bajo", nombre: "Bajo", color: "#dc2626" },
];

/**
 * Valida los límites: enteros, 1 ≤ medio < alto < superior ≤ 100. Devuelve los rangos o la
 * clave del error (se traduce con el diccionario, en configuracion.avisos).
 */
export function validarRangos(
  r: { medio: number; alto: number; superior: number },
): RangosCalificacion | "rangosEnteros" | "rangosLimites" | "rangosOrden" {
  const { medio, alto, superior } = r;
  if (![medio, alto, superior].every((n) => Number.isInteger(n))) return "rangosEnteros";
  if (medio < 1 || superior > 100) return "rangosLimites";
  if (!(medio < alto && alto < superior)) return "rangosOrden";
  return { medio, alto, superior };
}

export function nivelReporte(valor: number, r: RangosCalificacion = RANGOS_PREDETERMINADOS): NivelReporte {
  if (valor >= r.superior) return "superior";
  if (valor >= r.alto) return "alto";
  if (valor >= r.medio) return "medio";
  return "bajo";
}

/** Texto del intervalo de cada nivel, por ejemplo "70 a 84". */
export function intervaloNivel(nivel: NivelReporte, r: RangosCalificacion = RANGOS_PREDETERMINADOS, a = "a"): string {
  const [desde, hasta] = {
    bajo: [0, r.medio - 1],
    medio: [r.medio, r.alto - 1],
    alto: [r.alto, r.superior - 1],
    superior: [r.superior, 100],
  }[nivel];
  return `${desde} ${a} ${hasta}`;
}

/** Cuántos valores (sobre 100) caen en cada nivel. */
/**
 * Porcentaje de notas altas (nivel Alto o Superior) y bajas (nivel Bajo) entre calificaciones
 * sobre 100, con los rangos del profesor. Sin calificaciones, undefined.
 */
export function porcentajeAltasBajas(
  valores: number[],
  r: RangosCalificacion = RANGOS_PREDETERMINADOS,
): { altas: number; bajas: number; total: number } | undefined {
  if (valores.length === 0) return undefined;
  const n = contarNiveles(valores, r);
  const pct = (x: number) => Math.round((x / valores.length) * 100);
  return { altas: pct(n.alto + n.superior), bajas: pct(n.bajo), total: valores.length };
}

export function contarNiveles(valores: number[], r: RangosCalificacion = RANGOS_PREDETERMINADOS): Record<NivelReporte, number> {
  const conteo: Record<NivelReporte, number> = { bajo: 0, medio: 0, alto: 0, superior: 0 };
  for (const v of valores) conteo[nivelReporte(v, r)]++;
  return conteo;
}

/** Rebanadas para el pastel de niveles, de Superior a Bajo. */
export function rebanadasNiveles(
  conteo: Record<NivelReporte, number>,
  r: RangosCalificacion = RANGOS_PREDETERMINADOS,
  /** Nombres de los niveles y la palabra del intervalo ("a") en el idioma de la interfaz. */
  tx?: { nombres: Record<NivelReporte, string>; a: string },
) {
  return NIVELES_REPORTE.map((n) => ({
    nombre: `${tx?.nombres[n.clave] ?? n.nombre} (${intervaloNivel(n.clave, r, tx?.a)})`,
    valor: conteo[n.clave],
    color: n.color,
  }));
}

// ---------- Precisión de la IA ----------

export const MOTORES: MotorIA[] = ["rapido", "medio", "preciso"];
export const ESFUERZOS: EsfuerzoIA[] = ["bajo", "medio", "alto"];

export const INFO_MOTOR: Record<MotorIA, { nombre: string; modelo: string; nombreModelo: string; nombreCorto: string; descripcion: string; consumo: number }> = {
  rapido: {
    nombre: "Rápido",
    modelo: "claude-haiku-5-5",
    nombreModelo: "Claude Haiku 5.5",
    nombreCorto: "Haiku 5.5",
    descripcion: "Respuestas veloces y el menor consumo. Ideal para reactivos cerrados (opción múltiple, verdadero o falso) y letra clara.",
    consumo: 1,
  },
  medio: {
    nombre: "Medio",
    modelo: "claude-sonnet-5-5",
    nombreModelo: "Claude Sonnet 5.5",
    nombreCorto: "Sonnet 5.5",
    descripcion: "Equilibrio entre precisión y consumo. Recomendado para la mayoría de las actividades con desarrollos cortos.",
    consumo: 3,
  },
  preciso: {
    nombre: "Preciso",
    modelo: "claude-opus-5-5",
    nombreModelo: "Claude Opus 5.5",
    nombreCorto: "Opus 5.5",
    descripcion: "La lectura más cuidadosa de procedimientos largos, gráficas y letra difícil. Es el que más tokens consume.",
    consumo: 6,
  },
};

export const INFO_ESFUERZO: Record<EsfuerzoIA, { nombre: string; api: "low" | "medium" | "high"; factor: number }> = {
  bajo: { nombre: "Bajo", api: "low", factor: 0.6 },
  medio: { nombre: "Medio", api: "medium", factor: 1 },
  alto: { nombre: "Alto", api: "high", factor: 1.6 },
};

/** Lo que puede costar de IA, como máximo, un crédito; con este costo se calculan los precios de los planes. */
export const COSTO_CREDITO_USD = 0.013;
/** Margen de riesgo sobre el costo medido (reintentos, hojas con más texto, rúbrica y recomendaciones). */
export const MARGEN_RIESGO = 0.2;

/**
 * Costo medido de evaluar una hoja, en dólares, por motor y esfuerzo (20-nov-2026, hoja completa de
 * 6 reactivos: 6,170 tokens de entrada y de 1,200 a 11,300 de salida). Precios por millón de tokens:
 * Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10 y Opus 5.5 $4/$20.
 */
export const COSTO_HOJA_USD: Record<MotorIA, Record<EsfuerzoIA, number>> = {
  rapido: { bajo: 0.0034, medio: 0.0042, alto: 0.0063 },
  medio: { bajo: 0.0251, medio: 0.0246, alto: 0.0487 },
  preciso: { bajo: 0.0572, medio: 0.0718, alto: 0.0876 },
};

/** Créditos por hoja: costo medido más el margen de riesgo, entre el costo de un crédito, hacia arriba a décimas. */
export function creditosDeCosto(costoUsd: number): number {
  return Math.ceil(Math.round(((costoUsd * (1 + MARGEN_RIESGO)) / COSTO_CREDITO_USD) * 1000) / 100) / 10;
}

/** Niveles con nombre de la escala de precisión, del análisis más rápido al más preciso. */
export type PuntoEscala = "rapido" | "agil" | "medio" | "alto" | "avanzado";

/**
 * Escala de precisión en ocho puntos: Rápido es Haiku 5.5 bajo; Ágil, Haiku medio y alto; Medio,
 * Sonnet 5.5 bajo; Alto, Sonnet medio y alto; Avanzado, Opus 5.5 bajo y medio. Los créditos salen
 * del costo medido con el margen de riesgo y nunca bajan al subir en la escala.
 */
export const ESCALA: { punto: PuntoEscala; clave: string; precision: PrecisionIA; creditos: number }[] = (
  [
    ["rapido", "rapido", "bajo"],
    ["agil", "rapido", "medio"],
    ["agil", "rapido", "alto"],
    ["medio", "medio", "bajo"],
    ["alto", "medio", "medio"],
    ["alto", "medio", "alto"],
    ["avanzado", "preciso", "bajo"],
    ["avanzado", "preciso", "medio"],
  ] as const
).reduce<{ punto: PuntoEscala; clave: string; precision: PrecisionIA; creditos: number }[]>((lista, [punto, motor, esfuerzo]) => {
  const anterior = lista.at(-1)?.creditos ?? 0;
  const creditos = Math.max(anterior, creditosDeCosto(COSTO_HOJA_USD[motor][esfuerzo]));
  return [...lista, { punto, clave: `${motor}-${esfuerzo}`, precision: { motor, esfuerzo }, creditos }];
}, []);

/** La escala arranca en el nivel Medio (Sonnet 5.5 con esfuerzo bajo). */
export const PUNTO_PREDETERMINADO = 3;

/** Niveles con nombre y los puntos de la escala que abarca cada uno (índices desde y hasta). */
export function gruposEscala(): { punto: PuntoEscala; desde: number; hasta: number }[] {
  const grupos: { punto: PuntoEscala; desde: number; hasta: number }[] = [];
  ESCALA.forEach((e, i) => {
    const ultimo = grupos.at(-1);
    if (ultimo?.punto === e.punto) ultimo.hasta = i;
    else grupos.push({ punto: e.punto, desde: i, hasta: i });
  });
  return grupos;
}

/** Punto de la escala de una precisión; si no está en la escala, el más cercano de su motor. */
export function indiceEscala(p: PrecisionIA | undefined): number {
  if (!p) return PUNTO_PREDETERMINADO;
  const exacto = ESCALA.findIndex((e) => e.precision.motor === p.motor && e.precision.esfuerzo === p.esfuerzo);
  if (exacto >= 0) return exacto;
  return p.motor === "preciso" ? ESCALA.length - 1 : PUNTO_PREDETERMINADO;
}

/** Créditos por página de una actividad según su motor y esfuerzo; sin precisión guardada se usa la predeterminada. */
export function creditosPorPagina(p: PrecisionIA | undefined): number {
  if (!p || !esMotor(p.motor)) return ESCALA[PUNTO_PREDETERMINADO].creditos;
  const enEscala = ESCALA.find((e) => e.precision.motor === p.motor && e.precision.esfuerzo === p.esfuerzo);
  if (enEscala) return enEscala.creditos;
  return creditosDeCosto(COSTO_HOJA_USD[p.motor][esEsfuerzo(p.esfuerzo) ? p.esfuerzo : "medio"]);
}

/**
 * Valores de la escala para los textos, con el formato del idioma: créditos por página del primer
 * y del último punto, del punto predeterminado (n) y de una entrega de 3 páginas en ese punto.
 */
export function valoresEscala(locale: string): { min: string; max: string; n: string; ejemplo: string } {
  const f = (x: number) => x.toLocaleString(locale);
  const medio = ESCALA[PUNTO_PREDETERMINADO].creditos;
  return { min: f(ESCALA[0].creditos), max: f(ESCALA[ESCALA.length - 1].creditos), n: f(medio), ejemplo: f(sumarCreditos(3 * medio)) };
}

/** Suma créditos sin errores de redondeo (a centésimas). */
export function sumarCreditos(...cantidades: number[]): number {
  return Math.round(cantidades.reduce((s, x) => s + x, 0) * 100) / 100;
}

export const PRECISION_PREDETERMINADA: PrecisionIA = { motor: "medio", esfuerzo: "bajo" };

/** Esfuerzo elegido para cada motor si el profesor no lo ha cambiado. */
export const ESFUERZOS_PREDETERMINADOS: Record<MotorIA, EsfuerzoIA> = { rapido: "bajo", medio: "bajo", preciso: "medio" };

export function esMotor(x: unknown): x is MotorIA {
  return typeof x === "string" && (MOTORES as string[]).includes(x);
}

export function esEsfuerzo(x: unknown): x is EsfuerzoIA {
  return typeof x === "string" && (ESFUERZOS as string[]).includes(x);
}

/** Configuración completa con los valores predeterminados donde falte algo. */
export function configuracionDe(c: ConfiguracionProfesor | undefined) {
  return {
    rangos: c?.rangos ?? RANGOS_PREDETERMINADOS,
    motor: esMotor(c?.motor) ? c.motor : PRECISION_PREDETERMINADA.motor,
    esfuerzos: { ...ESFUERZOS_PREDETERMINADOS, ...c?.esfuerzos },
  };
}

/**
 * Precisión para una actividad con el motor y el esfuerzo elegidos; si no se eligió esfuerzo,
 * sale de la configuración del profesor.
 */
export function precisionPara(motor: unknown, c: ConfiguracionProfesor | undefined, esfuerzo?: unknown): PrecisionIA {
  const conf = configuracionDe(c);
  const m = esMotor(motor) ? motor : conf.motor;
  return { motor: m, esfuerzo: esEsfuerzo(esfuerzo) ? esfuerzo : conf.esfuerzos[m] };
}

/** Modelo y esfuerzo que se mandan a la API para una precisión. */
export function parametrosIA(p: PrecisionIA | undefined): { modelo: string; esfuerzo: "low" | "medium" | "high" } {
  const precision = p && esMotor(p.motor) && esEsfuerzo(p.esfuerzo) ? p : PRECISION_PREDETERMINADA;
  return { modelo: INFO_MOTOR[precision.motor].modelo, esfuerzo: INFO_ESFUERZO[precision.esfuerzo].api };
}

/** Consumo relativo de tokens (Rápido con esfuerzo medio = 1). Es una guía para el profesor, no una tarifa. */
export function consumoRelativo(p: PrecisionIA): number {
  return Math.round(INFO_MOTOR[p.motor].consumo * INFO_ESFUERZO[p.esfuerzo].factor * 10) / 10;
}

/** Nivel de consumo de 1 a 5 para dibujar la barra. */
export function nivelConsumo(p: PrecisionIA): number {
  const max = consumoRelativo({ motor: "preciso", esfuerzo: "alto" });
  const min = consumoRelativo({ motor: "rapido", esfuerzo: "bajo" });
  return Math.max(1, Math.min(5, Math.round(1 + ((consumoRelativo(p) - min) / (max - min)) * 4)));
}
