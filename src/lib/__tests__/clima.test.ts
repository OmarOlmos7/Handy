import { describe, expect, it } from "vitest";
import { claveLugar, climaDeMet, esIpLocal, estadoDeSimbolo } from "../clima";

describe("clima del encabezado", () => {
  it("convierte los símbolos de MET Norway en cinco estados", () => {
    expect(estadoDeSimbolo("clearsky_day")).toEqual({ estado: "soleado", noche: false });
    expect(estadoDeSimbolo("clearsky_night")).toEqual({ estado: "soleado", noche: true });
    expect(estadoDeSimbolo("fair_polartwilight")).toEqual({ estado: "soleado", noche: true });
    expect(estadoDeSimbolo("partlycloudy_day").estado).toBe("medio-nublado");
    expect(estadoDeSimbolo("cloudy").estado).toBe("nublado");
    expect(estadoDeSimbolo("fog").estado).toBe("nublado");
    expect(estadoDeSimbolo("lightrain").estado).toBe("lluvia");
    expect(estadoDeSimbolo("rainshowers_night")).toEqual({ estado: "lluvia", noche: true });
    expect(estadoDeSimbolo("heavysnow").estado).toBe("lluvia");
    expect(estadoDeSimbolo("heavyrainandthunder").estado).toBe("tormenta");
    expect(estadoDeSimbolo("lightrainshowersandthunder_day").estado).toBe("tormenta");
    expect(estadoDeSimbolo("algo_nuevo").estado).toBe("nublado");
  });

  it("toma la hora actual del pronóstico y redondea la temperatura", () => {
    const json = {
      properties: {
        timeseries: [
          { time: "2026-11-27T14:00:00Z", data: { instant: { details: { air_temperature: 18.4 } }, next_1_hours: { summary: { symbol_code: "cloudy" } } } },
          { time: "2026-11-27T15:00:00Z", data: { instant: { details: { air_temperature: 21.6 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" } } } },
          { time: "2026-11-27T16:00:00Z", data: { instant: { details: { air_temperature: 25 } }, next_6_hours: { summary: { symbol_code: "rain" } } } },
        ],
      },
    };
    expect(climaDeMet(json, Date.parse("2026-11-27T15:20:00Z"))).toEqual({ temperatura: 22, estado: "soleado", noche: false });
    // Antes de la primera hora: se usa la primera.
    expect(climaDeMet(json, Date.parse("2026-11-27T10:00:00Z"))?.temperatura).toBe(18);
    // Sin próxima hora se usa el resumen de 6 horas.
    expect(climaDeMet(json, Date.parse("2026-11-27T18:00:00Z"))).toEqual({ temperatura: 25, estado: "lluvia", noche: false });
  });

  it("no muestra -0 °C y rechaza respuestas incompletas", () => {
    const paso = (t: number) => ({
      properties: { timeseries: [{ time: "2026-01-01T00:00:00Z", data: { instant: { details: { air_temperature: t } }, next_1_hours: { summary: { symbol_code: "cloudy" } } } }] },
    });
    expect(Object.is(climaDeMet(paso(-0.3))?.temperatura, 0)).toBe(true);
    expect(climaDeMet(paso(-2.6))?.temperatura).toBe(-3);
    expect(climaDeMet({})).toBeUndefined();
    expect(climaDeMet(null)).toBeUndefined();
    expect(climaDeMet({ properties: { timeseries: [{ time: "2026-01-01T00:00:00Z", data: {} }] } })).toBeUndefined();
  });

  it("agrupa lugares cercanos y reconoce IP locales", () => {
    expect(claveLugar(25.6866, -100.3161)).toBe("25.69,-100.32");
    for (const ip of ["127.0.0.1", "10.2.3.4", "192.168.1.9", "172.20.0.5", "::1", "fd00::1", "::ffff:192.168.0.2"]) expect(esIpLocal(ip)).toBe(true);
    for (const ip of ["189.203.1.10", "172.32.0.1", "8.8.8.8", "2806:2f0::1"]) expect(esIpLocal(ip)).toBe(false);
  });
});
