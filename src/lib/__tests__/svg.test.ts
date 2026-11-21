import { describe, expect, it } from "vitest";
import { svgSeguro } from "../svg";

describe("ilustraciones SVG", () => {
  it("acepta un dibujo simple y le agrega xmlns", () => {
    const r = svgSeguro('<svg viewBox="0 0 160 120"><circle cx="80" cy="60" r="40" stroke="#1e293b"/></svg>');
    expect(r).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
  it("rechaza scripts, eventos, enlaces e imágenes", () => {
    expect(svgSeguro('<svg><script>alert(1)</script></svg>')).toBeUndefined();
    expect(svgSeguro('<svg><rect onload="x()"/></svg>')).toBeUndefined();
    expect(svgSeguro('<svg><a href="https://x.y">x</a></svg>')).toBeUndefined();
    expect(svgSeguro('<svg><image href="x.png"/></svg>')).toBeUndefined();
    expect(svgSeguro("no es svg")).toBeUndefined();
  });
});
