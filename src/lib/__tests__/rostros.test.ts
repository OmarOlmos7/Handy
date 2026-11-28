import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTORES, agregarDescriptor, conocidosDelCurso, encimado, leerDescriptor, ordenLectura, partesDeFoto, reconocer, sinRepetidos } from "../rostros";

/** Descriptor de prueba: todo ceros salvo un valor. */
const d = (i: number, v = 1) => Array.from({ length: 128 }, (_, j) => (j === i ? v : 0));

describe("descriptores", () => {
  it("acepta 128 números finitos y redondea", () => {
    expect(leerDescriptor(d(0, 0.1234567))?.[0]).toBe(0.12346);
    expect(leerDescriptor([1, 2, 3])).toBeUndefined();
    expect(leerDescriptor([...d(0).slice(1), Number.NaN])).toBeUndefined();
    expect(leerDescriptor("x")).toBeUndefined();
  });

  it("guarda solo los más recientes", () => {
    const r = { descriptores: [] as number[][] };
    for (let i = 0; i < MAX_DESCRIPTORES + 2; i++) agregarDescriptor(r, d(i));
    expect(r.descriptores).toHaveLength(MAX_DESCRIPTORES);
    expect(r.descriptores.at(-1)).toEqual(d(MAX_DESCRIPTORES + 1));
  });
});

describe("reconocer", () => {
  const conocidos = [
    { matricula: "A1", descriptores: [d(0)] },
    { matricula: "A2", descriptores: [d(1), d(2)] },
  ];

  it("asigna cada rostro al alumno más parecido bajo el umbral", () => {
    const r = reconocer([d(2, 0.9), d(0, 1.05), d(5)], conocidos);
    expect(r.map((x) => x.matricula)).toEqual(["A2", "A1", undefined]);
    expect(r[0].distancia).toBeCloseTo(0.1, 3);
  });

  it("un alumno no se asigna a dos rostros: gana el más parecido", () => {
    const r = reconocer([d(0, 0.7), d(0, 0.95)], conocidos);
    expect(r.map((x) => x.matricula)).toEqual([undefined, "A1"]);
  });

  it("solo usa alumnos del curso con consentimiento y rostro", () => {
    const rostros = [
      { grupoId: "g1", matricula: "A1", consentimiento: "2026-11-01", descriptores: [d(0)], actualizadoEn: "" },
      { grupoId: "g1", matricula: "A2", descriptores: [d(1)], actualizadoEn: "" },
      { grupoId: "g1", matricula: "A3", consentimiento: "2026-11-01", descriptores: [], actualizadoEn: "" },
      { grupoId: "g2", matricula: "A4", consentimiento: "2026-11-01", descriptores: [d(3)], actualizadoEn: "" },
      { grupoId: "g1", matricula: "VIEJO", consentimiento: "2026-11-01", descriptores: [d(4)], actualizadoEn: "" },
    ];
    expect(conocidosDelCurso(rostros, "g1", new Set(["A1", "A2", "A3"])).map((c) => c.matricula)).toEqual(["A1"]);
  });
});

describe("cajas y partes de la foto", () => {
  it("mide el encimado y quita repetidos dejando el de más certeza", () => {
    const a = { x: 0, y: 0, ancho: 10, alto: 10 };
    expect(encimado(a, a)).toBe(1);
    expect(encimado(a, { x: 20, y: 0, ancho: 10, alto: 10 })).toBe(0);
    const r = sinRepetidos([
      { caja: a, certeza: 0.6, id: 1 },
      { caja: { x: 1, y: 1, ancho: 10, alto: 10 }, certeza: 0.9, id: 2 },
      { caja: { x: 50, y: 0, ancho: 10, alto: 10 }, certeza: 0.8, id: 3 },
    ]);
    expect(r.map((x) => x.id)).toEqual([2, 3]);
  });

  it("ordena por renglones de arriba abajo y de izquierda a derecha", () => {
    const caja = (x: number, y: number) => ({ caja: { x, y, ancho: 20, alto: 20 }, n: `${x},${y}` });
    expect(ordenLectura([caja(100, 5), caja(0, 100), caja(0, 0), caja(50, 110)]).map((c) => c.n)).toEqual(["0,0", "100,5", "0,100", "50,110"]);
  });

  it("revisa una foto chica entera y una grande también por partes que la cubren", () => {
    expect(partesDeFoto(800, 600)).toHaveLength(1);
    const partes = partesDeFoto(2400, 1800);
    expect(partes.length).toBeGreaterThan(4);
    const cubre = (x: number, y: number) => partes.slice(1).some((p) => x >= p.x && x <= p.x + p.ancho && y >= p.y && y <= p.y + p.alto);
    expect(cubre(0, 0) && cubre(2399, 1799) && cubre(1200, 900)).toBe(true);
  });
});
