// Ayudas para los textos de las vistas del alumno.
import { LARGO_MINIMO_CLAVE } from "../cuentas-alumno";
import { MINUTOS_REENVIO } from "../reenvio";
import type { Diccionario } from "./diccionario";
import { formato } from "./idiomas";

/** Texto de un error del alumno: una clave de alumno.errores o, si no lo es, el texto tal cual. */
export function errorAlumno(t: Diccionario, error: string, valores: Record<string, string | number> = {}): string {
  const errores = t.alumno.errores as Record<string, string>;
  const texto = errores[error];
  return texto ? formato(texto, { n: error === "claveCorta" ? LARGO_MINIMO_CLAVE : MINUTOS_REENVIO, ...valores }) : error;
}
