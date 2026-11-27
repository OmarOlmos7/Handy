import { describe, expect, it } from "vitest";
import { entregasEnFechas, franjaEntrega, hoyAlumno, hoyProfesor, mesVecino, semanasDelMes } from "../agenda-hoy";
import { bloqueEn, bloquesDeCeldas, celdasDeBloques, pintarSemanal, restarRango, semanaParaAlumno, vigente } from "../asesorias";
import { asuetoEn, asuetosDelAnio, paisDeAsuetos, pascua } from "../asuetos";
import type { Asesoria, Grupo } from "../tipos";

const grupo: Grupo = { id: "g1", profesorId: "p1", materia: "Física", nombre: "3° B", ciclo: "2026", alumnos: [{ matricula: "A1", nombre: "Ana" }] } as unknown as Grupo;
/** Hora del centro de México (UTC−6) como Date. */
const mx = (fecha: string, h: number, m = 0) => new Date(`${fecha}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-06:00`);

describe("asuetos oficiales", () => {
  it("calcula la Pascua", () => {
    expect(pascua(2026)).toBe("2026-04-05");
    expect(pascua(2027)).toBe("2027-03-28");
    expect([2019, 2024, 2025, 2038].map(pascua)).toEqual(["2019-04-21", "2024-03-31", "2025-04-20", "2038-04-25"]);
  });

  it("México 2026: lunes de puente y fechas fijas", () => {
    const fechas = asuetosDelAnio("MX", 2026).map((a) => a.fecha);
    expect(fechas).toEqual(["2026-01-01", "2026-02-02", "2026-03-16", "2026-05-01", "2026-09-16", "2026-11-16", "2026-12-25"]);
    expect(asuetosDelAnio("MX", 2030).some((a) => a.fecha === "2030-10-01")).toBe(true);
  });

  it("otros países y país desconocido (México)", () => {
    expect(asuetoEn("US", "2026-11-26")).toBe("Thanksgiving");
    expect(asuetoEn("CA", "2026-05-18")).toBe("Victoria Day");
    expect(asuetoEn("ES", "2026-04-03")).toBe("Viernes Santo");
    expect(asuetoEn("CO", "2026-01-12")).toBe("Día de los Reyes Magos");
    expect(paisDeAsuetos("xx")).toBe("MX");
    expect(paisDeAsuetos(undefined)).toBe("MX");
    expect(asuetoEn(undefined, "2026-11-16")).toBe("Día de la Revolución");
  });

  it("el asueto bloquea el día salvo que el profesor marque esa fecha; se puede apagar", () => {
    const bloques = bloquesDeCeldas([{ dia: 1, inicio: 600, tipo: "asesoria" }]);
    expect(bloqueEn({ bloques }, "2026-11-16", 600)?.tipo).toBe("asueto");
    expect(bloqueEn({ bloques, asuetos: false }, "2026-11-16", 600)?.tipo).toBe("asesoria");
    const conCambio = [...bloques, ...bloquesDeCeldas([{ fecha: "2026-11-16", inicio: 600, tipo: "asesoria" }])];
    expect(bloqueEn({ bloques: conCambio }, "2026-11-16", 600)?.tipo).toBe("asesoria");
    // El alumno no puede agendar en asueto.
    const semana = semanaParaAlumno(
      { agenda: { bloques }, asesorias: [], grupo, matricula: "A1" },
      ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
      mx("2026-11-01", 8),
    );
    expect(semana["2026-11-16"].every((f) => f === "no")).toBe(true);
  });
});

