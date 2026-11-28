import { describe, expect, it } from "vitest";
import { actividadVisible, aperturaEnvio, estadoEnvio, leerFechas } from "../periodo";

const f = leerFechas({
  visibleDesde: "2026-11-23T08:00",
  envioDesde: "2026-11-24T08:00",
  envioHasta: "2026-11-25T23:59",
  resultadosDesde: "2026-11-27T08:00",
});
const en = (s: string) => new Date(`${s}:00-06:00`);

describe("fechas de la actividad", () => {
  it("convierte la hora del centro de México a ISO", () => {
    expect(f.visibleDesde).toBe("2026-11-23T14:00:00.000Z");
    expect(f.envioHasta).toBe("2026-11-26T05:59:00.000Z");
  });

  it("muestra la actividad desde el alta", () => {
    expect(actividadVisible(f, en("2026-11-23T07:59"))).toBe(false);
    expect(actividadVisible(f, en("2026-11-23T08:00"))).toBe(true);
    expect(actividadVisible({}, en("2020-01-01T00:00"))).toBe(true);
  });

  it("abre y cierra la recepción de entregas", () => {
    expect(estadoEnvio(f, en("2026-11-23T09:00"))).toBe("proximo");
    expect(estadoEnvio(f, en("2026-11-24T08:00"))).toBe("abierto");
    expect(estadoEnvio(f, en("2026-11-25T23:58"))).toBe("abierto");
    expect(estadoEnvio(f, en("2026-11-25T23:59"))).toBe("cerrado");
    expect(estadoEnvio({}, en("2026-11-25T23:59"))).toBe("abierto");
    // Sin inicio de envíos, la recepción abre con el alta.
    expect(estadoEnvio({ visibleDesde: f.visibleDesde }, en("2026-11-23T07:00"))).toBe("proximo");
    expect(aperturaEnvio({ visibleDesde: f.visibleDesde })).toBe(f.visibleDesde);
  });

  it("revisa el orden de las fechas", () => {
    expect(leerFechas({})).toEqual({});
    expect(() => leerFechas({ visibleDesde: "2026-11-25T08:00", envioDesde: "2026-11-24T08:00" })).toThrow(/alta/);
    expect(() => leerFechas({ envioDesde: "2026-11-25T08:00", envioHasta: "2026-11-25T08:00" })).toThrow(/cierre/);
    expect(() => leerFechas({ envioHasta: "2026-11-25T08:00", resultadosDesde: "2026-11-25T07:00" })).toThrow(/resultados/);
    expect(() => leerFechas({ envioDesde: "mañana" })).toThrow();
  });
});
