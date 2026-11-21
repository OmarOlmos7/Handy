import { describe, expect, it } from "vitest";
import { avanceGrupo, colorProgreso } from "../avance-grupo";
import { claveTema } from "../mapa-temario";
import { horaYDiaMexico, registrarPulso } from "../tiempo";
import type { Actividad, Asignatura, Entrega, TiempoActividad } from "../tipos";

const asig: Pick<Asignatura, "id" | "unidades"> = {
  id: "fis",
  unidades: [
    { nombre: "U1", temas: [{ nombre: "T1", subtemas: [] }, { nombre: "T2", subtemas: [] }] },
    { nombre: "U2", temas: [{ nombre: "T3", subtemas: [] }] },
    { nombre: "U3", temas: [{ nombre: "T4", subtemas: [] }] },
  ],
};
const grupo = { id: "g", alumnos: ["A", "B"].map((m) => ({ matricula: m, nombre: `Alumno ${m}`, correo: "" })) };
const act = (id: string, unidad: string, temas: string[]): Actividad =>
  ({ id, grupoId: "g", titulo: id, temario: { asignaturaId: "fis", unidad, temas }, reactivos: [{ numero: 1, puntos: 10 }], escala: 100 }) as unknown as Actividad;
const ent = (actividadId: string, matricula: string, puntos: number): Entrega =>
  ({ actividadId, matricula, estado: "aprobada", paginasRecibidas: 1, resultados: [{ numero: 1, puntosObtenidos: puntos }], positivos: [], mejoras: [], entregadaEn: "2026-11-20T02:30:00Z" }) as unknown as Entrega;

describe("avance del grupo", () => {
  const acts = [act("a1", "U1", ["T1"]), act("a2", "U1", ["T2"]), act("a3", "U2", [])];
  const entregas = [ent("a1", "A", 10), ent("a2", "A", 5), ent("a1", "B", 8), ent("a3", "A", 9), ent("a3", "B", 4)];
  const tiempos: TiempoActividad[] = [
    { actividadId: "a1", matricula: "A", segundos: 600, porHora: Array.from({ length: 24 }, (_, h) => (h === 20 ? 600 : 0)), porDia: [0, 0, 0, 0, 600, 0, 0], primeraVez: "", ultimaVez: "" },
  ];
  const av = avanceGrupo(asig, grupo, acts, entregas, tiempos);
  it("calcula el avance por unidad, tema y alumno", () => {
    expect(av.unidades.map((u) => u.avance)).toEqual([75, 100, null]);
    expect(av.unidades[0].terminaron).toBe(1);
    expect(av.porClave[claveTema("U1", "T1")]).toBe(100);
    expect(av.porClave[claveTema("U1", "T2")]).toBe(50);
    expect(av.alumnos.find((a) => a.matricula === "A")).toMatchObject({ avance: 100, realizadas: 3, unidadesTerminadas: 2, segundos: 600 });
    expect(av.alumnos.find((a) => a.matricula === "B")).toMatchObject({ realizadas: 2, unidadesTerminadas: 1 });
    expect(av.resumen).toMatchObject({ unidadesTerminadas: 1, unidadesSinIniciar: 1, unidadesEnProceso: 1, avanceEnProceso: 75, avance: 83.3 });
    expect(av.temas.find((t) => t.nombre === "T1")?.segundos).toBe(600);
  });
  it("cuenta horarios en hora del centro de México", () => {
    expect(av.horas.segundos[20]).toBe(600);
    // 02:30 UTC = 20:30 del día anterior en el centro de México.
    expect(av.horas.entregas[20]).toBe(5);
    expect(av.insights.some((i) => i.clave === "horarioPico")).toBe(true);
  });
  it("colorea el avance por rangos", () => {
    expect([0, 50, 51, 79, 80, 99, 100].map(colorProgreso)).toEqual(["#dc2626", "#dc2626", "#eab308", "#eab308", "#16a34a", "#16a34a", "#2563eb"]);
  });
});

describe("tiempo con la actividad abierta", () => {
  it("acumula pulsos con tope y sin duplicados", () => {
    const db: { tiempos?: TiempoActividad[] } = {};
    const t0 = new Date("2026-11-21T18:00:00Z");
    expect(registrarPulso(db, "a", "A", 30, t0)).toBe(30);
    expect(registrarPulso(db, "a", "A", 30, new Date(t0.getTime() + 5000))).toBe(0);
    expect(registrarPulso(db, "a", "A", 500, new Date(t0.getTime() + 40000))).toBe(60);
    expect(registrarPulso(db, "a", "A", "x", new Date(t0.getTime() + 80000))).toBe(0);
    expect(db.tiempos![0].segundos).toBe(90);
    expect(db.tiempos![0].porHora[12]).toBe(90);
    expect(horaYDiaMexico(t0)).toEqual({ hora: 12, dia: 6 });
  });
});
