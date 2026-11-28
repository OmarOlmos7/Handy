import { describe, expect, it } from "vitest";
import katex from "katex";
import { opcionesKatex } from "../latex";
import { pareceMatematica, respuestaMat, textoALatex } from "../notacion";
import { texAPlano } from "../tex-plano";

describe("respuestaMat", () => {
  it("convierte exponentes con ^ en superíndices de LaTeX", () => {
    expect(respuestaMat("q'(x) = x(3x - 1)^4 (21x - 2)")).toBe("$q'(x) = x(3x - 1)^{4} (21x - 2)$");
    expect(respuestaMat("x^-1 + e^(2x)")).toBe("$x^{-1} + e^{2x}$");
    expect(respuestaMat("y = 3x² - 2x + 1")).toBe("$y = 3x^{2} - 2x + 1$");
  });

  it("arma la fracción cuando el numerador y el denominador están entre paréntesis o corchetes", () => {
    expect(respuestaMat("r'(x) = [2(x^2 + 1) cos(2x) - 6x sen(2x)]/(x^2 + 1)^4")).toBe(
      "$r'(x) = \\dfrac{2(x^{2} + 1) \\cos(2x) - 6x \\sen(2x)}{(x^{2} + 1)^{4}}$",
    );
    expect(respuestaMat("f(x) = (x+1)/(x-1)")).toBe("$f(x) = \\dfrac{x+1}{x-1}$");
    expect(respuestaMat("1/2 (e - 1) ≈ 0.86")).toBe("$\\dfrac{1}{2} (e - 1) \\approx 0.86$");
  });

  it("conserva la diagonal cuando la fracción sería ambigua", () => {
    expect(respuestaMat("6x sen(2x)/(x+1)")).toBe("$6x \\sen(2x)/(x+1)$");
  });

  it("deja rectas las unidades después de un número", () => {
    expect(respuestaMat("a = 9.8 m/s^2")).toBe("$a = 9.8\\ \\text{m}/\\text{s}^{2}$");
  });

  it("no toca lo que ya es LaTeX ni el texto sin notación matemática", () => {
    expect(respuestaMat("$x^2$")).toBe("$x^2$");
    expect(respuestaMat("La velocidad es 20 m/s")).toBe("La velocidad es 20 m/s");
    expect(respuestaMat("F = 12 N")).toBe("$F = 12\\ \\text{N}$");
    expect(respuestaMat("d = 122.5 m")).toBe("$d = 122.5\\ \\text{m}$");
    expect(respuestaMat("x = 3 porque se despeja")).toBe("x = 3 porque se despeja");
    expect(pareceMatematica("Explica con tus palabras el ciclo del agua.")).toBe(false);
  });

  it("produce LaTeX que KaTeX dibuja sin errores", () => {
    for (const t of ["r'(x) = [2(x^2 + 1) cos(2x) - 6x sen(2x)]/(x^2 + 1)^4", "x = sqrt(x^2 + 1)", "a) x^2 (b) 3", "x = 2, y = -3^2 ≥ 4 * 5", "{x | x^2 > 1}"]) {
      const html = katex.renderToString(textoALatex(t), opcionesKatex(false));
      expect(html).not.toContain("katex-error");
      expect(html).not.toContain("#cc0000");
    }
  });
});

describe("texAPlano con respuestas en LaTeX", () => {
  it("conserva funciones y usa ² ³ en el PDF de texto", () => {
    expect(texAPlano("$q'(x) = x(3x - 1)^{4}(21x - 2)$")).toBe("q'(x) = x(3x - 1)^4(21x - 2)");
    expect(texAPlano("$\\dfrac{2\\cos(2x) - 6x\\sen(2x)}{(x^{2} + 1)^{4}}$")).toBe("(2 cos(2x) - 6x sen(2x))/((x² + 1)^4)");
    expect(texAPlano("$v^{1.5}$ y $x^{12}$")).toBe("v^(1.5) y x^(12)");
  });
});
