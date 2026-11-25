import { describe, expect, it } from "vitest";
import { costoGenerar } from "../autoestudio";
import { gestoPascal, hayCreditosAutoestudio, imagenPascal } from "../pascal";

describe("Pascal", () => {
  it("sale solo si el profesor tiene créditos para la actividad más barata", () => {
    const minimo = costoGenerar("practica");
    expect(hayCreditosAutoestudio(minimo)).toBe(true);
    expect(hayCreditosAutoestudio(minimo - 0.1)).toBe(false);
    expect(hayCreditosAutoestudio(0)).toBe(false);
  });

  it("elige la pose de lo más inmediato a lo más general", () => {
    expect(gestoPascal({ animo: "feliz", creando: true, ladrando: true })).toBe("idea");
    expect(gestoPascal({ animo: "feliz", ladrando: true, saludando: true })).toBe("ladra");
    expect(gestoPascal({ animo: "feliz", apoyo: true, saludando: true })).toBe("ladea");
    expect(gestoPascal({ animo: "feliz", saludando: true, clave: "racha" })).toBe("saluda");
    expect(gestoPascal({ animo: "feliz", senalando: true })).toBe("senala");
    expect(gestoPascal({ animo: "feliz", sinRestantes: true, clave: "racha" })).toBe("dormido");
  });

  it("si hay entregas vencidas llama la atención antes que la idea", () => {
    expect(gestoPascal({ animo: "llorando", clave: "temaNuevo" })).toBe("ladra");
    expect(gestoPascal({ animo: "enojado", clave: "temaBajo" })).toBe("senala");
    expect(gestoPascal({ animo: "serio", clave: "temaBajo" })).toBe("duda");
    expect(gestoPascal({ animo: "feliz", clave: "racha" })).toBe("corre");
    expect(gestoPascal({ animo: "triste" })).toBe("ladea");
  });

  it("ladrar usa la gráfica alegre", () => {
    expect(imagenPascal("ladra")).toBe("/pascal/alegre.webp");
    expect(imagenPascal("idea")).toBe("/pascal/idea.webp");
  });
});
