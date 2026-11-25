// Cuentas de costo y utilidad de iEureka-Grader: impuestos, operación y costo de IA por crédito.
// Los precios de venta (licencias de alumno por curso) viven en licencias.ts. Montos en MXN.
import { COSTO_CREDITO_USD, MARGEN_RIESGO } from "./configuracion";

// ---------- Costo por crédito y utilidad ----------
/** Tipo de cambio supuesto (MXN por dólar). */
export const TIPO_CAMBIO = 18.5;
export const IVA = 0.16;
/** ISR del ejercicio fiscal, sobre la utilidad antes de impuestos. */
export const ISR = 0.32;
/** Gastos de operación (incluye la comisión del cobro), sobre el ingreso sin IVA. */
export const OPERACION = 0.2;
/** Utilidad mínima después de ISR, sobre el ingreso sin IVA, si no se fija otra. */
export const UTILIDAD_OBJETIVO = 0.35;

/**
 * Costo de IA de un crédito en MXN con un margen de riesgo. Cada hoja cobra su costo medido más
 * MARGEN_RIESGO (ver ESCALA), así que el costo real de un crédito es COSTO_CREDITO_USD ÷ (1 +
 * MARGEN_RIESGO); a eso se suma el riesgo que asume el plan. Con el riesgo completo (20 %) un
 * crédito cuesta COSTO_CREDITO_USD.
 */
export function costoCreditoMXN(riesgo: number = MARGEN_RIESGO): number {
  return (COSTO_CREDITO_USD / (1 + MARGEN_RIESGO)) * (1 + riesgo) * TIPO_CAMBIO;
}

/**
 * Utilidad de una venta después de ISR, sobre su ingreso sin IVA (0.35 = 35 %); undefined si es
 * gratis. Se quita el IVA del precio; del resto, la operación (20 %) y el costo de IA de sus
 * créditos con el riesgo indicado, y a lo que queda el ISR.
 */
export function utilidad(p: { precio?: number; creditos: number; riesgo?: number }): number | undefined {
  if (!p.precio) return undefined;
  const sinIva = p.precio / (1 + IVA);
  const antesDeIsr = sinIva * (1 - OPERACION) - p.creditos * costoCreditoMXN(p.riesgo);
  return (antesDeIsr * (1 - ISR)) / sinIva;
}

/** Créditos máximos que puede incluir un precio (MXN con IVA) con un riesgo, sin bajar de la utilidad pedida. */
export function creditosMaximos(precio: number, riesgo: number = MARGEN_RIESGO, utilidadMinima: number = UTILIDAD_OBJETIVO): number {
  const sinIva = precio / (1 + IVA);
  return Math.floor((sinIva * (1 - OPERACION - utilidadMinima / (1 - ISR))) / costoCreditoMXN(riesgo));
}

export function pesos(n: number, locale = "es-MX") {
  return n.toLocaleString(locale, { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
