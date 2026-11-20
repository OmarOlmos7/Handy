import { describe, expect, it } from "vitest";
import { divisaDePais, formatoPorPagina, formatoPrecio, nombreDivisa, precioEn, textoDivisa } from "../divisas";

describe("divisas", () => {
  it("elige la divisa del país y usa dólares si no se sabe", () => {
    expect(divisaDePais("MX")).toMatchObject({ codigo: "MXN", prefijo: "Mx" });
    expect(divisaDePais("us").codigo).toBe("USD");
    expect(divisaDePais("ES").codigo).toBe("EUR");
    expect(divisaDePais("CO").prefijo).toBe("COP");
    expect(divisaDePais(undefined).codigo).toBe("USD");
    expect(divisaDePais("KE").codigo).toBe("USD");
  });

  it("convierte desde pesos redondeando hacia arriba", () => {
    expect(precioEn(139, divisaDePais("MX"))).toBe(139);
    expect(precioEn(139, divisaDePais("US"))).toBe(8);
    expect(precioEn(659, divisaDePais("US"))).toBe(36);
    expect(precioEn(139, divisaDePais("CO"))).toBe(30100);
    expect(precioEn(0, divisaDePais("US"))).toBe(0);
  });

  it("siempre antepone el prefijo de la divisa", () => {
    expect(formatoPrecio(139, divisaDePais("MX"), "es-MX")).toBe("Mx $139");
    expect(formatoPrecio(269, divisaDePais("US"), "en-US")).toBe("USD $15");
    expect(formatoPrecio(139, divisaDePais("FR"), "fr-FR")).toMatch(/^EUR 7\s?€$/);
    expect(formatoPorPagina(139, 300, divisaDePais("MX"), "es-MX")).toBe("Mx $0.463");
    expect(formatoPorPagina(139, 300, divisaDePais("US"), "en-US")).toBe("USD $0.0267");
  });

  it("nombra la divisa y aclara el IVA solo en pesos", () => {
    expect(nombreDivisa(divisaDePais("US"), "es-MX")).toBe("dólar estadounidense (USD)");
    expect(textoDivisa(divisaDePais("MX"), "es-MX", "IVA incluido")).toBe("peso mexicano (Mx), IVA incluido");
  });
});
