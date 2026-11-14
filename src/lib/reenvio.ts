// Reenvío de una entrega: si el alumno mandó fotos incompletas o el archivo equivocado,
// puede volver a entregar durante los primeros minutos y la nueva entrega reemplaza a la anterior.
import type { Entrega } from "./tipos";

export const MINUTOS_REENVIO = 5;

/** Hora de la primera entrega (los reenvíos no alargan el plazo). */
export function primeraEntrega(e: Pick<Entrega, "primeraEntregaEn" | "entregadaEn">): string | undefined {
  return e.primeraEntregaEn ?? e.entregadaEn;
}

/** Hasta cuándo se puede reenviar, o undefined si no hay entrega. */
export function limiteReenvio(e: Pick<Entrega, "primeraEntregaEn" | "entregadaEn">): Date | undefined {
  const primera = primeraEntrega(e);
  return primera ? new Date(Date.parse(primera) + MINUTOS_REENVIO * 60_000) : undefined;
}

export type PermisoReenvio = { ok: true; reemplaza: boolean } | { ok: false; error: string };

/**
 * ¿Se acepta una nueva entrega de este alumno?
 * - Sin entrega previa: sí.
 * - Entrega previa aún sin evaluar: sí, la reemplaza (no ha costado créditos).
 * - Entrega ya evaluada: solo dentro de los primeros 5 minutos desde la primera entrega.
 *   Después, el profesor puede borrarla con el bote de basura para permitir otra.
 */
export function permisoReenvio(previa: Entrega | undefined, comoProfesor: boolean, ahora = new Date()): PermisoReenvio {
  if (!previa || previa.estado === "sin_entregar") return { ok: true, reemplaza: false };
  if (previa.estado === "entregada") return { ok: true, reemplaza: true };
  const limite = limiteReenvio(previa);
  if (limite && ahora <= limite) return { ok: true, reemplaza: true };
  return {
    ok: false,
    error: comoProfesor
      ? "Esta entrega ya fue evaluada. Bórrala con el bote de basura de la lista de entregas para subir otra."
      : `Ya pasaron más de ${MINUTOS_REENVIO} minutos desde tu primera entrega y ya fue evaluada. Si necesitas cambiarla, pide a tu profesor que la borre para volver a entregar.`,
  };
}
