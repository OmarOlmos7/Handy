// Escala de color por desempeño (0 a 100): rojo → naranja → ámbar → lima → verde.
// La usan las gráficas de analíticas para que el color diga qué tan bien va cada valor.

/** Paradas de la escala: [valor sobre 100, color]. */
export const PARADAS_DESEMPENO: [number, string][] = [
  [0, "#b91c1c"],
  [45, "#ef4444"],
  [60, "#f97316"],
  [70, "#f59e0b"],
  [80, "#84cc16"],
  [90, "#22c55e"],
  [100, "#15803d"],
];

function aRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: number[]) {
  return `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;
}

/** Color de un valor sobre 100, interpolado entre las paradas. */
export function colorDesempeno(valor: number): string {
  const v = Math.max(0, Math.min(100, Number.isFinite(valor) ? valor : 0));
  for (let i = 1; i < PARADAS_DESEMPENO.length; i++) {
    const [v1, c1] = PARADAS_DESEMPENO[i];
    if (v <= v1) {
      const [v0, c0] = PARADAS_DESEMPENO[i - 1];
      const t = v1 === v0 ? 0 : (v - v0) / (v1 - v0);
      const a = aRgb(c0);
      const b = aRgb(c1);
      return aHex(a.map((x, k) => x + (b[k] - x) * t));
    }
  }
  return PARADAS_DESEMPENO[PARADAS_DESEMPENO.length - 1][1];
}

/** Degradado CSS de toda la escala, para la leyenda. */
export function degradadoDesempeno() {
  return `linear-gradient(to right, ${PARADAS_DESEMPENO.map(([v, c]) => `${c} ${v}%`).join(", ")})`;
}