describe("horario de cada semana con fechas", () => {
  it("solo vale entre sus fechas", () => {
    const bloques = bloquesDeCeldas([{ dia: 2, inicio: 420, tipo: "clase", grupoId: "g1", desde: "2026-08-10", hasta: "2026-12-04" }]);
    expect(bloques[0]).toMatchObject({ desde: "2026-08-10", hasta: "2026-12-04", grupoId: "g1" });
    expect(bloqueEn({ bloques }, "2026-12-01", 420)?.tipo).toBe("clase");
    expect(bloqueEn({ bloques }, "2026-12-08", 420)).toBeUndefined();
    expect(bloqueEn({ bloques }, "2026-08-04", 420)).toBeUndefined();
    expect(vigente({}, "2030-01-01")).toBe(true);
  });

  it("invierte fechas al revés y conserva los campos al ir y volver", () => {
    const [b] = bloquesDeCeldas([{ dia: 1, inicio: 420, tipo: "clase", desde: "2026-12-01", hasta: "2026-08-01" }]);
    expect([b.desde, b.hasta]).toEqual(["2026-08-01", "2026-12-01"]);
    const celdas = celdasDeBloques(bloquesDeCeldas([{ dia: 1, inicio: 420, tipo: "personal", etiqueta: "e1" }]));
    expect(celdas[0]).toMatchObject({ tipo: "personal", etiqueta: "e1" });
    // Una etiqueta propia sin id no se guarda.
    expect(bloquesDeCeldas([{ dia: 1, inicio: 420, tipo: "personal" }])).toEqual([]);
  });

  it("restarRango parte el bloque", () => {
    expect(restarRango({ desde: "2026-01-01", hasta: "2026-12-31" }, { desde: "2026-03-01", hasta: "2026-03-31" })).toEqual([
      { desde: "2026-01-01", hasta: "2026-02-28" },
      { desde: "2026-04-01", hasta: "2026-12-31" },
    ]);
    expect(restarRango({}, { desde: "2026-03-01" })).toEqual([{ hasta: "2026-02-28" }]);
    expect(restarRango({ desde: "2026-01-01", hasta: "2026-01-31" }, { desde: "2026-03-01" })).toEqual([{ desde: "2026-01-01", hasta: "2026-01-31" }]);
    expect(restarRango({ desde: "2026-03-05" }, {})).toEqual([]);
  });

  it("pintar con fechas reemplaza solo esas fechas", () => {
    let celdas = pintarSemanal([], 1, 420, {}, { tipo: "asesoria" });
    celdas = pintarSemanal(celdas, 1, 420, { desde: "2026-08-10", hasta: "2026-12-04" }, { tipo: "clase", grupoId: "g1" });
    const bloques = bloquesDeCeldas(celdas);
    expect(bloqueEn({ bloques }, "2026-08-03", 420)?.tipo).toBe("asesoria");
    expect(bloqueEn({ bloques }, "2026-09-07", 420)).toMatchObject({ tipo: "clase", grupoId: "g1" });
    expect(bloqueEn({ bloques }, "2026-12-07", 420)?.tipo).toBe("asesoria");
    // Borrar en esas fechas deja libre solo ese periodo.
    const borrado = bloquesDeCeldas(pintarSemanal(celdas, 1, 420, { desde: "2026-08-10", hasta: "2026-12-04" }));
    expect(bloqueEn({ bloques: borrado }, "2026-09-07", 420)).toBeUndefined();
    expect(bloqueEn({ bloques: borrado }, "2026-12-07", 420)?.tipo).toBe("asesoria");
  });
});

