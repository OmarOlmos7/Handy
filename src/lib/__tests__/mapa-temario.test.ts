import { describe, expect, it } from "vitest";
import { acomodoGeneral, acomodoUnidad, avanceTemario, claveSubtema, claveTema, clavesDeActividad, limpiarRuta, nodosTemario, relacionesPorPalabras, relacionesValidas } from "../mapa-temario";
import type { Asignatura } from "../tipos";

const asig: Asignatura = {
  id: "fis",
  profesorId: "p",
  nombre: "Física",
  origen: "texto",
  creadaEn: "",
  actualizadaEn: "",
  unidades: [
    { nombre: "U1 Cinemática", temas: [{ nombre: "1.1 Velocidad", subtemas: ["Velocidad media", "Rapidez"] }, { nombre: "1.2 Aceleración", subtemas: [] }] },
    { nombre: "U2 Dinámica", temas: [{ nombre: "2.1 Leyes de Newton", subtemas: ["Segunda ley y aceleración"] }, { nombre: "2.2 Fricción", subtemas: [] }] },
  ],
};

describe("mapa del temario", () => {
  it("arma nodos de unidad, tema y subtema", () => {
    const n = nodosTemario(asig);
    expect(n.filter((x) => x.tipo === "unidad")).toHaveLength(2);
    expect(n.find((x) => x.nombre === "Rapidez")?.padre).toBe(claveTema("U1 Cinemática", "1.1 Velocidad"));
  });
  it("relaciona por palabras clave temas de unidades distintas", () => {
    const r = relacionesPorPalabras(asig);
    expect(r).toContainEqual({ a: claveTema("U1 Cinemática", "1.2 Aceleración"), b: claveSubtema("U2 Dinámica", "2.1 Leyes de Newton", "Segunda ley y aceleración") });
    expect(r.every((x) => x.a.split(" › ")[0] !== x.b.split(" › ")[0])).toBe(true);
  });
  it("descarta relaciones con claves que ya no existen", () => {
    const r = relacionesValidas({ ...asig, relaciones: [{ a: "no existe", b: claveTema("U2 Dinámica", "2.2 Fricción") }] });
    expect(r.some((x) => x.a === "no existe")).toBe(false);
  });
  it("calcula el avance por subtema, tema y unidad", () => {
    const acts = [
      { id: "a1", titulo: "Quiz", temario: { asignaturaId: "fis", unidad: "U1 Cinemática", temas: ["Rapidez"] } },
      { id: "a2", titulo: "Tarea", temario: { asignaturaId: "fis", unidad: "U1 Cinemática", temas: ["1.2 Aceleración"] } },
      { id: "a3", titulo: "Examen", temario: { asignaturaId: "fis", unidad: "U2 Dinámica", temas: [] } },
      { id: "a4", titulo: "Otra materia", temario: { asignaturaId: "otra", unidad: "U1 Cinemática", temas: ["Rapidez"] } },
    ];
    const notas: Record<string, number | null> = { a1: 90, a2: 50, a3: null };
    const av = avanceTemario(asig, acts, (id) => ({ porcentaje: notas[id] ?? null }));
    expect(av[claveSubtema("U1 Cinemática", "1.1 Velocidad", "Rapidez")].promedio).toBe(90);
    expect(av[claveTema("U1 Cinemática", "1.1 Velocidad")].promedio).toBe(90);
    expect(av["U1 Cinemática"].promedio).toBe(70);
    expect(av["U2 Dinámica"].actividades.map((x) => x.id)).toEqual(["a3"]);
    expect(av["U2 Dinámica"].promedio).toBeNull();
    expect(clavesDeActividad(asig, acts[3])).toEqual([]);
  });
  it("limpia la ruta del alumno", () => {
    expect(limpiarRuta(asig, [claveTema("U2 Dinámica", "2.2 Fricción"), "inventado", claveTema("U2 Dinámica", "2.2 Fricción"), "U1 Cinemática"])).toEqual([
      claveTema("U2 Dinámica", "2.2 Fricción"),
    ]);
  });
  it("acomoda todos los nodos dentro del lienzo", () => {
    for (const ac of [acomodoGeneral(asig), acomodoUnidad(asig, 0)]) {
      for (const p of Object.values(ac.posiciones)) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.y).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(ac.ancho);
        expect(p.y).toBeLessThan(ac.alto);
      }
    }
  });
});
