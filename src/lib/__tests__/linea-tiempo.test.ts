import { describe, expect, it } from "vitest";
import { avanceDelPeriodo, iconoUnidad, lineaTiempoCurso } from "../linea-tiempo";

describe("lineaTiempoCurso", () => {
  it("reparte las unidades en tramos iguales dentro del curso", () => {
    const l = lineaTiempoCurso(["U1", "U2", "U3", "U4"], "2026-08-01", "2026-08-28", "2026-08-01")!;
    expect(l.map((u) => [u.desde, u.hasta])).toEqual([
      ["2026-08-01", "2026-08-07"],
      ["2026-08-08", "2026-08-14"],
      ["2026-08-15", "2026-08-21"],
      ["2026-08-22", "2026-08-28"],
    ]);
  });

  it("marca como cubiertas las que ya pasaron y en curso la de hoy", () => {
    const l = lineaTiempoCurso(["U1", "U2", "U3", "U4"], "2026-08-01", "2026-08-28", "2026-08-15")!;
    expect(l.map((u) => u.estado)).toEqual(["cubierta", "cubierta", "en_curso", "pendiente"]);
    const despues = lineaTiempoCurso(["U1", "U2"], "2026-08-01", "2026-08-28", "2026-09-30")!;
    expect(despues.every((u) => u.estado === "cubierta")).toBe(true);
    const antes = lineaTiempoCurso(["U1", "U2"], "2026-08-01", "2026-08-28", "2026-07-01")!;
    expect(antes.every((u) => u.estado === "pendiente")).toBe(true);
  });

  it("cubre todos los días sin huecos aunque no se dividan exacto", () => {
    const l = lineaTiempoCurso(["a", "b", "c"], "2026-01-01", "2026-01-10", "2026-01-01")!;
    expect(l[0].desde).toBe("2026-01-01");
    expect(l[2].hasta).toBe("2026-01-10");
    for (let i = 1; i < l.length; i++) {
      const fin = new Date(`${l[i - 1].hasta}T00:00:00Z`).getTime();
      expect(new Date(`${l[i].desde}T00:00:00Z`).getTime() - fin).toBe(86_400_000);
    }
  });

  it("devuelve null sin fechas, con fechas al revés o sin unidades", () => {
    expect(lineaTiempoCurso(["U1"], undefined, "2026-01-10", "2026-01-01")).toBeNull();
    expect(lineaTiempoCurso(["U1"], "2026-02-10", "2026-01-10", "2026-01-01")).toBeNull();
    expect(lineaTiempoCurso([], "2026-01-01", "2026-01-10", "2026-01-01")).toBeNull();
  });
});

describe("avanceDelPeriodo", () => {
  it("da el porcentaje del curso transcurrido", () => {
    expect(avanceDelPeriodo("2026-01-01", "2026-01-10", "2025-12-01")).toBe(0);
    expect(avanceDelPeriodo("2026-01-01", "2026-01-10", "2026-01-05")).toBe(50);
    expect(avanceDelPeriodo("2026-01-01", "2026-01-10", "2026-03-01")).toBe(100);
    expect(avanceDelPeriodo(undefined, "2026-01-10", "2026-01-05")).toBeNull();
  });
});

describe("iconoUnidad", () => {
  it("elige el ícono por palabras del nombre, sin importar acentos", () => {
    expect(iconoUnidad("Cinemática", 0)).toBe("movimiento");
    expect(iconoUnidad("Mediciones físicas", 0)).toBe("regla");
    expect(iconoUnidad("TERMODINÁMICA", 0)).toBe("termometro");
    expect(iconoUnidad("Funciones y gráficas", 0)).toBe("funcion");
  });
  it("sin pista usa uno por número", () => {
    expect(iconoUnidad("Unidad sin pistas", 0)).toBe("libro");
    expect(iconoUnidad("Unidad sin pistas", 1)).toBe("grafica");
  });
});
