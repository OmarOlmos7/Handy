import { describe, expect, it } from "vitest";
import { detectarIdioma, textoDeActividad } from "../i18n/detectar";

describe("detectarIdioma", () => {
  it("reconoce cada idioma por sus palabras frecuentes y su escritura", () => {
    expect(detectarIdioma("Un cable se jala con una fuerza de 9.0 N. ¿Cuál es la aceleración angular del tambor?")).toBe("es");
    expect(detectarIdioma("A cable is pulled with a force of 9.0 N. What is the angular acceleration of the drum?")).toBe("en");
    expect(detectarIdioma("Un câble est tiré avec une force de 9,0 N. Quelle est l'accélération angulaire du tambour ?")).toBe("fr");
    expect(detectarIdioma("Ein Seil wird mit einer Kraft von 9,0 N gezogen. Wie groß ist die Winkelbeschleunigung der Trommel?")).toBe("de");
    expect(detectarIdioma("Um cabo é puxado com uma força de 9,0 N. Qual é a aceleração angular do tambor? Explique a solução.")).toBe("pt");
    expect(detectarIdioma("ドラムの角加速度を求めなさい。ケーブルは 9.0 N の力で引かれます。")).toBe("ja");
    expect(detectarIdioma("用 9.0 N 的力拉动缆绳。求鼓的角加速度是多少？")).toBe("zh");
  });
  it("ignora las fórmulas y no adivina con textos muy cortos", () => {
    expect(detectarIdioma("$\\int_0^1 x\\,dx$")).toBeUndefined();
    expect(detectarIdioma("TM2-1")).toBeUndefined();
    expect(detectarIdioma("")).toBeUndefined();
  });
  it("usa el título y los enunciados de la actividad", () => {
    const texto = textoDeActividad({ titulo: "Essay", reactivos: [{ enunciado: "Write an essay about the causes of the French Revolution and explain its effects." }] });
    expect(detectarIdioma(texto)).toBe("en");
  });
});
