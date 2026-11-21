// Ayudas para las pantallas de cuenta (ingreso y registro).
import type { Diccionario } from "./diccionario";

/** Texto del error que llega en ?error=: una clave de cuenta.errores o, si no lo es, el texto tal cual. */
export function textoError(t: Diccionario, error: string | string[] | undefined): string | undefined {
  if (typeof error !== "string") return undefined;
  const errores = t.cuenta.errores as Record<string, string>;
  return errores[error] ?? error;
}

/** Textos del botón "Instalar como app", con las palabras en negritas separadas. */
export function textosInstalar(t: Diccionario) {
  const [antes, resto = ""] = t.cuenta.instalarIos.split("{compartir}");
  const [medio, despues = ""] = resto.split("{agregar}");
  return { instalar: t.cuenta.instalar, antes, compartir: t.cuenta.compartir, medio, agregar: t.cuenta.agregarInicio, despues };
}
