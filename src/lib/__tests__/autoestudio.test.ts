import { describe, expect, it } from "vitest";
import {
  logroConDesarrollo,
  logroNumerico,
  animoCompanero,
  calificacionAuto,
  clavesCompletar,
  costoGenerar,
  logroEjercicio,
  notaConAutoestudio,
  pendientesDelAlumno,
  pesoAutoestudio,
  restantesHoy,
  resumenAutoestudio,
  autoestudioPorTipo,
  autoestudioGrupo,
  senalesDeRiesgo,
  sinDatosPersonales,
  sugerenciasCompanero,
  temasDelCurso,
  LIMITE_DIARIO,
} from "../autoestudio";
import type { Autoactividad } from "../tipos";

const ahora = new Date("2026-11-21T18:00:00Z");
const haceDias = (d: number) => new Date(ahora.getTime() - d * 86_400_000).toISOString();

describe("señales de riesgo", () => {
  it("detecta agresión, tristeza profunda, enojo y violencia", () => {
    expect(senalesDeRiesgo("ya no quiero vivir")).toBe(true);
    expect(senalesDeRiesgo("Estoy muy deprimida")).toBe(true);
    expect(senalesDeRiesgo("te odio, eres un idiota")).toBe(true);
    expect(senalesDeRiesgo("voy a golpearlo a la salida")).toBe(true);
    expect(senalesDeRiesgo("estoy furioso con todos")).toBe(true);
    expect(senalesDeRiesgo("I want to die")).toBe(true);
  });
  it("no confunde el contenido de las materias", () => {
    expect(senalesDeRiesgo("tiro parabólico: se dispara un proyectil")).toBe(false);
    expect(senalesDeRiesgo("la bola golpea la pared en un choque elástico")).toBe(false);
    expect(senalesDeRiesgo("Matemáticas: ecuaciones de segundo grado")).toBe(false);
    expect(senalesDeRiesgo("me costó al principio pero ya le entendí")).toBe(false);
    expect(senalesDeRiesgo("")).toBe(false);
  });
});

describe("datos personales", () => {
  it("quita nombre, matrícula y correo antes de mandar a la IA", () => {
    const t = sinDatosPersonales("Soy Ana López, matrícula A0123, ana@x.mx, quiero fracciones", { nombre: "Ana López", matricula: "A0123", correo: "ana@x.mx" });
    expect(t).not.toMatch(/Ana|López|A0123|ana@x\.mx/);
    expect(t).toContain("fracciones");
  });
});

describe("calificación por código", () => {
  it("opción y verdadero o falso", () => {
    expect(logroEjercicio({ tipo: "opcion", respuesta: "b" }, ["b"])).toBe(1);
    expect(logroEjercicio({ tipo: "opcion", respuesta: "b" }, ["c"])).toBe(0);
    expect(logroEjercicio({ tipo: "verdadero_falso", respuesta: "F" }, ["F"])).toBe(1);
  });
  it("multirespuesta resta las incorrectas", () => {
    expect(logroEjercicio({ tipo: "multirespuesta", respuesta: "a, c" }, ["a", "c"])).toBe(1);
    expect(logroEjercicio({ tipo: "multirespuesta", respuesta: "a, c" }, ["a"])).toBe(0.5);
    expect(logroEjercicio({ tipo: "multirespuesta", respuesta: "a, c" }, ["a", "b"])).toBe(0);
  });
  it("relación por pares", () => {
    expect(logroEjercicio({ tipo: "relacion", respuesta: "1-b, 2-a, 3-d, 4-c" }, ["b", "a", "c", "c"])).toBe(0.75);
    expect(logroEjercicio({ tipo: "relacion_imagenes", respuesta: "1-c, 2-a" }, ["c", "a"])).toBe(1);
  });
  it("completar sin importar mayúsculas ni acentos, con variantes", () => {
    expect(clavesCompletar("masa | aceleración")).toEqual(["masa", "aceleración"]);
    expect(logroEjercicio({ tipo: "completar", respuesta: "masa | aceleración" }, ["Masa", "aceleracion"])).toBe(1);
    expect(logroEjercicio({ tipo: "completar", respuesta: "rápido/veloz | lento" }, ["veloz", "x"])).toBe(0.5);
    expect(logroEjercicio({ tipo: "completar", respuesta: "masa" }, [""])).toBe(0);
  });
  it("texto y manuscrito van a la IA", () => {
    expect(logroEjercicio({ tipo: "texto", respuesta: "…" }, [])).toBeNull();
    expect(logroEjercicio({ tipo: "manuscrito", respuesta: "…" }, [])).toBeNull();
  });
  it("calificación sobre 100", () => {
    expect(calificacionAuto([{ logro: 1 }, { logro: 0.5 }, { logro: 0 }, { logro: 1 }])).toBe(63);
    expect(calificacionAuto([{ logro: 1 }], 4)).toBe(25);
    expect(calificacionAuto([])).toBe(0);
  });
});

