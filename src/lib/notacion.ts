// Respuestas escritas en texto simple ("x(3x - 1)^4", "[2(x^2 + 1) cos(2x)]/(x^2 + 1)^4") pasadas a
// LaTeX para que se dibujen con tipografía matemática (superíndices, fracciones, funciones rectas).
// Sirve para las respuestas que ya estaban guardadas antes de pedirle a la IA el resultado en LaTeX.
// Es conservador: si el texto ya trae $…$ o no tiene notación matemática, se deja igual, y una
// división ambigua ("6x sen(2x)/(x+1)") conserva su diagonal en lugar de inventar una fracción.

const FUNCIONES: Record<string, string> = {
  sen: "\\sen", sin: "\\sin", cos: "\\cos", tan: "\\tan", tg: "\\tg", cot: "\\cot", ctg: "\\ctg", cotg: "\\cotg",
  sec: "\\sec", csc: "\\csc", cosec: "\\cosec", arcsen: "\\arcsen", arcsin: "\\arcsin", arccos: "\\arccos",
  arctan: "\\arctan", arctg: "\\arctg", senh: "\\senh", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
  ln: "\\ln", log: "\\log", exp: "\\exp", lim: "\\lim", max: "\\max", min: "\\min",
};

const GRIEGAS = new Set([
  "alpha", "beta", "gamma", "Gamma", "delta", "Delta", "epsilon", "theta", "Theta", "lambda", "Lambda", "mu", "pi", "Pi",
  "rho", "sigma", "Sigma", "tau", "phi", "Phi", "omega", "Omega",
]);

/** Unidades que van rectas después de un número ("9.8 m/s^2", "12 kg"). */
const UNIDADES = new Set([
  "m", "cm", "mm", "km", "s", "ms", "min", "h", "g", "kg", "mg", "N", "J", "kJ", "W", "kW", "Pa", "kPa", "Hz", "L", "mL", "ml",
  "K", "mol", "A", "V", "C", "rad", "cal", "kcal", "atm", "lb", "ft", "u", "dm",
]);

/** Palabras cortas del español que no son variables. */
const PALABRAS = new Set(["es", "la", "el", "en", "de", "un", "si", "no", "lo", "al", "se", "su", "ó"]);

const SIMBOLOS: Record<string, string> = {
  "*": "\\cdot ", "·": "\\cdot ", "×": "\\times ", "÷": "\\div ", ">=": "\\geq ", "≥": "\\geq ", "<=": "\\leq ", "≤": "\\leq ",
  "!=": "\\neq ", "≠": "\\neq ", "+-": "\\pm ", "±": "\\pm ", "->": "\\to ", "→": "\\to ", "≈": "\\approx ", "~": "\\sim ",
  "%": "\\%", "#": "\\#", "&": "\\&", "°": "^{\\circ}", "∞": "\\infty ", "π": "\\pi ", "Δ": "\\Delta ", "θ": "\\theta ",
};

const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

type Tipo = "num" | "var" | "fn" | "raiz" | "texto" | "grupo" | "op" | "esp";
interface Atomo {
  tipo: Tipo;
  tex: string;
  /** Para un grupo: el contenido sin sus paréntesis, por si va de exponente, raíz o fracción. */
  interior?: string;
  /** Ya lleva exponente o subíndice: en una fracción conserva sus paréntesis. */
  potencia?: boolean;
  /** Texto original del operador. */
  op?: string;
}

const TOKENS = /(\d+(?:\.\d+)?)|([A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)|(\s+)|(>=|<=|!=|\+-|->|[\s\S])/g;
const CIERRE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Separa el texto en piezas y marca las unidades que siguen a un número. */
function piezas(texto: string) {
  const crudo = texto.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => `^(${[...m].map((c) => SUPER[c]).join("")})`).replace(/√/g, " sqrt");
  const salida: { t: string; tipo: "num" | "letras" | "esp" | "op"; unidad?: boolean }[] = [];
  for (const m of crudo.matchAll(TOKENS)) salida.push({ t: m[0], tipo: m[1] ? "num" : m[2] ? "letras" : m[3] ? "esp" : "op" });
  // "9.8 m/s^2": tras número y espacio, las letras de unidad (y lo que sigue unido con / · ^) van rectas.
  let enUnidad = false;
  for (let i = 0; i < salida.length; i++) {
    const p = salida[i];
    if (p.tipo === "letras") {
      const tras = salida[i - 1]?.tipo === "esp" && salida[i - 2]?.tipo === "num";
      if ((enUnidad || tras) && UNIDADES.has(p.t)) {
        p.unidad = true;
        enUnidad = true;
      } else enUnidad = false;
    } else if (!(enUnidad && (["/", "*", "·", "^", "(", ")"].includes(p.t) || p.tipo === "num" || p.t === "-"))) enUnidad = false;
  }
  return salida;
}

