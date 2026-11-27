import { describe, expect, it } from "vitest";
import { avanceActividadGrupo, resumenActividadesGrupo } from "../avance-actividades-grupo";
import type { Actividad, Entrega } from "../tipos";

const ahora = new Date("2026-11-20T12:00:00Z");
const act = (id: string, extra: Partial<Actividad> = {}) => ({ id, grupoId: "g", titulo: id, fechaAplicacion: "2026-11-10", reactivos: [], ...extra }) as unknown as Actividad;
const ent = (actividadId: string, matricula: string, estado: Entrega["estado"]) =>
  ({ actividadId, matricula, estado, paginasRecibidas: 1, resultados: [], positivos: [], mejoras: [] }) as Entrega;

describe("avance de las actividades del grupo", () => {
  it("sin iniciar si aún no abre o no tiene fechas y no hay entregas", () => {
    expect(avanceActividadGrupo(act("a", { envioDesde: "2026-11-25T00:00:00Z", envioHasta: "2026-11-30T00:00:00Z" }), [], 3, ahora)).toBe("sin_iniciar");
    expect(avanceActividadGrupo(act("a"), [], 3, ahora)).toBe("sin_iniciar");
  });

  it("en proceso mientras recibe o falta revisar", () => {
    expect(avanceActividadGrupo(act("a", { envioHasta: "2026-11-30T00:00:00Z" }), [], 3, ahora)).toBe("en_proceso");
    expect(avanceActividadGrupo(act("a"), [ent("a", "A1", "aprobada")], 3, ahora)).toBe("en_proceso");
    const cerrada = act("a", { envioHasta: "2026-11-15T00:00:00Z" });
    expect(avanceActividadGrupo(cerrada, [ent("a", "A1", "evaluada")], 3, ahora)).toBe("en_proceso");
  });

  it("terminada si ya no espera entregas y todo está aprobado", () => {
    const cerrada = act("a", { envioHasta: "2026-11-15T00:00:00Z" });
    expect(avanceActividadGrupo(cerrada, [ent("a", "A1", "aprobada")], 3, ahora)).toBe("terminada");
    expect(avanceActividadGrupo(act("b"), [ent("b", "A1", "aprobada"), ent("b", "A2", "aprobada")], 2, ahora)).toBe("terminada");
  });

  it("resume un conjunto", () => {
    const r = resumenActividadesGrupo([act("a"), act("b", { envioHasta: "2026-11-30T00:00:00Z" })], [], 2, ahora);
    expect(r).toEqual({ total: 2, terminadas: 0, enProceso: 1, sinIniciar: 1 });
  });
});