describe("reactivos numéricos", () => {
  it("acepta el resultado dentro del margen, con coma o con unidades", () => {
    const ej = { tipo: "numerica" as const, respuesta: "12.5 m/s", tolerancia: 0.05 };
    expect(logroEjercicio(ej, ["12.5"])).toBe(1);
    expect(logroEjercicio(ej, ["12,54 m/s"])).toBe(1);
    expect(logroEjercicio(ej, ["12.6"])).toBe(0);
    expect(logroEjercicio(ej, [""])).toBe(0);
  });
  it("sin tolerancia usa el 1 % del resultado", () => {
    expect(logroNumerico({ respuesta: "200 N" }, "201.5")).toBe(1);
    expect(logroNumerico({ respuesta: "200 N" }, "203")).toBe(0);
  });
  it("con desarrollo suma resultado y procedimiento en cuartos", () => {
    expect(logroConDesarrollo(1, 1)).toBe(1);
    expect(logroConDesarrollo(1, 0)).toBe(0.5);
    expect(logroConDesarrollo(0, 0.75)).toBe(0.5);
    expect(logroConDesarrollo(0, 0)).toBe(0);
  });
});

describe("límites y créditos", () => {
  it("cuenta las creadas en 24 horas", () => {
    const lista = [haceDias(0.1), haceDias(0.5), haceDias(2)].map((creadaEn) => ({ alumnoId: "x", creadaEn }));
    expect(restantesHoy(lista, "x", ahora)).toBe(LIMITE_DIARIO - 2);
    expect(restantesHoy(lista, "otro", ahora)).toBe(LIMITE_DIARIO);
  });
  it("lecturas y videos cuestan el doble", () => {
    expect(costoGenerar("lectura")).toBeCloseTo(costoGenerar("practica") * 2, 2);
    expect(costoGenerar("practica")).toBeGreaterThan(0);
  });
});

describe("compañero de estudio", () => {
  const hecha = (dias: number, tema = "Fracciones") => ({ estado: "completada" as const, completadaEn: haceDias(dias), creadaEn: haceDias(dias), calificacion: 80, tema });
  const base = { proximas: [], vencidas: [], ahora };
  it("sonríe si estudió hoy y llora tras dos semanas", () => {
    expect(animoCompanero({ ...base, autoactividades: [hecha(0)] })).toBe("feliz");
    expect(animoCompanero({ ...base, autoactividades: [hecha(3)] })).toBe("serio");
    expect(animoCompanero({ ...base, autoactividades: [hecha(6)] })).toBe("triste");
    expect(animoCompanero({ ...base, autoactividades: [hecha(15)] })).toBe("llorando");
  });
  it("se enoja con entregas vencidas y está serio si nunca ha estudiado", () => {
    expect(animoCompanero({ ...base, autoactividades: [hecha(2)], vencidas: [{ titulo: "Tarea", grupoId: "g" }] })).toBe("enojado");
    expect(animoCompanero({ ...base, autoactividades: [] })).toBe("serio");
    expect(animoCompanero({ ...base, autoactividades: [], vencidas: [{ titulo: "a", grupoId: "g" }, { titulo: "b", grupoId: "g" }] })).toBe("llorando");
  });
  it("sugiere lo que vence primero y temas con bajo desempeño", () => {
    const s = sugerenciasCompanero({
      ...base,
      autoactividades: [hecha(4)],
      proximas: [{ titulo: "Examen", cierre: new Date(ahora.getTime() + 5 * 3600_000).toISOString(), grupoId: "g" }],
      temasBajos: [{ tema: "Vectores", acierto: 45, grupoId: "g" }],
      temas: [{ tema: "Vectores", grupoId: "g" }, { tema: "Energía", grupoId: "g" }],
    });
    expect(s[0]).toMatchObject({ clave: "proxima", valores: { titulo: "Examen", horas: 5 } });
    expect(s.find((x) => x.clave === "temaBajo")).toMatchObject({ tema: "Vectores", tipo: "videos" });
    expect(s.some((x) => x.clave === "temaNuevo" && x.tema === "Energía")).toBe(true);
  });
  it("da la bienvenida a quien nunca ha estudiado por su cuenta", () => {
    const s = sugerenciasCompanero({ ...base, autoactividades: [], temasBajos: [], temas: [] });
    expect(s[0].clave).toBe("bienvenida");
  });
  it("encuentra entregas por vencer y vencidas", () => {
    const acts = [
      { id: "a", titulo: "Pronto", grupoId: "g", envioHasta: new Date(ahora.getTime() + 86_400_000).toISOString() },
      { id: "b", titulo: "Pasada", grupoId: "g", envioHasta: haceDias(2) },
      { id: "c", titulo: "Entregada", grupoId: "g", envioHasta: haceDias(1) },
    ];
    const r = pendientesDelAlumno(acts, [{ actividadId: "c", matricula: "M1", estado: "entregada" }], { g: "M1" }, ahora);
    expect(r.proximas.map((x) => x.titulo)).toEqual(["Pronto"]);
    expect(r.vencidas.map((x) => x.titulo)).toEqual(["Pasada"]);
  });
  it("junta los temas del curso sin repetir", () => {
    const acts = [
      { grupoId: "g", reactivos: [{ tema: "Fracciones" }, { tema: "fracciones" }], temario: { asignaturaId: "x", unidad: "1", temas: ["Decimales"] } },
      { grupoId: "otro", reactivos: [{ tema: "Química" }] },
    ] as unknown as Parameters<typeof temasDelCurso>[0];
    expect(temasDelCurso(acts, "g")).toEqual(["Decimales", "Fracciones"]);
  });
});

