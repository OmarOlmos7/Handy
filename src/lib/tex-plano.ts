// Convierte LaTeX sencillo a texto plano legible para el PDF (la fuente estándar no dibuja fórmulas).
const GRIEGAS: Record<string, string> = {
  alpha: "alfa", beta: "beta", gamma: "gamma", delta: "delta", Delta: "Delta", theta: "theta", lambda: "lambda",
  mu: "mu", pi: "pi", rho: "rho", sigma: "sigma", Sigma: "Sigma", tau: "tau", omega: "omega", Omega: "Omega", phi: "phi",
};

export function texAPlano(texto: string): string {
  let t = texto.replace(/\$\$?/g, "");
  for (let i = 0; i < 3; i++) t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  t = t
    .replace(/\\sqrt\{([^{}]*)\}/g, "raiz($1)")
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\(cdot|times)/g, (_, c) => (c === "cdot" ? "·" : "x"))
    .replace(/\\(le|leq)\b/g, "<=")
    .replace(/\\(ge|geq)\b/g, ">=")
    .replace(/\\(ne|neq)\b/g, "!=")
    .replace(/\\approx\b/g, "~")
    .replace(/\\degree\b|\^\{?\\circ\}?/g, "°")
    .replace(/\\([A-Za-z]+)/g, (m, nombre) => GRIEGAS[nombre] ?? "")
    .replace(/\\[,;:! ]/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}
