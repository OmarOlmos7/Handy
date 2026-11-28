import { describe, expect, it } from "vitest";
import {
  ErrorAsesoriaCurso,
  FRANJAS,
  agendaNueva,
  ahoraEnMexico,
  asesoriasPorAlumno,
  bloqueEn,
  bloquesDeCeldas,
  celdasDeBloques,
  cerrarAsesoria,
  diaSemana,
  duracionTexto,
  fechasSemana,
  instante,
  leerFechasCurso,
  limpiarSolicitud,
  lunesDe,
  minutosDisponibles,
  pendientesDeRecordatorio,
  quitarAlumnoDeAsesorias,
  renombrarMatriculaAsesorias,
  resumenAsesorias,
  revisarFranja,
  semanaParaAlumno,
} from "../asesorias";
import { textoPeriodo, vistaAsesoria } from "../asesorias-vista";
import type { AgendaProfesor, Asesoria, Grupo } from "../tipos";

const grupo: Grupo = {
  id: "g1",
  profesorId: "p1",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026",
  alumnos: [
    { matricula: "A1", nombre: "Ana", correo: "ana@x.com" },
    { matricula: "A2", nombre: "Beto", correo: "" },
  ],
};

// Semana del lunes 30 de noviembre de 2026.
const LUNES = "2026-11-30";
/** Un instante en hora del centro de México (UTC−6). */
const mx = (fecha: string, h: number, m = 0) => new Date(instante(fecha, h * 60 + m));

const agenda: AgendaProfesor = {
  profesorId: "p1",
  actualizadaEn: "",
  bloques: bloquesDeCeldas([
    // Cada lunes: clase 7:00–9:00, asesoría 9:00–10:00, comida 14:00–15:00.
    ...[420, 450, 480, 510].map((inicio) => ({ dia: 1, inicio, tipo: "clase" as const, titulo: "Física 3° B" })),
    ...[540, 570].map((inicio) => ({ dia: 1, inicio, tipo: "asesoria" as const })),
    ...[840, 870].map((inicio) => ({ dia: 1, inicio, tipo: "comida" as const })),
    // Solo el lunes 7 de diciembre se cancela la asesoría de 9:00 y hay reunión a las 9:30.
    { fecha: "2026-12-07", inicio: 540, tipo: "libre" as const },
    { fecha: "2026-12-07", inicio: 570, tipo: "reunion" as const },
  ]),
};

function asesoria(extra: Partial<Asesoria> = {}): Asesoria {
  return {
    id: "s1",
    grupoId: "g1",
    profesorId: "p1",
    matricula: "A1",
    fecha: LUNES,
    inicio: 540,
    duracion: 30,
    tema: "MRUA",
    comentarios: "",
    estado: "agendada",
    creadaEn: "2026-11-27T00:00:00Z",
    ...extra,
  };
}

describe("fechas y franjas", () => {
  it("lunes a viernes, de 7:00 a 18:00 en franjas de 30 min", () => {
    expect(FRANJAS).toHaveLength(22);
    expect(FRANJAS[0]).toBe(420);
    expect(FRANJAS.at(-1)).toBe(17 * 60 + 30);
    expect(fechasSemana(LUNES)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]);
  });

  it("el lunes de la semana; sábado y domingo pasan a la siguiente", () => {
    expect(lunesDe("2026-12-03")).toBe(LUNES);
    expect(lunesDe("2026-11-28")).toBe(LUNES);
    expect(lunesDe("2026-11-29")).toBe(LUNES);
    expect(diaSemana("2026-11-29")).toBe(7);
  });

  it("hora del centro de México (UTC−6)", () => {
    expect(ahoraEnMexico(new Date("2026-12-01T05:30:00Z"))).toEqual({ fecha: "2026-11-30", minutos: 23 * 60 + 30 });
    expect(instante(LUNES, 540)).toBe("2026-11-30T15:00:00.000Z");
  });

  it("duraciones legibles", () => {
    expect(duracionTexto(30)).toBe("30 min");
    expect(duracionTexto(60)).toBe("1 h");
    expect(duracionTexto(90)).toBe("1 h 30 min");
  });

  it("fechas del curso: el fin no puede ir antes del inicio", () => {
    expect(leerFechasCurso("2026-08-10", "2026-12-11")).toEqual({ inicio: "2026-08-10", fin: "2026-12-11" });
    expect(leerFechasCurso("", "")).toEqual({});
    expect(() => leerFechasCurso("2026-12-11", "2026-08-10")).toThrow(ErrorAsesoriaCurso);
    expect(() => leerFechasCurso("ayer", "")).toThrow(ErrorAsesoriaCurso);
  });
});

