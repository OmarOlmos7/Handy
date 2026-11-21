import { describe, expect, it } from "vitest";
import { anotacionesNumeradas, corregirPuntosCriterios, mitadSeccion, fraccionEjercicio, criteriosDelReactivo, elementosNumerados, fraccionCriterios, puntosPorElemento, reactivosDelCriterio } from "../elementos";
import { conPuntaje, listaParaRubrica } from "../modalidad";

const criterios = [
  { nombre: "Contenido", porcentaje: 40, descripcion: "" },
  { nombre: "Coherencia", porcentaje: 30, descripcion: "" },
  { nombre: "Elementos lingüísticos", porcentaje: 30, descripcion: "" },
];

describe("puntos por elemento de la rúbrica", () => {
  it("reparte los puntos de un desarrollo por sus pasos", () => {
    const r = { numero: 1, puntos: 4, pasos: [{ nombre: "Datos", peso: 0.25 }, { nombre: "Desarrollo", peso: 0.75 }] };
    expect(puntosPorElemento({}, r, { pasos: [1, 0.5] })).toEqual([
      { nombre: "Datos", total: 1, obtenidos: 1 },
      { nombre: "Desarrollo", total: 3, obtenidos: 1.5 },
    ]);
  });
  it("reparte los puntos de un abierto por los criterios y sus porcentajes", () => {
    expect(puntosPorElemento({ criterios }, { numero: 1, puntos: 10 }, { criterios: [1, 0.5, 0] })).toEqual([
      { nombre: "Contenido", total: 4, obtenidos: 4 },
      { nombre: "Coherencia", total: 3, obtenidos: 1.5 },
      { nombre: "Elementos lingüísticos", total: 3, obtenidos: 0 },
    ]);
    expect(fraccionCriterios({ criterios }, [1, 0.5, 0], 1)).toBeCloseTo(0.55);
  });
  it("sin pasos ni criterios no hay elementos", () => {
    expect(puntosPorElemento({}, { numero: 1, puntos: 1 }, { })).toEqual([]);
  });
});

describe("criterios por reactivo", () => {
  // Como en la actividad de francés: los criterios del ejercicio 2 y 3 no califican la redacción.
  const frances = [
    { nombre: "Exercice 1 : Verbes pronominaux", porcentaje: 30, descripcion: "" },
    { nombre: "Exercice 1 : Cohérence", porcentaje: 10, descripcion: "" },
    { nombre: "Exercice 2 : Associer l'heure", porcentaje: 15, descripcion: "" },
    { nombre: "Exercice 3 : Adjectifs au féminin", porcentaje: 15, descripcion: "" },
    { nombre: "Ortografía", porcentaje: 0, descripcion: "" },
  ];
  it("lee el número del ejercicio en el nombre o usa el indicado", () => {
    expect(reactivosDelCriterio(frances[2])).toEqual([2]);
    expect(reactivosDelCriterio({ nombre: "Pregunta 3: Ortografía" })).toEqual([3]);
    expect(reactivosDelCriterio({ nombre: "Contenido", reactivos: [4] })).toEqual([4]);
    expect(reactivosDelCriterio({ nombre: "Coherencia" })).toBeUndefined();
  });
  it("cada reactivo se califica solo con sus criterios", () => {
    expect(criteriosDelReactivo({ criterios: frances }, 1).map((c) => c.indice)).toEqual([0, 1, 4]);
    expect(criteriosDelReactivo({ criterios: frances }, 2).map((c) => c.indice)).toEqual([2, 4]);
    // Cumple los criterios del ejercicio 1; los de otros ejercicios (en 0) no le descuentan.
    expect(fraccionCriterios({ criterios: frances }, [1, 1, 0, 0, 0], 1)).toBe(1);
    expect(puntosPorElemento({ criterios: frances }, { numero: 1, puntos: 70 }, { criterios: [1, 0.5, 0, 0, 0] })).toEqual([
      { nombre: "Exercice 1 : Verbes pronominaux", total: 52.5, obtenidos: 52.5 },
      { nombre: "Exercice 1 : Cohérence", total: 17.5, obtenidos: 8.75 },
      { nombre: "Ortografía", total: 0, obtenidos: 0 },
    ]);
  });
});

describe("puntos guardados con criterios de otros ejercicios", () => {
  // Caso de la actividad de francés: el ejercicio 1 vale 70 y sus criterios suman 70 de 100 %.
  const criterios = [
    { nombre: "Exercice 1 : Verbes", porcentaje: 40, descripcion: "" },
    { nombre: "Exercice 1 : Cohérence", porcentaje: 30, descripcion: "" },
    { nombre: "Exercice 2 : L'heure", porcentaje: 15, descripcion: "" },
    { nombre: "Exercice 3 : Adjectifs", porcentaje: 15, descripcion: "" },
  ];
  const actividad = { criterios, reactivos: [{ numero: 1, tipo: "abierto", puntos: 70 }] } as never;
  it("recalcula si los puntos son los de la fórmula vieja", () => {
    // Vieja: (40 + 15) / 100 × 70 = 38.5. Nueva: (40 + 15) / 70 × 70 = 55.
    const res = { numero: 1, puntosObtenidos: 38.5, criterios: [1, 0.5, 0, 0] } as never as { puntosObtenidos: number };
    expect(corregirPuntosCriterios(actividad, res as never)).toBe(true);
    expect(res.puntosObtenidos).toBe(55);
    // Ya corregido, no vuelve a cambiar.
    expect(corregirPuntosCriterios(actividad, res as never)).toBe(false);
  });
  it("respeta los puntos que cambió el profesor", () => {
    const res = { numero: 1, puntosObtenidos: 50, criterios: [1, 0.5, 0, 0] } as never as { puntosObtenidos: number };
    expect(corregirPuntosCriterios(actividad, res as never)).toBe(false);
    expect(res.puntosObtenidos).toBe(50);
  });
});

