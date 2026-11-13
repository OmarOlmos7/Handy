import { describe, expect, it } from "vitest";
import { analiticasCurso, desviacion, mediana } from "../analiticas";
import type { Actividad, Entrega, Grupo } from "../tipos";

const reactivo = (numero: number, tema: string) => ({
  numero,
  tipo: "desarrollo" as const,
  enunciado: "",
  respuesta: "",
  puntos: 5,
  tema,
  habilidad: "Cálculo",
  pagina: 1,
});

const actividad = (id: string, fecha: string, etiqueta?: string): Actividad => ({
  id,
  grupoId: "g",
  titulo: id,
  descripcion: "",
  fechaAplicacion: fecha,
  paginas: 1,
  estado: "publicada",
  etiqueta,
  reactivos: [reactivo(1, "Vectores"), reactivo(2, "Fuerzas")],
});

const entrega = (actividadId: string, matricula: string, p1: number, p2: number): Entrega => ({
  actividadId,
  matricula,
  estado: "evaluada",
  paginasRecibidas: 1,
  resultados: [
    { numero: 1, puntosObtenidos: p1, respuestaLeida: "", confianza: "alta", comentario: "" },
    { numero: 2, puntosObtenidos: p2, respuestaLeida: "", confianza: "alta", comentario: "" },
  ],
  positivos: [],
  mejoras: [],
});

const grupo: Grupo = {
  id: "g",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026-2027",
  alumnos: [
    { matricula: "A1", nombre: "Ana", correo: "" },
    { matricula: "A2", nombre: "Beto", correo: "" },
    { matricula: "A3", nombre: "Caro", correo: "" },
  ],
};

describe("estadística básica", () => {
  it("mediana y desviación estándar poblacional", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
    expect(desviacion([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(desviacion([5])).toBe(0);
  });
});

describe("analiticasCurso", () => {
  const q = actividad("quiz", "2026-10-01", "Quiz");
  const t = actividad("tarea", "2026-10-10", "Tarea");
  const nueva = actividad("nueva", "2026-11-12", "Quiz");
  const entregas: Entrega[] = [
    entrega("quiz", "A1", 5, 5), // 100
    entrega("quiz", "A2", 5, 0), // 50
    entrega("quiz", "A3", 4, 4), // 80
    entrega("tarea", "A1", 5, 4), // 90
    // A2 no entregó la tarea: cuenta 0
    { ...entrega("tarea", "A3", 0, 0), estado: "sin_entregar", resultados: [] }, // 0
  ];
  const a = analiticasCurso(grupo, [nueva, t, q], entregas);

  it("cuenta como 0 lo no entregado y excluye actividades sin resultados", () => {
    expect(a.actividades.map((s) => s.id)).toEqual(["quiz", "tarea"]);
    expect(a.sinResultados.map((s) => s.id)).toEqual(["nueva"]);
    const tarea = a.actividades[1];
    expect(tarea.noEntregadas).toBe(2);
    expect(tarea.promedio).toBe(30); // (90 + 0 + 0) / 3
    expect(tarea.promedioEntregadas).toBe(90);
    expect(tarea.tasaEntrega).toBe(33);
  });

  it("calcula estadísticas por actividad", () => {
    const quiz = a.actividades[0];
    expect(quiz.promedio).toBeCloseTo(76.7, 1);
    expect(quiz.mediana).toBe(80);
    expect(quiz.minima).toBe(50);
    expect(quiz.maxima).toBe(100);
    expect(quiz.aprobacion).toBe(67);
  });

  it("promedia por tipo de actividad", () => {
    expect(a.porTipo.map((p) => p.nombre)).toEqual(["Quiz", "Tarea"]);
    expect(a.porTipo[0].promedio).toBeCloseTo(76.7, 1);
  });

  it("separa mejores resultados de alumnos que requieren atención", () => {
    expect(a.mejores.map((r) => r.alumno.matricula)).toEqual(["A1"]);
    expect(a.atencion.map((r) => r.alumno.matricula)).toEqual(["A2", "A3"]);
    expect(a.atencion[0].motivos).toContain("Promedio reprobatorio");
    expect(a.atencion[1].motivos.some((m) => m.startsWith("Bajó 80"))).toBe(true);
  });

  it("cuenta aprobados, niveles y entregas para los pasteles", () => {
    expect(a.general.aprobados + a.general.reprobados).toBe(3);
    expect(a.general.entregadas + a.general.noEntregadas).toBe(6);
    expect(a.niveles.alto + a.niveles.medio + a.niveles.bajo).toBe(3);
  });

  it("redacta hallazgos con los números calculados", () => {
    expect(a.hallazgos[0]).toContain("2 trabajos no entregados");
  });
});

describe("escala de color y conteos para gráficas", () => {
  it("colorDesempeno va de rojo a verde", async () => {
    const { colorDesempeno } = await import("../escala-color");
    expect(colorDesempeno(0)).toBe("#b91c1c");
    expect(colorDesempeno(100)).toBe("#15803d");
    expect(colorDesempeno(60)).toBe("#f97316");
    expect(colorDesempeno(-5)).toBe("#b91c1c");
    expect(colorDesempeno(75)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
