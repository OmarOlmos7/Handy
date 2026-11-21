import { describe, expect, it } from "vitest";
import { archivarFotosDesde, debeArchivarse, diasRestantes, fechaBorrado, liberadaEn, porBorrarse } from "../retencion";
import { texAPlano } from "../tex-plano";
import type { Entrega } from "../tipos";

const entrega = (cambios: Partial<Entrega> = {}): Entrega => ({
  actividadId: "a",
  matricula: "A1",
  estado: "aprobada",
  paginasRecibidas: 1,
  resultados: [{ numero: 1, puntosObtenidos: 1, respuestaLeida: "", confianza: "alta", comentario: "" }],
  positivos: [],
  mejoras: [],
  imagenes: ["actividades/a/entregas/A1/1.jpg"],
  evaluadaEn: "2026-11-10T12:00:00.000Z",
  ...cambios,
});

describe("fotos de las entregas", () => {
  it("se archivan 7 días después de liberar los resultados", () => {
    const e = entrega();
    expect(archivarFotosDesde({}, e)?.toISOString()).toBe("2026-11-17T12:00:00.000Z");
    expect(debeArchivarse({}, e, new Date("2026-11-17T11:59:00Z"))).toBe(false);
    expect(debeArchivarse({}, e, new Date("2026-11-17T12:00:00Z"))).toBe(true);
  });

  it("si los resultados se ven más tarde, cuenta desde esa fecha", () => {
    const act = { resultadosDesde: "2026-11-20T15:00:00.000Z" };
    expect(liberadaEn(act, entrega())?.toISOString()).toBe("2026-11-20T15:00:00.000Z");
    expect(debeArchivarse(act, entrega(), new Date("2026-11-25T00:00:00Z"))).toBe(false);
  });

  it("no archiva entregas sin evaluar, ya archivadas, sin fotos o de ejemplo", () => {
    const ahora = new Date("2027-01-01T00:00:00Z");
    expect(debeArchivarse({}, entrega({ estado: "entregada" }), ahora)).toBe(false);
    expect(debeArchivarse({}, entrega({ pdf: "x.pdf" }), ahora)).toBe(false);
    expect(debeArchivarse({}, entrega({ imagenes: [] }), ahora)).toBe(false);
    expect(debeArchivarse({ demo: true }, entrega(), ahora)).toBe(false);
  });
});

describe("conservación de actividades", () => {
  it("se borran 1 año después del último reporte", () => {
    const f = fechaBorrado({ fechaAplicacion: "2026-11-01" }, [{ evaluadaEn: "2026-11-05T00:00:00.000Z" }, { evaluadaEn: "2026-11-10T00:00:00.000Z" }, {}]);
    expect(f.toISOString()).toBe("2027-11-10T00:00:00.000Z");
    expect(diasRestantes(f, new Date("2027-11-01T00:00:00Z"))).toBe(9);
    expect(porBorrarse(f, new Date("2027-11-01T00:00:00Z"))).toBe(true);
    expect(porBorrarse(f, new Date("2027-06-01T00:00:00Z"))).toBe(false);
  });

  it("sin reportes cuenta desde la fecha de aplicación", () => {
    expect(fechaBorrado({ fechaAplicacion: "2026-11-01" }, []).toISOString().slice(0, 10)).toBe("2027-11-01");
  });
});

describe("fórmulas en el PDF", () => {
  it("convierte LaTeX sencillo a texto", () => {
    expect(texAPlano("Calcula $\\alpha = \\frac{\\tau}{I}$ con $I = 0.09\\,\\text{kg m}^2$")).toBe("Calcula alfa = (tau)/(I) con I = 0.09 kg m^2");
    expect(texAPlano("$v = \\omega \\cdot r$")).toBe("v = omega · r");
  });
});