describe("numerales de los elementos", () => {
  const r = { numero: 2, puntos: 10 };
  it("crecen de arriba hacia abajo sobre la hoja", () => {
    const res = {
      criterios: [1, 0, 0.5],
      ubicacionesElementos: [
        { pagina: 1, y: 0.6, x: 0.2 },
        { pagina: 1, y: 0.2, x: 0.5 },
        { pagina: 1, y: 0.4, x: 0.1 },
      ],
    };
    expect(elementosNumerados({ criterios }, r, res).map((e) => [e.numeral, e.nombre])).toEqual([
      ["2.1", "Coherencia"],
      ["2.2", "Elementos lingüísticos"],
      ["2.3", "Contenido"],
    ]);
  });
  it("sin ubicaciones, en el orden de la rúbrica", () => {
    expect(elementosNumerados({ criterios }, r, { criterios: [1, 0, 0.5] }).map((e) => e.numeral + " " + e.nombre)).toEqual([
      "2.1 Contenido",
      "2.2 Coherencia",
      "2.3 Elementos lingüísticos",
    ]);
  });
});

describe("anotaciones con subrayado", () => {
  it("primero los errores subrayados de arriba hacia abajo y luego los criterios con sus puntos", () => {
    const res = {
      criterios: [1, 0.5, 1],
      subrayados: [
        { pagina: 1, y: 0.6, x0: 0.2, x1: 0.4, comentario: "Je sors : conjugaison" },
        { pagina: 1, y: 0.3, x0: 0.1, x1: 0.3, comentario: "Verbe présenter" },
      ],
      ubicacionesElementos: [{ pagina: 1, y: 0.1, x: 0.1 }, { pagina: 1, y: 0.2, x: 0.1 }, { pagina: 1, y: 0.3, x: 0.1 }],
    };
    const lista = anotacionesNumeradas({ criterios }, { numero: 1, puntos: 10 }, res);
    expect(lista.map((a) => [a.numeral, a.nombre, a.ok, a.puntos?.obtenidos ?? null])).toEqual([
      ["1.1", "Verbe présenter", false, null],
      ["1.2", "Je sors : conjugaison", false, null],
      ["1.3", "Contenido", true, 4],
      ["1.4", "Coherencia", false, 1.5],
      ["1.5", "Elementos lingüísticos", true, 3],
    ]);
    // Con subrayados, los criterios son generales: sin numeral sobre la hoja.
    expect(lista.slice(2).every((a) => !a.ubicacion)).toBe(true);
  });
});

describe("modalidades", () => {
  it("sin solución, la rúbrica está lista en cuanto hay reactivos", () => {
    const reactivo = { respuesta: "", pasos: undefined } as never;
    expect(listaParaRubrica({ sinSolucion: true, reactivos: [reactivo] })).toBe(true);
    expect(listaParaRubrica({ reactivos: [reactivo] })).toBe(false);
    expect(conPuntaje({ sinPuntaje: true })).toBe(false);
    expect(conPuntaje({})).toBe(true);
  });
});

describe("mini pastel del número del ejercicio", () => {
  const vacio = { respuestaLeida: "", puntosObtenidos: 0 };
  it("en cerrados con varios renglones es la parte de renglones correctos", () => {
    const r = { numero: 2, puntos: 4, tipo: "relacion_columnas" as const, respuesta: "1-c, 2-a, 3-b, 4-d" };
    expect(fraccionEjercicio({}, r, { ...vacio, respuestaLeida: "1-c, 2-a, 3-d, 4-b" })).toBe(0.5);
  });
  it("no aplica a un cerrado de una sola respuesta", () => {
    const r = { numero: 1, puntos: 1, tipo: "opcion_multiple" as const, respuesta: "b" };
    expect(fraccionEjercicio({}, r, { ...vacio, respuestaLeida: "b" })).toBeUndefined();
  });
  it("con elementos numerados es la parte de puntos obtenidos", () => {
    const r = { numero: 1, puntos: 4, tipo: "desarrollo" as const, respuesta: "", pasos: [{ nombre: "Datos", peso: 0.25 }, { nombre: "Desarrollo", peso: 0.75 }] };
    expect(fraccionEjercicio({}, r, { ...vacio, pasos: [1, 0.5], puntosObtenidos: 2.5 })).toBe(0.625);
    expect(fraccionEjercicio({}, { ...r, pasos: undefined }, { ...vacio, puntosObtenidos: 4 })).toBeUndefined();
  });
});

describe("mitad de la sección del ejercicio", () => {
  it("queda entre el primero y el último de sus incisos de la página", () => {
    const res = {
      ubicacion: { pagina: 1, y: 0.3, x: 0.5 },
      ubicacionesIncisos: [
        { pagina: 1, y: 0.3, x: 0.4 },
        { pagina: 1, y: 0.5, x: 0.6, xCorrecta: 0.7, yCorrecta: 0.52 },
        { pagina: 2, y: 0.9, x: 0.9 },
      ],
    };
    expect(mitadSeccion({}, { numero: 3, puntos: 15 }, res)).toBeCloseTo(0.41);
  });
  it("sin ubicaciones no hay mitad", () => {
    expect(mitadSeccion({}, { numero: 3, puntos: 15 }, {})).toBeUndefined();
  });
});
