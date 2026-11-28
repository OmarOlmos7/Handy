// Consentimiento informado para construir el perfil de aprendizaje del alumno. Funciones puras.
// El texto va alineado con el Aviso de privacidad (borrador hasta la revisión del abogado).
import type { ConsentimientoPerfil } from "../tipos";

/** Versión vigente del texto del consentimiento. Al cambiar el texto de forma importante, se cambia. */
export const VERSION_CONSENTIMIENTO = "2026-11-28";

/** Límite de los campos del tutor. */
const LARGO_TUTOR = 120;

/** Consentimiento vigente del alumno (versión actual y sin retirar), o undefined. */
export function consentimientoVigente(lista: ConsentimientoPerfil[] | undefined, alumnoId: string): ConsentimientoPerfil | undefined {
  return (lista ?? []).find((c) => c.alumnoId === alumnoId && c.version === VERSION_CONSENTIMIENTO && !c.retiradoEn);
}

export const tieneConsentimiento = (lista: ConsentimientoPerfil[] | undefined, alumnoId: string) => Boolean(consentimientoVigente(lista, alumnoId));

const limpio = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, LARGO_TUTOR) : "");

export type ResultadoConsentimiento = { ok: true; consentimiento: ConsentimientoPerfil } | { ok: false; error: "sinAceptar" | "sinTutor" };

/**
 * Consentimiento a guardar con lo que marcó el alumno. Debe aceptar; si es menor de edad, también
 * escribe el nombre y el parentesco de su madre, padre o tutor, que da su autorización.
 */
export function nuevoConsentimiento(
  alumnoId: string,
  datos: { acepta: boolean; menor: boolean; tutorNombre?: unknown; tutorParentesco?: unknown; aceptaTutor?: boolean },
  ahora = new Date(),
): ResultadoConsentimiento {
  if (!datos.acepta) return { ok: false, error: "sinAceptar" };
  const base = { alumnoId, version: VERSION_CONSENTIMIENTO, fecha: ahora.toISOString(), menor: datos.menor };
  if (!datos.menor) return { ok: true, consentimiento: base };
  const nombre = limpio(datos.tutorNombre);
  const parentesco = limpio(datos.tutorParentesco);
  if (nombre.length < 3 || parentesco.length < 2 || !datos.aceptaTutor) return { ok: false, error: "sinTutor" };
  return { ok: true, consentimiento: { ...base, tutor: { nombre, parentesco } } };
}

/** Lista con el consentimiento nuevo: reemplaza cualquier otro del alumno. */
export function conConsentimiento(lista: ConsentimientoPerfil[] | undefined, c: ConsentimientoPerfil): ConsentimientoPerfil[] {
  return [...(lista ?? []).filter((x) => x.alumnoId !== c.alumnoId), c];
}

/** Marca como retirados los consentimientos del alumno (se conservan para saber cuándo los dio y retiró). */
export function retirarConsentimiento(lista: ConsentimientoPerfil[] | undefined, alumnoId: string, ahora = new Date()): ConsentimientoPerfil[] {
  return (lista ?? []).map((c) => (c.alumnoId === alumnoId && !c.retiradoEn ? { ...c, retiradoEn: ahora.toISOString() } : c));
}
