// Plan de evaluación del curso: porcentaje de cada tipo de actividad y nota final.
// La IA solo interpreta las instrucciones del profesor; los pesos se validan y la nota final
// se calcula aquí.
import type { Cuaderno } from "./cuaderno";
import type { PesoTipo, PlanEvaluacion } from "./tipos";

const r1 = (n: number) => Math.round(n * 10) / 10;
const normal = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Tolerancia al comparar la suma de porcentajes con 100. */
export const TOLERANCIA_SUMA = 0.5;

export function sumaPesos(pesos: PesoTipo[]) {
  return r1(pesos.reduce((s, p) => s + p.porcentaje, 0));
}

export function pesoDe(plan: PlanEvaluacion | undefined, etiqueta: string): number | undefined {
  return plan?.pesos.find((p) => normal(p.etiqueta) === normal(etiqueta))?.porcentaje;
}

/**
 * Limpia los pesos: quita los vacíos y negativos, junta los repetidos, usa el nombre exacto de las
 * etiquetas del curso cuando coincide y redondea a décimas.
 */
export function limpiarPesos(pesos: PesoTipo[], etiquetasCurso: string[] = []): PesoTipo[] {
  const mapa = new Map<string, PesoTipo>();
  for (const p of pesos) {
    const porcentaje = Number(p.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) continue;
    const nombre = etiquetasCurso.find((e) => normal(e) === normal(p.etiqueta)) ?? p.etiqueta.trim().replace(/\s+/g, " ").slice(0, 30);
    const k = normal(nombre);
    const previo = mapa.get(k);
    mapa.set(k, { etiqueta: nombre, porcentaje: r1((previo?.porcentaje ?? 0) + porcentaje) });
  }
  return [...mapa.values()];
}

/** Lleva los pesos a que sumen exactamente 100, en proporción (la diferencia de redondeo va al mayor). */
export function normalizarA100(pesos: PesoTipo[]): PesoTipo[] {
  const total = pesos.reduce((s, p) => s + p.porcentaje, 0);
  if (total <= 0) return pesos;
  const salida = pesos.map((p) => ({ ...p, porcentaje: r1((p.porcentaje * 100) / total) }));
  const diferencia = r1(100 - sumaPesos(salida));
  if (diferencia !== 0 && salida.length) {
    const mayor = salida.reduce((m, p) => (p.porcentaje > m.porcentaje ? p : m));
    mayor.porcentaje = r1(mayor.porcentaje + diferencia);
  }
  return salida;
}

/** Valida un plan escrito a mano. Devuelve la clave del error o undefined si está bien. */
export function errorPlan(pesos: PesoTipo[]): "vacio" | "suma" | undefined {
  if (pesos.length === 0) return "vacio";
  if (Math.abs(sumaPesos(pesos) - 100) > TOLERANCIA_SUMA) return "suma";
  return undefined;
}

export interface NotaFinal {
  /** Nota final por matrícula en la escala del cuaderno; null si aún no hay calificaciones que cuenten. */
  porAlumno: Map<string, number | null>;
  /** Promedio de las notas finales del grupo. */
  promedioGrupo: number | null;
  /** Porcentaje del plan que ya tiene calificaciones (es el máximo que puede llevar acumulado la nota final). */
  ponderacionActual: number;
  /** Tipos del plan sin actividades calificadas todavía. */
  sinCalificar: string[];
}

/**
 * Nota final según el plan de evaluación: cada tipo aporta su promedio por su porcentaje
 * (Σ promedio del tipo × % / 100). Es una nota acumulada: un tipo del plan que aún no tiene
 * calificaciones aporta 0 hasta que las tenga, igual que un trabajo no entregado.
 * Los tipos del cuaderno que no están en el plan no cuentan.
 */
export function notaFinal(cuaderno: Cuaderno, plan: PlanEvaluacion): NotaFinal {
  const tipos = cuaderno.grupos
    .map((g) => ({ g, peso: pesoDe(plan, g.clave) ?? 0 }))
    .filter((x) => x.peso > 0 && x.g.columnas.some((c) => c.cuenta));
  const ponderacionActual = r1(tipos.reduce((s, x) => s + x.peso, 0));
  const conCalif = new Set(tipos.map((x) => normal(x.g.clave)));
  const sinCalificar = plan.pesos.filter((p) => !conCalif.has(normal(p.etiqueta))).map((p) => p.etiqueta);

  const porAlumno = new Map<string, number | null>();
  for (const f of cuaderno.filas) {
    const promedios = tipos.map(({ g, peso }) => ({ p: g.promedios[f.matricula] ?? null, peso }));
    // Sin ninguna calificación todavía no hay nota final.
    porAlumno.set(f.matricula, promedios.some((x) => x.p !== null) ? r1(promedios.reduce((s, x) => s + (x.p ?? 0) * x.peso, 0) / 100) : null);
  }
  const finales = [...porAlumno.values()].filter((v): v is number => v !== null);
  const pg = prom(finales);
  return { porAlumno, promedioGrupo: pg === null ? null : r1(pg), ponderacionActual, sinCalificar };
}
