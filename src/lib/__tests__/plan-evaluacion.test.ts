import { describe, expect, it } from "vitest";
import { cuadernoCurso } from "../cuaderno";
import { ordenarEntregas } from "../listas";
import { errorPlan, limpiarPesos, normalizarA100, notaFinal } from "../plan-evaluacion";
import type { Actividad, Entrega, Grupo } from "../tipos";

const reactivo = { numero: 1, tipo: "desarrollo", enunciado: "", respuesta: "", puntos: 10, tema: "", habilidad: "", pagina: 1 };
const act = (id: string, etiqueta?: string, escala: 10 | 100 = 10) =>
  ({ id, grupoId: "g", titulo: id, fechaAplicacion: "2026-11-01", etiqueta, escala, reactivos: [reactivo] }) as unknown as Actividad;
const ent = (actividadId: string, matricula: string, puntos: number) =>
  ({ actividadId, matricula, estado: "aprobada", paginasRecibidas: 1, resultados: [{ numero: 1, puntosObtenidos: puntos, respuestaLeida: "", confianza: "alta", comentario: "" }], positivos: [], mejoras: [] }) as Entrega;
const grupo: Grupo = {
  id: "g",
  materia: "F",
  nombre: "1",
  ciclo: "",
  alumnos: [
    { matricula: "A2", nombre: "Ana Zamora Pérez", correo: "" },
    { matricula: "A1", nombre: "Beto Álvarez Ruiz", correo: "" },
  ],
};

describe("lista de entregas", () => {
  const entregas = [
    { matricula: "A2", estado: "aprobada" },
    { matricula: "A1", estado: "sin_entregar" },
  ];
  const nombre = (m: string) => grupo.alumnos.find((a) => a.matricula === m)!.nombre;
  it("ordena por apellido paterno, nombre o matrícula", () => {
    expect(ordenarEntregas(entregas, nombre, "apellido").map((e) => e.matricula)).toEqual(["A1", "A2"]);
    expect(ordenarEntregas(entregas, nombre, "nombre").map((e) => e.matricula)).toEqual(["A2", "A1"]);
    expect(ordenarEntregas(entregas, nombre, "matricula").map((e) => e.matricula)).toEqual(["A1", "A2"]);
  });
  it("filtra entregadas y sin entregar", () => {
    expect(ordenarEntregas(entregas, nombre, "nombre", "entregadas").map((e) => e.matricula)).toEqual(["A2"]);
    expect(ordenarEntregas(entregas, nombre, "nombre", "sin_entregar").map((e) => e.matricula)).toEqual(["A1"]);
  });
});

describe("plan de evaluación", () => {
  it("limpia, junta repetidos y usa el nombre de la etiqueta del curso", () => {
    expect(limpiarPesos([{ etiqueta: "examen", porcentaje: 30 }, { etiqueta: "EXAMEN ", porcentaje: 10 }, { etiqueta: "Tarea", porcentaje: 0 }], ["Examen"])).toEqual([
      { etiqueta: "Examen", porcentaje: 40 },
    ]);
  });
  it("normaliza a 100 y valida la suma", () => {
    const n = normalizarA100([{ etiqueta: "A", porcentaje: 1 }, { etiqueta: "B", porcentaje: 1 }, { etiqueta: "C", porcentaje: 1 }]);
    expect(n.reduce((s, p) => s + p.porcentaje, 0)).toBeCloseTo(100);
    expect(errorPlan([])).toBe("vacio");
    expect(errorPlan([{ etiqueta: "A", porcentaje: 90 }])).toBe("suma");
    expect(errorPlan([{ etiqueta: "A", porcentaje: 60 }, { etiqueta: "B", porcentaje: 40 }])).toBeUndefined();
  });
  it("calcula la nota final con los porcentajes y reparte los tipos sin calificar", () => {
    const acts = [act("t1", "Tarea"), act("t2", "Tarea"), act("ex", "Examen", 100), act("proy", "Proyecto")];
    const ents = [ent("t1", "A1", 10), ent("t2", "A1", 6), ent("ex", "A1", 5), ent("t1", "A2", 10)];
    const c = cuadernoCurso(grupo, acts, ents);
    const plan = { pesos: [{ etiqueta: "Tarea", porcentaje: 40 }, { etiqueta: "Examen", porcentaje: 40 }, { etiqueta: "Proyecto", porcentaje: 20 }], actualizadoEn: "" };
    const n = notaFinal(c, plan);
    // El cuaderno va sobre 100 (hay un examen sobre 100). A1: tareas 80, examen 50 → (80·40 + 50·40) / 80 = 65.
    expect(n.porAlumno.get("A1")).toBe(65);
    // A2: tareas (100 + 0 de la no entregada) / 2 = 50; examen no entregado = 0 → 25. Proyecto aún sin calificar.
    expect(n.porAlumno.get("A2")).toBe(25);
    expect(n.ponderacionActual).toBe(80);
    expect(n.sinCalificar).toEqual(["Proyecto"]);
    expect(n.promedioGrupo).toBe(45);
  });
});