describe("agenda", () => {
  it("une celdas seguidas del mismo tipo y nota", () => {
    const lunes = agenda.bloques.filter((b) => b.dia === 1);
    expect(lunes).toEqual([
      { tipo: "clase", dia: 1, inicio: 420, fin: 540, titulo: "Física 3° B" },
      { tipo: "asesoria", dia: 1, inicio: 540, fin: 600 },
      { tipo: "comida", dia: 1, inicio: 840, fin: 900 },
    ]);
    expect(celdasDeBloques(lunes)).toHaveLength(8);
  });

  it("lo de una fecha manda sobre lo de cada semana", () => {
    expect(bloqueEn(agenda, LUNES, 540)?.tipo).toBe("asesoria");
    expect(bloqueEn(agenda, "2026-12-07", 540)).toBeUndefined();
    expect(bloqueEn(agenda, "2026-12-07", 570)?.tipo).toBe("reunion");
    expect(bloqueEn(agenda, "2026-12-01", 540)).toBeUndefined();
  });

  it("descarta celdas fuera del horario o del fin de semana", () => {
    expect(bloquesDeCeldas([{ dia: 6, inicio: 540, tipo: "clase" }, { dia: 1, inicio: 18 * 60, tipo: "clase" }, { dia: 1, inicio: 545, tipo: "clase" }])).toEqual([]);
  });

  it("guardar una semana reemplaza el horario semanal y solo los cambios de esas fechas", () => {
    const antes = [...agenda.bloques, { tipo: "otro" as const, fecha: "2027-01-04", inicio: 600, fin: 630 }];
    const nueva = agendaNueva(antes, [{ dia: 2, inicio: 600, tipo: "asesoria" }], [{ fecha: "2026-12-07", inicio: 600, tipo: "proyecto" }], fechasSemana("2026-12-07"));
    expect(nueva).toEqual([
      { tipo: "asesoria", dia: 2, inicio: 600, fin: 630 },
      { tipo: "proyecto", fecha: "2026-12-07", inicio: 600, fin: 630 },
      { tipo: "otro", fecha: "2027-01-04", inicio: 600, fin: 630 },
    ]);
  });

  it("minutos de asesoría que ofrece en la semana", () => {
    expect(minutosDisponibles(agenda, fechasSemana(LUNES))).toBe(60);
    expect(minutosDisponibles(agenda, fechasSemana("2026-12-07"))).toBe(0);
  });
});