describe("entregas y actividades de hoy", () => {
  it("la entrega va en la franja de 30 min antes del cierre", () => {
    expect(franjaEntrega(600)).toBe(570);
    expect(franjaEntrega(615)).toBe(570);
    expect(franjaEntrega(23 * 60 + 59)).toBe(1050);
    expect(franjaEntrega(300)).toBe(420);
    const e = entregasEnFechas([{ id: "a1", grupoId: "g1", titulo: "Tarea 3", envioHasta: mx("2026-12-02", 14).toISOString() }], [grupo], ["2026-12-02"]);
    expect(e).toEqual([{ actividadId: "a1", grupoId: "g1", titulo: "Tarea 3", curso: "Física · 3° B", fecha: "2026-12-02", inicio: 810, cierre: 840 }]);
    expect(entregasEnFechas([{ id: "a1", grupoId: "g1", titulo: "x", envioHasta: mx("2026-12-03", 14).toISOString() }], [grupo], ["2026-12-02"])).toEqual([]);
  });

  const agenda = {
    bloques: bloquesDeCeldas([
      { dia: 3, inicio: 420, tipo: "clase", grupoId: "g1" },
      { dia: 3, inicio: 450, tipo: "clase", grupoId: "g1" },
      { dia: 3, inicio: 600, tipo: "asesoria" },
      { dia: 3, inicio: 720, tipo: "comida" },
    ]),
  };
  const cita: Asesoria = {
    id: "s1", grupoId: "g1", profesorId: "p1", matricula: "A1", fecha: "2026-12-02", inicio: 600, duracion: 30, tema: "MRUA", comentarios: "", estado: "agendada", creadaEn: "",
  } as Asesoria;
  const actividades = [{ id: "a1", grupoId: "g1", titulo: "Tarea 3", envioHasta: mx("2026-12-02", 14).toISOString() }];

  it("profesor: bloques, asesorías y entregas en orden", () => {
    const items = hoyProfesor({ agenda, asesorias: [cita], actividades, grupos: [grupo], ahora: mx("2026-12-02", 8) });
    expect(items.map((i) => [i.inicio, i.tipo])).toEqual([[420, "clase"], [600, "cita"], [720, "comida"], [840, "entrega"]]);
    expect(items[0]).toMatchObject({ fin: 480, detalle: "Física · 3° B" });
    expect(items[1]).toMatchObject({ texto: "MRUA", detalle: "Ana" });
  });

  it("alumno: su clase, su asesoría, entregas y el asueto", () => {
    const items = hoyAlumno({ cursos: [{ grupo, matricula: "A1", agenda }], asesorias: [cita], actividades, ahora: mx("2026-12-02", 8) });
    expect(items.map((i) => i.tipo)).toEqual(["clase", "cita", "entrega"]);
    const asueto = hoyAlumno({ cursos: [{ grupo, matricula: "A1", agenda }], asesorias: [], actividades: [], ahora: mx("2026-11-16", 8) });
    expect(asueto).toEqual([{ inicio: 420, fin: 1080, tipo: "asueto", texto: "Día de la Revolución" }]);
  });
});

describe("calendario general", () => {
  const otro: Grupo = { ...grupo, id: "g2", nombre: "3° C", alumnos: [{ matricula: "A1", nombre: "Ana" }] } as Grupo;
  const agenda = {
    bloques: bloquesDeCeldas([
      { dia: 3, inicio: 420, tipo: "clase", grupoId: "g1" },
      { dia: 3, inicio: 480, tipo: "clase", grupoId: "g2" },
      { fecha: "2026-12-02", inicio: 600, tipo: "evento", titulo: "Feria de ciencias", comun: true },
      { fecha: "2026-12-02", inicio: 660, tipo: "reunion", titulo: "Junta privada" },
      { fecha: "2026-12-02", inicio: 720, tipo: "comida", comun: true },
    ]),
  };
  const cursos = [
    { grupo, matricula: "A1", agenda },
    { grupo: otro, matricula: "A1", agenda },
  ];

  it("la actividad común se publica una sola vez; lo privado y la comida no", () => {
    const items = hoyAlumno({ cursos, asesorias: [], actividades: [], fecha: "2026-12-02" });
    expect(items.map((i) => [i.inicio, i.tipo, Boolean(i.comun)])).toEqual([
      [420, "clase", false],
      [480, "clase", false],
      [600, "evento", true],
    ]);
  });

  it("filtra por curso", () => {
    const alumno = hoyAlumno({ cursos, asesorias: [], actividades: [], fecha: "2026-12-02", grupoId: "g2" });
    expect(alumno.map((i) => i.inicio)).toEqual([480, 600]);
    const profesor = hoyProfesor({ agenda, asesorias: [], actividades: [], grupos: [grupo, otro], fecha: "2026-12-02", grupoId: "g1" });
    expect(profesor.map((i) => i.inicio)).toEqual([420, 600, 660, 720]);
  });

  it("semanas del mes (lunes a viernes) y meses vecinos", () => {
    const semanas = semanasDelMes("2026-11-15");
    expect(semanas[0][0]).toBe("2026-11-02");
    expect(semanas.at(-1)![0]).toBe("2026-11-30");
    expect(semanas).toHaveLength(5);
    expect(semanasDelMes("2026-12-01")[0][0]).toBe("2026-11-30");
    expect(mesVecino("2026-12-15", 1)).toBe("2027-01-01");
    expect(mesVecino("2026-01-15", -1)).toBe("2025-12-01");
  });
});
