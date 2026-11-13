import { describe, expect, it } from "vitest";
import { claveApellido, cuadernoCurso, ordenarFilas } from "../cuaderno";
import { calificacion } from "../estadisticas";
import type { Actividad, Entrega, Grupo } from "../tipos";

const act = (id: string, fecha: string, etiqueta: string, escala?: 10 | 100): Actividad => ({
  id,
  grupoId: "g",
  titulo: id,
  descripcion: "",
  fechaAplicacion: fecha,
  paginas: 1,
  estado: "publicada",
  etiqueta,
  escala,
  reactivos: [{ numero: 1, tipo: "desarrollo", enunciado: "", respuesta: "", puntos: 10, tema: "T", habilidad: "H", pagina: 1 }],
});

const ent = (actividadId: string, matricula: string, puntos: number | null, extra: Partial<Entrega> = {}): Entrega => ({
  actividadId,
  matricula,
  estado: puntos === null ? "entregada" : "evaluada",
  paginasRecibidas: 1,
  resultados: puntos === null ? [] : [{ numero: 1, puntosObtenidos: puntos, respuestaLeida: "", confianza: "alta", comentario: "" }],
  positivos: [],
  mejoras: [],
  ...extra,
});

const grupo: Grupo = {
  id: "g",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026-2027",
  alumnos: [
    { matricula: "A10", nombre: "Sofía Hernández Ruiz", correo: "" },
    { matricula: "A2", nombre: "Diego Álvarez López", correo: "" },
    { matricula: "A3", nombre: "Ana Zúñiga Pérez", correo: "" },
  ],
};

describe("cuadernoCurso", () => {
  const quiz = act("quiz", "2026-10-01", "Quiz", 100);
  const tarea = act("tarea", "2026-10-05", "Tarea", 10);
  const nueva = act("nueva", "2026-11-01", "Quiz", 100);
  const entregas = [
    ent("quiz", "A10", 9), // 90
    ent("quiz", "A2", 5, { calificacionManual: 70 }), // ajustada a mano
    // A3 no entregó el quiz: 0
    ent("tarea", "A10", 8), // 8 / 10
    ent("tarea", "A2", null), // entregada, por evaluar
    ent("tarea", "A3", 10), // 10 / 10
  ];
  const c = cuadernoCurso(grupo, [nueva, tarea, quiz], entregas);

  it("agrupa columnas por tipo y usa la escala mayor para el promedio del alumno", () => {
    expect(c.escala).toBe(100);
    expect(c.grupos.map((g) => [g.etiqueta, g.columnas.map((x) => x.id)])).toEqual([
      ["Quiz", ["quiz", "nueva"]],
      ["Tarea", ["tarea"]],
    ]);
  });

  it("marca cada celda: calificada, ajustada, no entregada, pendiente o sin resultados", () => {
    const [sofia, diego, ana] = c.filas;
    expect(sofia.celdas.quiz).toEqual({ valor: 90, estado: "calificada", manual: false, calculada: undefined });
    expect(diego.celdas.quiz).toEqual({ valor: 70, estado: "calificada", manual: true, calculada: 50 });
    expect(ana.celdas.quiz).toEqual({ valor: 0, estado: "no_entregada", manual: false });
    expect(diego.celdas.tarea.estado).toBe("pendiente");
    expect(ana.celdas.nueva.estado).toBe("sin_resultados");
  });

  it("promedia por alumno (sobre 100) y por actividad (en su escala)", () => {
    const [sofia, diego, ana] = c.filas;
    expect(sofia.promedio).toBe(85); // (90 + 80) / 2
    expect(diego.promedio).toBe(70); // solo el quiz; la tarea está por evaluar
    expect(ana.promedio).toBe(50); // (0 + 100) / 2
    expect(c.grupos[0].columnas[0].promedio).toBeCloseTo(53.3, 1); // (90 + 70 + 0) / 3
    expect(c.grupos[0].columnas[1].promedio).toBeNull();
    expect(c.grupos[1].columnas[0].promedio).toBe(9); // (8 + 10) / 2
  });

  it("la calificación manual reemplaza a la calculada", () => {
    expect(calificacion(quiz, entregas[1])).toBe(70);
  });

  it("ordena por nombre, apellido, matrícula y desempeño", () => {
    const ids = (o: Parameters<typeof ordenarFilas>[1]) => ordenarFilas(c.filas, o).map((f) => f.matricula);
    expect(ids("nombre")).toEqual(["A3", "A2", "A10"]);
    expect(ids("apellido")).toEqual(["A2", "A10", "A3"]);
    expect(ids("matricula")).toEqual(["A2", "A3", "A10"]);
    expect(ids("mayor")).toEqual(["A10", "A2", "A3"]);
    expect(ids("menor")).toEqual(["A3", "A2", "A10"]);
  });

  it("clave de apellido", () => {
    expect(claveApellido("Sofía Hernández Ruiz")).toBe("Hernández Ruiz Sofía");
    expect(claveApellido("María José Pérez Gil")).toBe("Pérez Gil María José");
    expect(claveApellido("Ana Ruiz")).toBe("Ruiz Ana");
  });
});
