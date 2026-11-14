import { describe, expect, it } from "vitest";
import { limiteReenvio, permisoReenvio, primeraEntrega } from "../reenvio";
import type { Entrega } from "../tipos";

const entrega = (cambios: Partial<Entrega>): Entrega => ({
  actividadId: "a1",
  matricula: "A1",
  estado: "aprobada",
  paginasRecibidas: 2,
  resultados: [],
  positivos: [],
  mejoras: [],
  entregadaEn: "2026-11-13T18:00:00.000Z",
  ...cambios,
});

describe("reenvío de entregas", () => {
  it("acepta la primera entrega y reemplaza una aún sin evaluar", () => {
    expect(permisoReenvio(undefined, false)).toEqual({ ok: true, reemplaza: false });
    expect(permisoReenvio(entrega({ estado: "sin_entregar" }), false)).toEqual({ ok: true, reemplaza: false });
    expect(permisoReenvio(entrega({ estado: "entregada" }), false, new Date("2026-11-20T00:00:00Z"))).toEqual({ ok: true, reemplaza: true });
  });

  it("permite reenviar una entrega evaluada solo en los primeros 5 minutos", () => {
    const e = entrega({});
    expect(permisoReenvio(e, false, new Date("2026-11-13T18:04:59Z"))).toEqual({ ok: true, reemplaza: true });
    expect(permisoReenvio(e, false, new Date("2026-11-13T18:05:00Z")).ok).toBe(true);
    const tarde = permisoReenvio(e, false, new Date("2026-11-13T18:05:01Z"));
    expect(tarde.ok).toBe(false);
    if (!tarde.ok) expect(tarde.error).toMatch(/profesor/);
    const profe = permisoReenvio(e, true, new Date("2026-11-13T18:06:00Z"));
    if (!profe.ok) expect(profe.error).toMatch(/bote de basura/);
  });

  it("el plazo se cuenta desde la primera entrega, aunque haya reenvíos", () => {
    const e = entrega({ primeraEntregaEn: "2026-11-13T18:00:00.000Z", entregadaEn: "2026-11-13T18:04:00.000Z" });
    expect(primeraEntrega(e)).toBe("2026-11-13T18:00:00.000Z");
    expect(limiteReenvio(e)?.toISOString()).toBe("2026-11-13T18:05:00.000Z");
    expect(permisoReenvio(e, false, new Date("2026-11-13T18:06:00Z")).ok).toBe(false);
  });
});
