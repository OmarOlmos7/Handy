import { describe, expect, it } from "vitest";
import katex from "katex";
import { opcionesKatex } from "../latex";

describe("opcionesKatex", () => {
  it("dibuja \\sen como función, sin el rojo de comando desconocido", () => {
    const html = katex.renderToString("a = g(\\sen\\theta - \\mu_k \\cos\\theta)", opcionesKatex(false));
    expect(html).not.toContain("#cc0000");
    expect(html).toContain("sen");
    expect(html).toContain("mop");
  });
  it("cada llamada usa sus propias macros", () => {
    const a = opcionesKatex(true);
    const b = opcionesKatex(true);
    expect(a.macros).not.toBe(b.macros);
    expect(a.displayMode).toBe(true);
  });
});
