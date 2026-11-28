// Tipo de actividad (etiqueta): agrupa las actividades en el cuaderno y en el plan de evaluación.

export const LARGO_ETIQUETA = 30;

/** Limpia la etiqueta escrita por el profesor: sin espacios de más y a lo sumo 30 caracteres. */
export function limpiarEtiqueta(v: unknown): string | undefined {
  const e = String(v ?? "").trim().replace(/\s+/g, " ").slice(0, LARGO_ETIQUETA).trim();
  return e || undefined;
}

/**
 * Tipos que ya usa cada curso (en sus actividades y en su plan de evaluación), para sugerirlos al
 * dar de alta una actividad. Se respeta cómo los escribió el profesor y no se repiten.
 */
export function etiquetasPorGrupo(
  grupos: { id: string; planEvaluacion?: { pesos: { etiqueta: string }[] } }[],
  actividades: { grupoId: string; etiqueta?: string }[],
): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const g of grupos) {
    const vistas = new Map<string, string>();
    const agregar = (e?: string) => {
      const l = limpiarEtiqueta(e);
      if (l && !vistas.has(l.toLowerCase())) vistas.set(l.toLowerCase(), l);
    };
    g.planEvaluacion?.pesos.forEach((p) => agregar(p.etiqueta));
    actividades.filter((a) => a.grupoId === g.id).forEach((a) => agregar(a.etiqueta));
    r[g.id] = [...vistas.values()].sort((a, b) => a.localeCompare(b, "es"));
  }
  return r;
}
