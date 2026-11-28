import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Base MMDB diminuta con el mismo formato que "IP to City Lite" de DB-IP (dos redes de prueba).
process.env.GEOIP_CIUDAD = path.join(__dirname, "datos", "ciudades-prueba.mmdb");

describe("ciudad por IP", () => {
  it("encuentra la ciudad y sus coordenadas sin salir del servidor", async () => {
    const { ubicacionDeIp } = await import("../clima-servidor");
    expect(await ubicacionDeIp("189.203.45.6")).toEqual({ ciudad: "Monterrey", lat: 25.6866, lon: -100.3161 });
    expect(await ubicacionDeIp("::ffff:8.8.8.8")).toMatchObject({ ciudad: "Mountain View" });
    expect(await ubicacionDeIp("1.1.1.1")).toBeUndefined();
    expect(await ubicacionDeIp("no-es-ip")).toBeUndefined();
    expect(await ubicacionDeIp("10.0.0.1")).toBeUndefined();
  });
});
