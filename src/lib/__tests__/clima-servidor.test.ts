import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.GEOIP_CIUDAD = "/no/existe.mmdb";

const respuesta = (temp: number, simbolo: string) =>
  new Response(
    JSON.stringify({
      properties: { timeseries: [{ time: "2020-01-01T00:00:00Z", data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: simbolo } } } }] },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

afterEach(() => vi.unstubAllGlobals());

describe("clima en el servidor", () => {
  it("consulta MET Norway una vez por lugar, con 2 decimales y con agente identificado", async () => {
    const { climaEn } = await import("../clima-servidor");
    const fetchFalso = vi.fn(async () => respuesta(23.4, "partlycloudy_day"));
    vi.stubGlobal("fetch", fetchFalso);
    const [a, b] = await Promise.all([climaEn(25.68661, -100.31611), climaEn(25.6871, -100.3159)]);
    expect(a).toEqual({ temperatura: 23, estado: "medio-nublado", noche: false });
    expect(b).toEqual(a);
    await climaEn(25.6866, -100.3161);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("lat=25.69&lon=-100.32");
    expect((opciones.headers as Record<string, string>)["User-Agent"]).toMatch(/^iEureka-Grader\//);
  });

  it("si el servicio falla no rompe y espera antes de reintentar", async () => {
    const { climaEn } = await import("../clima-servidor");
    const fetchFalso = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchFalso);
    expect(await climaEn(19.43, -99.13)).toBeUndefined();
    expect(await climaEn(19.43, -99.13)).toBeUndefined();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("sin base de ciudades o con IP local no hay clima ni consulta", async () => {
    const { climaDeIp } = await import("../clima-servidor");
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);
    expect(await climaDeIp("189.203.1.10")).toBeUndefined();
    expect(await climaDeIp("192.168.1.5")).toBeUndefined();
    expect(await climaDeIp(undefined)).toBeUndefined();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
