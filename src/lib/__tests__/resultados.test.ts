import { describe, expect, it } from "vitest";
import { aCampoFechaHora, deCampoFechaHora, fechaHoraLarga, resultadosDisponibles } from "../resultados";

describe("fecha de visualización de resultados", () => {
  it("interpreta el campo en hora del centro de México", () => {
    expect(deCampoFechaHora("2026-11-20T08:00")).toBe("2026-11-20T14:00:00.000Z");
    expect(deCampoFechaHora("")).toBeUndefined();
    expect(() => deCampoFechaHora("mañana")).toThrow();
  });

  it("regresa el mismo valor al campo y lo escribe legible", () => {
    const iso = deCampoFechaHora("2026-11-20T08:05")!;
    expect(aCampoFechaHora(iso)).toBe("2026-11-20T08:05");
    expect(fechaHoraLarga(iso)).toBe("20 nov 2026, 8:05 h");
    expect(aCampoFechaHora(undefined)).toBe("");
  });

  it("oculta los resultados antes de la fecha", () => {
    const a = { resultadosDesde: "2026-11-20T14:00:00.000Z" };
    expect(resultadosDisponibles(a, new Date("2026-11-20T13:59:00Z"))).toBe(false);
    expect(resultadosDisponibles(a, new Date("2026-11-20T14:00:00Z"))).toBe(true);
    expect(resultadosDisponibles({}, new Date("2000-01-01"))).toBe(true);
  });
});
