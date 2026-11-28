// Convierte LaTeX sencillo a texto plano legible para el PDF (la fuente estándar no dibuja fórmulas).
const GRIEGAS: Record<string, string> = {
  alpha: "alfa", beta: "beta", gamma: "gamma", delta: "delta", Delta: "Delta", theta: "theta", lambda: "lambda",
  mu: "mu", pi: "pi", rho: "rho", sigma: "sigma", Sigma: "Sigma", tau: "tau", omega: "omega", Omega: "Omega", phi: "phi",
};

export function texAPlano(texto: string): string {
  let t = texto.replace(/\$\$?/g, "");
  t = conLlaves(t, /\\[dt]?frac/, 2, ([n, d]) => `(${n})/(${d})`);
  t = conLlaves(t, /\\sqrt/, 1, ([x]) => `raiz(${x})`);
  t = t
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\(cdot|times)/g, (_, c) => (c === "cdot" ? "·" : "x"))
    .replace(/\\(le|leq)\b/g, "<=")
    .replace(/\\(ge|geq)\b/g, ">=")
    .replace(/\\(ne|neq)\b/g, "!=")
    .replace(/\\approx\b/g, "~")
    .replace(/\\degree\b|\^\{?\\circ\}?/g, "°")
    .replace(/\\pm\b/g, "±")
    // Funciones (\sen, \cos, \ln…): se conserva su nombre.
    .replace(/\\(a?r?c?(?:sen|sin|cos|tan|tg|cot|ctg|cotg|sec|csc|cosec)h?|ln|log|exp|lim|max|min)\b/g, " $1")
    // Exponentes: ¹ ² ³ existen en la fuente del PDF; los demás quedan como ^n o ^(…).
    .replace(/\^\{?([123])\}?(?![\d.])/g, (_, d: string) => "¹²³"[Number(d) - 1])
    .replace(/\^\{([^{}]{2,})\}/g, "^($1)")
    .replace(/\\([A-Za-z]+)/g, (m, nombre) => GRIEGAS[nombre] ?? "")
    .replace(/\\[,;:! ]/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .replace(/([([]) /g, "$1")
    .trim();
  return t;
}

/** Reemplaza un comando con argumentos entre llaves (que pueden traer llaves dentro). */
function conLlaves(texto: string, comando: RegExp, cuantos: number, armar: (args: string[]) => string): string {
  const patron = new RegExp(comando.source, "g");
  let salida = "";
  let desde = 0;
  for (let m = patron.exec(texto); m; m = patron.exec(texto)) {
    let i = m.index + m[0].length;
    const args: string[] = [];
    while (args.length < cuantos) {
      while (texto[i] === " ") i++;
      if (texto[i] !== "{") break;
      let nivel = 0;
      let j = i;
      for (; j < texto.length; j++) {
        if (texto[j] === "{") nivel++;
        else if (texto[j] === "}" && --nivel === 0) break;
      }
      if (nivel !== 0) break;
      args.push(conLlaves(texto.slice(i + 1, j), comando, cuantos, armar));
      i = j + 1;
    }
    if (args.length < cuantos) continue;
    salida += texto.slice(desde, m.index) + armar(args);
    desde = i;
    patron.lastIndex = i;
  }
  return salida + texto.slice(desde);
}
