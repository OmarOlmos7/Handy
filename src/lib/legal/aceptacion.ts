// Aceptación de los términos y avisos de privacidad al crear una cuenta (profesor o alumno).
// Funciones puras para poder probarlas.
import type { AceptacionLegal } from "../tipos";

/**
 * Versión vigente de los textos legales (fecha de publicación). Al cambiar los textos de forma
 * importante se cambia esta fecha: así se sabe qué versión aceptó cada cuenta.
 */
export const VERSION_LEGAL = "2026-11-21";

/** Nombre de la casilla de aceptación en los formularios de registro. */
export const CAMPO_ACEPTACION = "aceptoAvisos";

export const RAZON_SOCIAL = "Ieureka Innovación en soluciones educativas";

/** true si el formulario trae marcada la casilla de aceptación de la versión vigente. */
export function aceptoAvisos(form: Pick<FormData, "get">): boolean {
  return form.get(CAMPO_ACEPTACION) === VERSION_LEGAL;
}

/** Registro que se guarda en la cuenta: versión aceptada y fecha y hora (ISO, UTC). */
export function registroAceptacion(ahora = new Date()): AceptacionLegal {
  return { version: VERSION_LEGAL, fecha: ahora.toISOString() };
}

/** Aceptación a guardar si el formulario la trae; undefined si no marcó la casilla. */
export function aceptacionDeFormulario(form: Pick<FormData, "get">, ahora = new Date()): AceptacionLegal | undefined {
  return aceptoAvisos(form) ? registroAceptacion(ahora) : undefined;
}

/** true si la cuenta aceptó la versión vigente (las cuentas anteriores a los avisos no tienen registro). */
export function aceptoVersionVigente(cuenta: { aceptacion?: AceptacionLegal }): boolean {
  return cuenta.aceptacion?.version === VERSION_LEGAL;
}