function analizar(ps: ReturnType<typeof piezas>, desde: number, cierre?: string): { atomos: Atomo[]; fin: number; cerrado: boolean } {
  const atomos: Atomo[] = [];
  let i = desde;
  while (i < ps.length) {
    const p = ps[i];
    if (cierre && p.t === cierre) return { atomos, fin: i + 1, cerrado: true };
    if (p.tipo === "op" && CIERRE[p.t]) {
      const dentro = analizar(ps, i + 1, CIERRE[p.t]);
      if (dentro.cerrado) {
        const interior = armar(dentro.atomos);
        const grande = interior.includes("\\dfrac");
        const [a, b] = p.t === "{" ? ["\\{", "\\}"] : [p.t, CIERRE[p.t]];
        const tex = grande ? `\\left${a} ${interior} \\right${b}` : `${a}${interior}${b}`;
        atomos.push({ tipo: "grupo", tex, interior });
        i = dentro.fin;
        continue;
      }
      atomos.push({ tipo: "op", tex: p.t === "{" ? "\\{" : p.t, op: p.t });
      i++;
      continue;
    }
    if (p.tipo === "num") atomos.push({ tipo: "num", tex: p.t });
    else if (p.tipo === "esp") atomos.push({ tipo: "esp", tex: " " });
    else if (p.tipo === "letras") {
      if (p.unidad) atomos.push({ tipo: "texto", tex: `\\text{${p.t}}` });
      else if (p.t === "sqrt" || p.t === "raiz" || p.t === "raíz") atomos.push({ tipo: "raiz", tex: "\\sqrt{}" });
      else if (FUNCIONES[p.t]) atomos.push({ tipo: "fn", tex: FUNCIONES[p.t] });
      else if (GRIEGAS.has(p.t)) atomos.push({ tipo: "var", tex: `\\${p.t} ` });
      else if (p.t.length === 1 && /[A-Za-z]/.test(p.t)) atomos.push({ tipo: "var", tex: p.t });
      else if (p.t.length === 2 && /^[A-Za-z]+$/.test(p.t) && !PALABRAS.has(p.t)) atomos.push({ tipo: "var", tex: p.t });
      else atomos.push({ tipo: "texto", tex: `\\text{${p.t}}` });
    } else if (cierre === undefined && [")", "]", "}"].includes(p.t)) atomos.push({ tipo: "op", tex: p.t === "}" ? "\\}" : p.t, op: p.t });
    else atomos.push({ tipo: "op", tex: SIMBOLOS[p.t] ?? (p.t === "\\" ? "\\backslash " : p.t), op: p.t });
    i++;
  }
  // Sin su cierre: el paréntesis de apertura se dibuja tal cual y sigue lo demás.
  return { atomos, fin: i, cerrado: false };
}

/** Índice del átomo vecino que no es espacio. */
function vecino(xs: Atomo[], i: number, paso: 1 | -1) {
  let j = i + paso;
  while (xs[j]?.tipo === "esp") j += paso;
  return j;
}

/** Exponente o subíndice: el átomo que sigue, con su signo si lo trae ("^-1"). */
function potencias(xs: Atomo[]): Atomo[] {
  const salida: Atomo[] = [];
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i];
    const base = salida[salida.length - 1];
    if (a.tipo === "op" && (a.op === "^" || a.op === "_") && base && base.tipo !== "esp" && base.tipo !== "op") {
      let j = i + 1;
      let signo = "";
      if (xs[j]?.tipo === "op" && (xs[j].op === "-" || xs[j].op === "+")) signo = xs[j++].op!;
      const exp = xs[j];
      if (exp && exp.tipo !== "esp" && exp.tipo !== "op") {
        const contenido = signo + (exp.tipo === "grupo" && exp.tex.startsWith("(") ? exp.interior! : exp.tex.trim());
        salida[salida.length - 1] = { ...base, tex: `${base.tex}${a.op}{${contenido}}`, potencia: true };
        i = j;
        continue;
      }
    }
    // Raíz: sqrt(…) → \sqrt{…}
    if (base?.tipo === "raiz" && base.tex === "\\sqrt{}" && a.tipo !== "esp" && a.tipo !== "op") {
      salida[salida.length - 1] = { tipo: "var", tex: `\\sqrt{${a.tipo === "grupo" ? a.interior : a.tex}}` };
      continue;
    }
    salida.push(a);
  }
  return salida.map((a) => (a.tipo === "raiz" && a.tex === "\\sqrt{}" ? { ...a, tex: "\\sqrt{\\ }" } : a));
}

