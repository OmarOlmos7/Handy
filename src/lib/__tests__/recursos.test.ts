import { describe, expect, it } from "vitest";
import { extraerJson, idYouTube, limpiarRecursos, normalizarRecurso, recursosParaTemas } from "../recursos";

describe("enlaces de estudio", () => {
  it("reconoce videos de YouTube en sus distintas formas", () => {
    expect(idYouTube("https://www.youtube.com/watch?v=abcdefghijk&t=30")).toBe("abcdefghijk");
    expect(idYouTube("https://youtu.be/abcdefghijk")).toBe("abcdefghijk");
    expect(idYouTube("https://www.youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
    expect(idYouTube("https://www.youtube.com/@julioprofe")).toBeUndefined();
  });

  it("acepta Khan Academy, YouTube y secciones de OpenStax; rechaza lo demás", () => {
    expect(normalizarRecurso({ tipo: "video", titulo: "Regla de la cadena", url: "https://youtu.be/abcdefghijk" })?.url).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
    expect(normalizarRecurso({ tipo: "khan", titulo: "Regla de la cadena", url: "https://es.khanacademy.org/math/ap-calculus-ab/x/chain-rule?x=1" })).toMatchObject({
      tipo: "khan",
      url: "https://es.khanacademy.org/math/ap-calculus-ab/x/chain-rule",
    });
    expect(normalizarRecurso({ tipo: "openstax", titulo: "3.6 Regla de la cadena", url: "https://openstax.org/books/calculo-volumen-1/pages/3-6-la-regla-de-la-cadena" })?.tipo).toBe(
      "openstax",
    );
    expect(normalizarRecurso({ tipo: "openstax", titulo: "Libro", url: "https://openstax.org/subjects/math" })).toBeUndefined();
    expect(normalizarRecurso({ tipo: "video", titulo: "Otro", url: "https://ejemplo.com/video" })).toBeUndefined();
    expect(normalizarRecurso({ tipo: "video", titulo: "Malo", url: "javascript:alert(1)" })).toBeUndefined();
  });

  it("limita por tema y descarta temas que no son de la rúbrica", () => {
    const r = limpiarRecursos(
      [
        {
          tema: "regla de la cadena",
          recursos: [
            { tipo: "video", titulo: "A", url: "https://youtu.be/aaaaaaaaaaa" },
            { tipo: "video", titulo: "B", url: "https://youtu.be/bbbbbbbbbbb" },
            { tipo: "video", titulo: "C", url: "https://youtu.be/ccccccccccc" },
            { tipo: "video", titulo: "A otra vez", url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" },
          ],
        },
        { tema: "Tema inventado", recursos: [{ tipo: "video", titulo: "X", url: "https://youtu.be/xxxxxxxxxxx" }] },
      ],
      ["Regla de la cadena", "Regla del producto"],
    );
    expect(Object.keys(r)).toEqual(["Regla de la cadena"]);
    expect(r["Regla de la cadena"].map((x) => x.titulo)).toEqual(["A", "B"]);
  });

  it("junta hasta 3 videos con Khan Academy primero y las lecturas de los temas del alumno", () => {
    const actividad = {
      recursos: {
        generadoEn: "",
        temas: {
          T1: [
            { tipo: "video" as const, titulo: "v1", url: "https://www.youtube.com/watch?v=11111111111", fuente: "" },
            { tipo: "khan" as const, titulo: "k1", url: "https://es.khanacademy.org/a", fuente: "" },
            { tipo: "openstax" as const, titulo: "o1", url: "https://openstax.org/books/x/pages/1", fuente: "" },
          ],
          T2: [
            { tipo: "video" as const, titulo: "v2", url: "https://www.youtube.com/watch?v=22222222222", fuente: "" },
            { tipo: "video" as const, titulo: "v3", url: "https://www.youtube.com/watch?v=33333333333", fuente: "" },
          ],
        },
      },
    };
    const r = recursosParaTemas(actividad, ["T1", "T2"]);
    expect(r.videos.map((v) => v.titulo)).toEqual(["k1", "v1", "v2"]);
    expect(r.lecturas.map((v) => v.titulo)).toEqual(["o1"]);
  });

  it("extrae el JSON de la respuesta aunque venga con texto alrededor", () => {
    expect(extraerJson('Listo:\n```json\n{"temas":[]}\n```')).toEqual({ temas: [] });
    expect(extraerJson('Aquí está {"a":1} fin')).toEqual({ a: 1 });
    expect(extraerJson("sin json")).toBeUndefined();
  });
});
