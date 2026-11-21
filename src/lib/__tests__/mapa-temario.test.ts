import { describe, expect, it } from "vitest";
import { acomodoGeneral, acomodoUnidad, acomodoUnidadConAfines, avanceTemario, claveSubtema, claveTema, clavesDeActividad, limpiarRuta, nodosTemario, relacionesDeUnidades, relacionesPorPalabras, relacionesValidas } from "../mapa-temario";
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
  it("marca la relación con una unidad completa", () => {
    const t = (u: string, x: string) => claveTema(u, x);
    // Los dos temas de U1 tienen afines en U2: relación completa.
    const r = relacionesDeUnidades(asig, [
      { a: t("U1 Cinemática", "1.1 Velocidad"), b: t("U2 Dinámica", "2.1 Leyes de Newton") },
      { a: t("U1 Cinemática", "1.2 Aceleración"), b: t("U2 Dinámica", "2.1 Leyes de Newton") },
    ]);
    expect(r).toEqual([{ a: 0, b: 1, n: 2, completa: true }]);
    // Solo un tema: no es completa.
    expect(relacionesDeUnidades(asig, [{ a: t("U1 Cinemática", "1.1 Velocidad"), b: t("U2 Dinámica", "2.2 Fricción") }])[0].completa).toBe(false);
    // La IA la propone con las claves de las unidades; una unidad con sus propios temas no vale.
    expect(relacionesDeUnidades(asig, [{ a: "U1 Cinemática", b: "U2 Dinámica", motivo: "base" }])[0]).toMatchObject({ completa: true, motivo: "base" });
    expect(relacionesValidas({ ...asig, relaciones: [{ a: "U1 Cinemática", b: t("U1 Cinemática", "1.1 Velocidad") }] }).some((x) => x.a === "U1 Cinemática")).toBe(false);
  });
  it("acomoda las unidades sin encimarse y deja más cerca las relacionadas", () => {
    const unidades = Array.from({ length: 8 }, (_, i) => ({ nombre: `U${i + 1}`, temas: Array.from({ length: 3 + i }, (_, j) => ({ nombre: `T${i + 1}.${j + 1}`, subtemas: [] })) }));
    const a = { unidades };
    const relaciones = [
      { a: "U1", b: "U8" },
      { a: claveTema("U2", "T2.1"), b: claveTema("U7", "T7.1") },
    ];
    const ac = acomodoGeneral(a, relaciones);
    const g = ac.grupos;
    for (let i = 0; i < g.length; i++)
      for (let k = i + 1; k < g.length; k++) expect(Math.hypot(g[i].x - g[k].x, g[i].y - g[k].y)).toBeGreaterThanOrEqual(g[i].r + g[k].r + 60);
    for (const x of g) {
      expect(x.x - x.r).toBeGreaterThanOrEqual(0);
      expect(x.y - x.r).toBeGreaterThanOrEqual(0);
      expect(x.x + x.r).toBeLessThanOrEqual(ac.ancho);
      expect(x.y + x.r).toBeLessThanOrEqual(ac.alto);
    }
    expect(ac.ancho).toBeGreaterThan(ac.alto);
    const d = (i: number, k: number) => Math.hypot(g[i].x - g[k].x, g[i].y - g[k].y) - g[i].r - g[k].r;
    expect(d(0, 7)).toBeLessThan(d(0, 4));
    // El centro de cada unidad queda libre para su nodo.
    for (const u of unidades) for (const t of u.temas) expect(ac.posiciones[claveTema(u.nombre, t.nombre)]).not.toEqual(ac.posiciones[u.nombre]);
  });
  it("pone las unidades afines alrededor de la unidad abierta, sin encimarse", () => {
    const unidades = Array.from({ length: 8 }, (_, i) => ({ nombre: `U${i + 1}`, temas: Array.from({ length: 5 }, (_, j) => ({ nombre: `T${i + 1}.${j + 1}`, subtemas: [] })) }));
    const relaciones = [2, 3, 4, 5, 6, 7, 8].flatMap((k) => [
      { a: claveTema("U1", "T1.1"), b: claveTema(`U${k}`, `T${k}.1`) },
      { a: claveTema("U1", `T1.${(k % 5) + 1}`), b: claveTema(`U${k}`, `T${k}.2`) },
    ]);
    const ac = acomodoUnidadConAfines({ unidades }, 0, relaciones);
    expect(ac.afines).toHaveLength(7);
    const centro = ac.posiciones["U1"];
    const temas = ac.grupos;
    for (const g of ac.afines) {
      for (const t of temas) expect(Math.hypot(g.x - t.x, g.y - t.y)).toBeGreaterThan(g.r + t.r);
      expect(Math.hypot(g.x - centro.x, g.y - centro.y)).toBeGreaterThan(g.r);
    }
    for (let i = 0; i < ac.afines.length; i++)
      for (let k = i + 1; k < ac.afines.length; k++) {
        const [x, y] = [ac.afines[i], ac.afines[k]];
        expect(Math.hypot(x.x - y.x, x.y - y.y)).toBeGreaterThanOrEqual(x.r + y.r + 40);
      }
    expect(ac.enlaces.every((e) => ac.posiciones[e.a] && ac.posiciones[e.b])).toBe(true);
  });
});