/** Un término está suelto si a su lado solo hay inicio, fin, espacio u operador (no un producto pegado). */
const suelto = (a: Atomo | undefined) => !a || a.tipo === "esp" || (a.tipo === "op" && a.op !== "'" && a.op !== "!");

/** Fracciones a/b cuando el numerador y el denominador se distinguen sin ambigüedad. */
function fracciones(xs: Atomo[]): Atomo[] {
  const salida = [...xs];
  for (let i = 0; i < salida.length; i++) {
    const a = salida[i];
    if (a.tipo !== "op" || a.op !== "/") continue;
    const ia = vecino(salida, i, -1);
    const ib = vecino(salida, i, 1);
    const num = salida[ia];
    const den = salida[ib];
    if (!num || !den || ["op", "esp", "fn", "texto"].includes(num.tipo) || ["op", "esp", "fn", "texto"].includes(den.tipo)) continue;
    const conGrupo = num.tipo === "grupo" || den.tipo === "grupo";
    const numeros = num.tipo === "num" && den.tipo === "num" && !num.potencia && !den.potencia;
    if (!conGrupo && !numeros) continue;
    // "6x sen(2x)/(x+1)" o "1/2x": el corte no es claro y se conserva la diagonal.
    if (!suelto(salida[ia - 1]) || !suelto(salida[ib + 1])) continue;
    const parte = (x: Atomo) => (x.tipo === "grupo" && !x.potencia && (x.tex.startsWith("(") || x.tex.startsWith("[") || x.tex.startsWith("\\left(") || x.tex.startsWith("\\left[")) ? x.interior! : x.tex);
    salida.splice(ia, ib - ia + 1, { tipo: "grupo", tex: `\\dfrac{${parte(num)}}{${parte(den)}}`, interior: `\\dfrac{${parte(num)}}{${parte(den)}}`, potencia: true });
    i = ia;
  }
  return salida;
}

function armar(xs: Atomo[]): string {
  const fin = fracciones(potencias(xs));
  return fin
    .map((a, i) => {
      if (a.tipo !== "esp") return a.tex;
      const antes = fin[i - 1];
      const despues = fin[i + 1];
      // Espacios visibles junto a palabras y después de comas o punto y coma.
      if (antes?.tipo === "texto" || despues?.tipo === "texto" || (antes?.tipo === "op" && [",", ";", ":"].includes(antes.op!))) return "\\ ";
      return " ";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** El texto parece notación matemática en texto simple (potencias, raíces, fracciones con paréntesis…). */
export function pareceMatematica(texto: string): boolean {
  if (texto.includes("$")) return false;
  return /[\^_√⁰¹²³⁴⁵⁶⁷⁸⁹⁻]|\bsqrt\b|[)\]]\s*\/|\/\s*[([]|\d\s*\/\s*\d|\w\s*\*\s*\w/.test(texto);
}

/** Igualdad corta del tipo "d = 122.5 m" o "f'(x) = 3x + 2": también va con tipografía matemática. */
function esIgualdad(texto: string): boolean {
  return /^\s*[A-Za-z](?:_?\w)?'*(?:\([A-Za-z]\))?\s*(?:=|≈)\s*[-+(\d\w]/.test(texto) && !/[A-Za-zÁÉÍÓÚáéíóúñ]{4,}/.test(texto.replace(/\b(?:sqrt|sen|cos|tan|arcsen|arccos|arctan|senh|cosh|tanh|cosec)\b/g, ""));
}

/** Expresión en texto simple pasada a LaTeX (sin los signos de dólar). */
export function textoALatex(texto: string): string {
  return armar(analizar(piezas(texto.trim()), 0).atomos);
}

/**
 * Respuesta lista para TextoMat: si ya trae LaTeX ($…$) o no tiene notación matemática se deja
 * igual; si es notación en texto simple se convierte y se envuelve en $…$.
 */
export function respuestaMat(texto: string): string {
  if (texto.includes("$") || !(pareceMatematica(texto) || esIgualdad(texto))) return texto;
  return texto
    .split("\n")
    .map((linea) => (linea.trim() ? `$${textoALatex(linea)}$` : linea))
    .join("\n");
}
