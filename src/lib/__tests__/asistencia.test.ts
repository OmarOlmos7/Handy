import { describe, expect, it } from "vitest";
import {
  ErrorAsistencia,
  conteoLista,
  idSesion,
  leerHorario,
  leerIdSesion,
  leerMarcas,
  marcarTodos,
  minutosPorSemana,
  periodoAsistencia,
  porcentajeAsistencia,
  quitarAlumnoDeAsistencia,
  renombrarMatriculaAsistencia,
  resumenCurso,
  resumenPorAlumno,
  sesionDeHoy,
  sesionesDelCurso,
} from "../asistencia";
import type { Grupo, RegistroAsistencia } from "../tipos";

const grupo = (extra: Partial<Grupo> = {}): Grupo => ({
  id: "g1",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026-B",
  alumnos: [
    { matricula: "A1", nombre: "Beto", correo: "" },
    { matricula: "A2", nombre: "Ana", correo: "" },
    { matricula: "A3", nombre: "Carla", correo: "" },
  ],
  ...extra,
});

const registro = (fecha: string, marcas: RegistroAsistencia["marcas"], inicio = 480): RegistroAsistencia => ({
  grupoId: "g1",
  fecha,
  inicio,
  fin: inicio + 60,
  marcas,
  metodo: "manual",
  actualizadoEn: "2026-11-01T00:00:00Z",
});

describe("horario", () => {
  it("lee horas en texto o minutos, ordena y rechaza clases encimadas o al revés", () => {
    expect(
      leerHorario([
        { dia: 3, inicio: "10:00", fin: "11:30" },
        { dia: 1, inicio: 480, fin: 540 },
      ]),
    ).toEqual([
      { dia: 1, inicio: 480, fin: 540 },
      { dia: 3, inicio: 600, fin: 690 },
    ]);
    expect(() => leerHorario([{ dia: 1, inicio: "9:00", fin: "8:00" }])).toThrow(ErrorAsistencia);
    expect(() => leerHorario([{ dia: 8, inicio: "8:00", fin: "9:00" }])).toThrow(ErrorAsistencia);
    expect(() =>
      leerHorario([
        { dia: 2, inicio: "8:00", fin: "10:00" },
        { dia: 2, inicio: "9:00", fin: "11:00" },
      ]),
    ).toThrow(ErrorAsistencia);
    expect(leerHorario([])).toEqual([]);
  });

  it("cuenta las horas por semana (la mitad si es cada dos semanas)", () => {
    const h = [
      { dia: 1, inicio: 480, fin: 540 },
      { dia: 3, inicio: 480, fin: 570 },
    ];
    expect(minutosPorSemana(h)).toBe(150);
    expect(minutosPorSemana(h, 2)).toBe(75);
  });
});