describe("nota final con autoestudio", () => {
  it("con 0 % no cambia; con p % mezcla la nota del curso y el autoestudio", () => {
    expect(notaConAutoestudio(80, 100, 0, 100)).toBe(80);
    expect(notaConAutoestudio(80, 100, 10, 100)).toBe(82);
    expect(notaConAutoestudio(8, 50, 20, 10)).toBe(7.4);
    expect(notaConAutoestudio(80, null, 10, 100)).toBe(72);
    expect(notaConAutoestudio(null, null, 10, 100)).toBeNull();
  });
  it("valida el porcentaje", () => {
    expect(pesoAutoestudio("12.34")).toBe(12.3);
    expect(pesoAutoestudio(-5)).toBe(0);
    expect(pesoAutoestudio(150)).toBe(100);
    expect(pesoAutoestudio("x")).toBe(0);
  });
  it("resume las autoasignadas de un alumno", () => {
    const lista = [
      { grupoId: "g", matricula: "M1", estado: "completada", calificacion: 90, segundos: 300, creadaEn: haceDias(2), completadaEn: haceDias(2) },
      { grupoId: "g", matricula: "M1", estado: "completada", calificacion: 70, segundos: 600, creadaEn: haceDias(1), completadaEn: haceDias(1), alerta: true },
      { grupoId: "g", matricula: "M1", estado: "pendiente", creadaEn: haceDias(0) },
      { grupoId: "g", matricula: "M2", estado: "completada", calificacion: 10, creadaEn: haceDias(0) },
    ] as Autoactividad[];
    expect(resumenAutoestudio(lista, "g", "M1")).toMatchObject({ total: 3, completadas: 2, promedio: 80, segundos: 900, alertas: 1 });
  });
  it("promedia por tipo y cuenta las terminadas", () => {
    const lista = [
      { grupoId: "g", matricula: "M1", tipo: "practica", estado: "completada", calificacion: 90 },
      { grupoId: "g", matricula: "M1", tipo: "practica", estado: "completada", calificacion: 75 },
      { grupoId: "g", matricula: "M1", tipo: "tarjetas", estado: "completada", calificacion: 50 },
      { grupoId: "g", matricula: "M1", tipo: "lectura", estado: "pendiente" },
      { grupoId: "g", matricula: "M2", tipo: "practica", estado: "completada", calificacion: 60 },
      { grupoId: "otro", matricula: "M1", tipo: "videos", estado: "completada", calificacion: 100 },
    ] as Autoactividad[];
    const m1 = autoestudioPorTipo(lista, "g", "M1");
    expect(m1.practica).toEqual({ promedio: 82.5, hechas: 2 });
    expect(m1.tarjetas).toEqual({ promedio: 50, hechas: 1 });
    expect(m1.lectura).toEqual({ promedio: null, hechas: 0 });
    expect(m1.videos).toEqual({ promedio: null, hechas: 0 });
    const m2 = autoestudioPorTipo(lista, "g", "M2");
    const grupo = autoestudioGrupo([
      { porTipo: m1, global: { promedio: 71.7, hechas: 3 } },
      { porTipo: m2, global: { promedio: 60, hechas: 1 } },
    ]);
    expect(grupo.porTipo.practica).toEqual({ promedio: 71.3, hechas: 3 });
    expect(grupo.porTipo.manuscrita).toEqual({ promedio: null, hechas: 0 });
    expect(grupo.global).toEqual({ promedio: 65.9, hechas: 4 });
  });
});
