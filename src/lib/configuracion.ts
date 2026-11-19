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

export const INFO_MOTOR: Record<MotorIA, { nombre: string; modelo: string; descripcion: string; consumo: number }> = {
  rapido: {
    nombre: "Rápido",
    modelo: "claude-haiku-5-5",
    descripcion: "Respuestas veloces y el menor consumo. Ideal para reactivos cerrados (opción múltiple, verdadero o falso) y letra clara.",
    consumo: 1,
  },
  medio: {
    nombre: "Medio",
    modelo: "claude-sonnet-5-5",
    descripcion: "Equilibrio entre precisión y consumo. Recomendado para la mayoría de las actividades con desarrollos cortos.",
    consumo: 3,
  },
  preciso: {
    nombre: "Preciso",
    modelo: "claude-opus-5-5",
    descripcion: "La lectura más cuidadosa de procedimientos largos, gráficas y letra difícil. Es el que más tokens consume.",
    consumo: 6,
  },
};

export const INFO_ESFUERZO: Record<EsfuerzoIA, { nombre: string; api: "low" | "medium" | "high"; factor: number }> = {
  bajo: { nombre: "Bajo", api: "low", factor: 0.6 },
  medio: { nombre: "Medio", api: "medium", factor: 1 },
  alto: { nombre: "Alto", api: "high", factor: 1.6 },
};

/** Créditos que cuesta cada página evaluada según el nivel de precisión (el precio se fija con Rápido). */
export const CREDITOS_POR_PAGINA: Record<MotorIA, number> = { rapido: 1, medio: 4, preciso: 12 };

/** Créditos por página de una actividad; sin precisión guardada se usa la predeterminada. */
export function creditosPorPagina(p: PrecisionIA | undefined): number {
  return CREDITOS_POR_PAGINA[p && esMotor(p.motor) ? p.motor : PRECISION_PREDETERMINADA.motor];
}

export const PRECISION_PREDETERMINADA: PrecisionIA = { motor: "medio", esfuerzo: "medio" };

/** Esfuerzo elegido para cada motor si el profesor no lo ha cambiado. */
export const ESFUERZOS_PREDETERMINADOS: Record<MotorIA, EsfuerzoIA> = { rapido: "medio", medio: "medio", preciso: "medio" };

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

/** Precisión para una actividad nueva con el motor elegido; el esfuerzo sale de la configuración del profesor. */
export function precisionPara(motor: unknown, c: ConfiguracionProfesor | undefined): PrecisionIA {
  const conf = configuracionDe(c);
  const m = esMotor(motor) ? motor : conf.motor;
  return { motor: m, esfuerzo: conf.esfuerzos[m] };
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