describe("sesiones", () => {
  it("arma una sesión por clase en cada semana del curso, con asuetos marcados", () => {
    // Del lunes 2 al viernes 13 de noviembre de 2026: lunes y miércoles a las 8.
    const g = grupo({ inicio: "2026-11-02", fin: "2026-11-13", horario: [{ dia: 1, inicio: 480, fin: 540 }, { dia: 3, inicio: 480, fin: 540 }] });
    const s = sesionesDelCurso(g, "2026-11-10", [], (f) => (f === "2026-11-02" ? "Día de Muertos" : undefined));
    expect(s.map((x) => x.fecha)).toEqual(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
    expect(s[0].asueto).toBe("Día de Muertos");
    expect(s[1].id).toBe("2026-11-04-0800");
  });

  it("cada dos semanas cuenta desde la semana en que empieza el curso", () => {
    const g = grupo({ inicio: "2026-11-04", fin: "2026-11-30", horario: [{ dia: 5, inicio: 600, fin: 660 }], cadaSemanas: 2 });
    expect(sesionesDelCurso(g, "2026-11-10").map((x) => x.fecha)).toEqual(["2026-11-06", "2026-11-20"]);
  });

  it("incluye una clase en sábado de la primera semana y las listas fuera de horario", () => {
    const g = grupo({ inicio: "2026-11-07", fin: "2026-11-14", horario: [{ dia: 6, inicio: 540, fin: 600 }] });
    const extra = registro("2026-11-10", [], 700);
    expect(sesionesDelCurso(g, "2026-11-10", [extra]).map((x) => x.id)).toEqual(["2026-11-07-0900", "2026-11-10-1140", "2026-11-14-0900"]);
  });

  it("sin fechas del curso muestra semanas alrededor de hoy", () => {
    const p = periodoAsistencia({}, "2026-11-25");
    expect(p.desde < "2026-11-25" && p.hasta > "2026-11-25").toBe(true);
  });

  it("id de sesión de ida y vuelta, y la sesión de hoy", () => {
    expect(leerIdSesion(idSesion("2026-11-28", 7 * 60 + 5))).toEqual({ fecha: "2026-11-28", inicio: 425 });
    expect(leerIdSesion("2026-13-01-0800")).toBeUndefined();
    expect(leerIdSesion("2026-11-01-2500")).toBeUndefined();
    const s = [
      { id: "a", fecha: "2026-11-28", inicio: 480, fin: 540 },
      { id: "b", fecha: "2026-11-28", inicio: 720, fin: 780 },
    ];
    expect(sesionDeHoy(s, "2026-11-28", 500)?.id).toBe("a");
    expect(sesionDeHoy(s, "2026-11-28", 600)?.id).toBe("b");
    expect(sesionDeHoy(s, "2026-11-28", 900)?.id).toBe("b");
    expect(sesionDeHoy(s, "2026-11-29", 500)).toBeUndefined();
  });
});

describe("listas", () => {
  it("solo acepta alumnos del curso y estados válidos; la última marca manda", () => {
    const g = grupo();
    expect(
      leerMarcas(g, [
        { matricula: "A1", estado: "falta" },
        { matricula: "A1", estado: "retardo" },
      ]),
    ).toEqual([{ matricula: "A1", estado: "retardo" }]);
    expect(() => leerMarcas(g, [{ matricula: "ZZ", estado: "falta" }])).toThrow(ErrorAsistencia);
    expect(() => leerMarcas(g, [{ matricula: "A1", estado: "presente" }])).toThrow(ErrorAsistencia);
  });

  it("marca a todos o solo a los que no tienen marca", () => {
    const m = marcarTodos(["A1", "A2", "A3"], { A2: "falta" }, "asistencia", true);
    expect(m).toEqual({ A1: "asistencia", A2: "falta", A3: "asistencia" });
    expect(marcarTodos(["A1", "A2"], { A2: "falta" }, "retardo")).toEqual({ A1: "retardo", A2: "retardo" });
  });

  it("cuenta la lista y calcula el % con los retardos como asistencia", () => {
    const g = grupo();
    expect(conteoLista(g, registro("2026-11-02", [{ matricula: "A1", estado: "asistencia" }, { matricula: "A2", estado: "falta" }]))).toEqual({
      asistencia: 1,
      retardo: 0,
      falta: 1,
      sinMarca: 1,
    });
    expect(porcentajeAsistencia({ asistencia: 2, retardo: 1, falta: 1 })).toBe(75);
    expect(porcentajeAsistencia({ asistencia: 0, retardo: 0, falta: 0 })).toBeNull();
  });

  it("resume por alumno en orden alfabético y por curso", () => {
    const g = grupo({ inicio: "2026-11-02", fin: "2026-11-13", horario: [{ dia: 1, inicio: 480, fin: 540 }] });
    const regs = [
      registro("2026-11-02", [
        { matricula: "A1", estado: "asistencia" },
        { matricula: "A2", estado: "retardo" },
        { matricula: "A3", estado: "falta" },
      ]),
    ];
    const por = resumenPorAlumno(g, regs);
    expect(por.map((a) => a.nombre)).toEqual(["Ana", "Beto", "Carla"]);
    expect(por[0]).toMatchObject({ retardo: 1, porcentaje: 100 });
    expect(por[2]).toMatchObject({ falta: 1, porcentaje: 0 });
    const sesiones = sesionesDelCurso(g, "2026-11-10", regs);
    const r = resumenCurso(g, sesiones, regs, "2026-11-10", 600);
    expect(r).toMatchObject({ pasadas: 2, tomadas: 1, pendientes: 1, retardos: 1, faltas: 1 });
    expect(r.porcentaje).toBeCloseTo(66.7, 1);
  });

  it("sigue al alumno si cambia su matrícula y lo quita al darlo de baja", () => {
    const db = {
      asistencias: [registro("2026-11-02", [{ matricula: "A1", estado: "asistencia" }])],
      rostros: [{ grupoId: "g1", matricula: "A1" }],
    };
    renombrarMatriculaAsistencia(db, "g1", "A1", "B1");
    expect(db.asistencias[0].marcas[0].matricula).toBe("B1");
    expect(db.rostros[0].matricula).toBe("B1");
    quitarAlumnoDeAsistencia(db, "g1", "B1");
    expect(db.asistencias[0].marcas).toEqual([]);
    expect(db.rostros).toEqual([]);
  });
});