describe("agendar", () => {
  const antes = mx("2026-11-27", 10);
  const datos = { agenda, asesorias: [] as Asesoria[], grupo, matricula: "A1" };

  it("acepta una franja de asesoría libre y una hora completa si cabe", () => {
    expect(() => revisarFranja(datos, LUNES, 540, 30, antes)).not.toThrow();
    expect(() => revisarFranja(datos, LUNES, 540, 60, antes)).not.toThrow();
  });

  it("rechaza franjas que no son de asesoría, pasadas, ocupadas o fuera del curso", () => {
    const motivo = (f: () => void) => {
      try {
        f();
      } catch (e) {
        return (e as ErrorAsesoriaCurso).clave;
      }
    };
    expect(motivo(() => revisarFranja(datos, LUNES, 570, 60, antes))).toBe("franja");
    expect(motivo(() => revisarFranja(datos, LUNES, 420, 30, antes))).toBe("franja");
    expect(motivo(() => revisarFranja(datos, LUNES, 540, 30, mx(LUNES, 9, 15)))).toBe("pasada");
    expect(motivo(() => revisarFranja({ ...datos, grupo: { ...grupo, fin: "2026-11-27" } }, LUNES, 540, 30, antes))).toBe("fueraDelCurso");
    const otra = asesoria({ id: "x", grupoId: "g9", matricula: "Z9", inicio: 570 });
    expect(motivo(() => revisarFranja({ ...datos, asesorias: [otra] }, LUNES, 540, 60, antes))).toBe("ocupada");
    // Una cancelada libera la franja.
    expect(motivo(() => revisarFranja({ ...datos, asesorias: [{ ...otra, estado: "cancelada" }] }, LUNES, 540, 60, antes))).toBeUndefined();
  });

  it("limita las asesorías por venir de cada alumno en el curso", () => {
    const tres = ["2026-12-01", "2026-12-02", "2026-12-03"].map((fecha, i) => asesoria({ id: `p${i}`, fecha }));
    expect(() => revisarFranja({ ...datos, asesorias: tres }, LUNES, 540, 30, antes)).toThrow("limite");
  });

  it("el tema es obligatorio y el motivo debe ser de la lista", () => {
    expect(() => limpiarSolicitud("  ", "", "")).toThrow("tema");
    expect(limpiarSolicitud(" MRUA ", "equipo", " ayuda\r\n")).toEqual({ tema: "MRUA", motivo: "equipo", comentarios: "ayuda" });
    expect(limpiarSolicitud("MRUA", "inventado", "")).toEqual({ tema: "MRUA", comentarios: "" });
  });

  it("el alumno ve libre, suya, ocupada o no disponible (sin saber qué hace el profesor)", () => {
    const mia = asesoria();
    const semana = semanaParaAlumno({ ...datos, asesorias: [mia] }, fechasSemana(LUNES), antes);
    expect(semana[LUNES].slice(0, 6)).toEqual(["no", "no", "no", "no", "mia", "libre"]);
    const deBeto = semanaParaAlumno({ ...datos, asesorias: [mia], matricula: "A2" }, fechasSemana(LUNES), antes);
    expect(deBeto[LUNES][4]).toBe("ocupada");
    expect(semanaParaAlumno(datos, fechasSemana(LUNES), mx(LUNES, 9, 40))[LUNES][5]).toBe("pasada");
  });
});

describe("registro y resumen del curso", () => {
  it("el profesor anota lo revisado, acuerdos y minutos reales", () => {
    const a = asesoria();
    cerrarAsesoria(a, { estado: "realizada", revisado: " Problema 3 ", acuerdos: "Rehacer", minutos: 45 });
    expect(a).toMatchObject({ estado: "realizada", revisado: "Problema 3", acuerdos: "Rehacer", duracionReal: 45 });
    cerrarAsesoria(a, { estado: "no_asistio", revisado: "", acuerdos: "" });
    expect(a.duracionReal).toBeUndefined();
    expect(() => cerrarAsesoria({ ...a, estado: "cancelada" }, { estado: "realizada", revisado: "", acuerdos: "" })).toThrow("cerrada");
  });

  it("cuenta cantidad y tiempo solo dentro de las fechas del curso", () => {
    const lista = [
      asesoria({ id: "1", estado: "realizada", duracionReal: 45 }),
      asesoria({ id: "2", estado: "realizada", matricula: "A2", fecha: "2026-12-01", duracion: 60 }),
      asesoria({ id: "3", estado: "no_asistio", fecha: "2026-12-02" }),
      asesoria({ id: "4", estado: "cancelada", fecha: "2026-12-03" }),
      asesoria({ id: "5", fecha: "2026-12-04" }),
      asesoria({ id: "6", fecha: "2026-11-23" }),
      asesoria({ id: "7", estado: "realizada", fecha: "2026-06-01" }),
      asesoria({ id: "8", estado: "realizada", grupoId: "otro" }),
    ];
    const curso = { ...grupo, inicio: "2026-08-10", fin: "2026-12-11" };
    const ahora = mx("2026-12-02", 12);
    expect(resumenAsesorias(lista, curso, undefined, ahora)).toEqual({
      realizadas: 2,
      minutos: 105,
      proximas: 1,
      porRegistrar: 1,
      noAsistio: 1,
      canceladas: 1,
      alumnos: 2,
      promedio: 53,
    });
    expect(resumenAsesorias(lista, curso, "A1", ahora)).toMatchObject({ realizadas: 1, minutos: 45 });
    expect(resumenAsesorias(lista, grupo, undefined, ahora).realizadas).toBe(3);
    expect(asesoriasPorAlumno(lista, curso).map((x) => [x.nombre, x.minutos])).toEqual([
      ["Beto", 60],
      ["Ana", 45],
    ]);
  });

  it("cambio de matrícula y baja del alumno", () => {
    const lista = [asesoria(), asesoria({ id: "b", grupoId: "otro" })];
    renombrarMatriculaAsesorias(lista, "g1", "A1", "N1");
    expect(lista.map((a) => a.matricula)).toEqual(["N1", "A1"]);
    expect(quitarAlumnoDeAsesorias(lista, "g1", "N1").map((a) => a.id)).toEqual(["b"]);
  });

  it("vista: por registrar, conflicto con la agenda y quién puede cancelar", () => {
    const v = vistaAsesoria(asesoria(), { grupo, locale: "es-MX", agenda, paraProfesor: true }, mx(LUNES, 11));
    expect(v).toMatchObject({ alumno: "Ana", estadoVista: "porRegistrar", horario: "9:00 – 9:30", puedeCancelar: false, conflicto: false, pasada: true });
    const movida = vistaAsesoria(asesoria({ fecha: "2026-12-07" }), { grupo, locale: "es-MX", agenda, paraProfesor: true }, mx(LUNES, 11));
    expect(movida).toMatchObject({ conflicto: true, puedeCancelar: true, estadoVista: "agendada" });
    expect(vistaAsesoria(asesoria(), { grupo, locale: "es-MX", paraProfesor: false }).alumno).toBeUndefined();
  });

  it("texto del periodo del curso", () => {
    const t = { periodo: "{i} al {f}", periodoDesde: "Desde el {i}", periodoHasta: "Hasta el {f}" };
    expect(textoPeriodo(t, "2026-08-10", "2026-12-11", "es-MX")).toMatch(/^10 ago.* al 11 dic/);
    expect(textoPeriodo(t, undefined, undefined, "es-MX")).toBeUndefined();
  });
});

describe("recordatorio de la mañana", () => {
  const lista = [asesoria({ id: "hoy" }), asesoria({ id: "manana", fecha: "2026-12-01" }), asesoria({ id: "ya", recordatorio: "x" }), asesoria({ id: "tarde", inicio: 840 })];

  it("sale desde las 6:30 para las asesorías del día que no han empezado", () => {
    expect(pendientesDeRecordatorio(lista, mx(LUNES, 6, 0))).toEqual([]);
    expect(pendientesDeRecordatorio(lista, mx(LUNES, 6, 30)).map((a) => a.id)).toEqual(["hoy", "tarde"]);
    expect(pendientesDeRecordatorio(lista, mx(LUNES, 10)).map((a) => a.id)).toEqual(["tarde"]);
    expect(pendientesDeRecordatorio([{ ...lista[0], estado: "cancelada" }], mx(LUNES, 7))).toEqual([]);
  });
});
