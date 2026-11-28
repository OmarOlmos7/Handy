import { describe, expect, it } from "vitest";
import {
  MINIMO_COMPARACION,
  analiticasAlumnoActividad,
  analiticasAlumnoCurso,
  avanceActividad,
  categoriasAlumno,
  cuadernoAlumno,
  resumenCursoAlumno,
  seccionesAlumno,
  unidadesAlumno,
} from "../portal-alumno";
import type { Actividad, Entrega, Grupo } from "../tipos";

const ahora = new Date("2026-11-20T12:00:00Z");

function actividad(id: string, extra: Partial<Actividad> = {}): Actividad {
  return {
    id,
    grupoId: "g",
    titulo: id,
    fechaAplicacion: "2026-11-10",
    escala: 100,
    reactivos: [
      { numero: 1, tipo: "desarrollo", enunciado: "", respuesta: "", puntos: 5, tema: "Vectores", habilidad: "Calcular", pagina: 1 },
      { numero: 2, tipo: "desarrollo", enunciado: "", respuesta: "", puntos: 5, tema: "Fuerzas", habilidad: "Explicar", pagina: 1 },
    ],
    ...extra,
  } as Actividad;
}

function entrega(actividadId: string, matricula: string, p1: number, p2: number, extra: Partial<Entrega> = {}): Entrega {
  return {
    actividadId,
    matricula,
    estado: "aprobada",
    paginasRecibidas: 1,
    resultados: [
      { numero: 1, puntosObtenidos: p1, respuestaLeida: "", confianza: "alta", comentario: "" },
      { numero: 2, puntosObtenidos: p2, respuestaLeida: "", confianza: "alta", comentario: "" },
    ],
    positivos: [],
    mejoras: [],
    ...extra,
  } as Entrega;
}

const alumnos = (n: number) => Array.from({ length: n }, (_, i) => ({ matricula: `A${i}`, nombre: `Alumno ${i}`, correo: "" }));
const grupo = (n: number): Grupo => ({ id: "g", materia: "Física", nombre: "3B", ciclo: "", alumnos: alumnos(n) });

describe("secciones del alumno", () => {
  it("separa por entregar, entregadas y sin programar, ordenadas por fecha", () => {
    const acts = [
      actividad("cierra-tarde", { envioHasta: "2026-11-30T12:00:00Z" }),
      actividad("cerrada", { envioHasta: "2026-11-15T12:00:00Z" }),
      actividad("cierra-pronto", { envioHasta: "2026-11-22T12:00:00Z" }),
      actividad("libre-vieja", { fechaAplicacion: "2026-11-01" }),
      actividad("libre-nueva", { fechaAplicacion: "2026-11-18" }),
      actividad("enviada-1", { envioHasta: "2026-11-25T12:00:00Z" }),
      actividad("enviada-2"),
    ];
    const ent: Record<string, Entrega> = {
      "enviada-1": entrega("enviada-1", "A0", 1, 1, { estado: "entregada", entregadaEn: "2026-11-12T00:00:00Z" }),
      "enviada-2": entrega("enviada-2", "A0", 1, 1, { entregadaEn: "2026-11-19T00:00:00Z" }),
    };
    const s = seccionesAlumno(acts.map((a) => ({ actividad: a, entrega: ent[a.id] })), ahora);
    expect(s.por_entregar.map((x) => x.actividad.id)).toEqual(["cierra-pronto", "cierra-tarde", "cerrada"]);
    expect(s.entregadas.map((x) => x.actividad.id)).toEqual(["enviada-2", "enviada-1"]);
    expect(s.sin_programar.map((x) => x.actividad.id)).toEqual(["libre-nueva", "libre-vieja"]);
  });
});

describe("categorías del alumno", () => {
  it("clasifica el avance de cada actividad", () => {
    expect(avanceActividad(undefined)).toBe("sin_iniciar");
    expect(avanceActividad(entrega("a", "A0", 0, 0, { estado: "sin_entregar", paginasRecibidas: 0 }))).toBe("sin_iniciar");
    expect(avanceActividad(entrega("a", "A0", 0, 0, { estado: "sin_entregar", paginasRecibidas: 1 }))).toBe("en_proceso");
    expect(avanceActividad(entrega("a", "A0", 0, 0, { estado: "entregada" }))).toBe("en_proceso");
    expect(avanceActividad(entrega("a", "A0", 0, 0, { estado: "evaluada" }))).toBe("en_proceso");
    expect(avanceActividad(entrega("a", "A0", 0, 0))).toBe("terminada");
  });

  it("agrupa por tipo con su resumen y deja al final las que no tienen tipo", () => {
    const acts = [
      actividad("libre", { etiqueta: undefined }),
      actividad("q-enviada", { etiqueta: "Quiz" }),
      actividad("q-pendiente", { etiqueta: "quiz ", envioHasta: "2026-11-22T12:00:00Z" }),
      actividad("t-evaluando", { etiqueta: "Tarea" }),
    ];
    const ent: Record<string, Entrega> = {
      "q-enviada": entrega("q-enviada", "A0", 1, 1, { entregadaEn: "2026-11-12T00:00:00Z" }),
      "t-evaluando": entrega("t-evaluando", "A0", 1, 1, { estado: "entregada", entregadaEn: "2026-11-12T00:00:00Z" }),
    };
    const c = categoriasAlumno(acts.map((a) => ({ actividad: a, entrega: ent[a.id] })), ahora);
    expect(c.map((x) => x.etiqueta)).toEqual(["quiz", "Tarea", ""]);
    expect(c[0].items.map((x) => x.actividad.id)).toEqual(["q-pendiente", "q-enviada"]);
    expect(c[0].resumen).toEqual({ total: 2, terminadas: 1, enProceso: 0, sinIniciar: 1 });
    expect(c[1].resumen).toEqual({ total: 1, terminadas: 0, enProceso: 1, sinIniciar: 0 });
    expect(c[2].resumen.sinIniciar).toBe(1);
  });
});

describe("analíticas del alumno en el curso", () => {
  it("usa solo sus actividades liberadas y oculta el grupo si hay pocos calificados", () => {
    const acts = [
      actividad("a1", { fechaAplicacion: "2026-11-01", etiqueta: "Tarea" }),
      actividad("a2", { fechaAplicacion: "2026-11-05", escala: 10, etiqueta: "Examen" }),
      actividad("oculta", { resultadosDesde: "2026-12-01T00:00:00Z" }),
    ];
    const ents = [entrega("a1", "A0", 5, 0), entrega("a2", "A0", 5, 5), entrega("oculta", "A0", 5, 5), entrega("a1", "A1", 5, 5)];
    const a = analiticasAlumnoCurso(grupo(2), acts, ents, "A0", ahora);
    expect(a.evaluadas.map((x) => [x.id, x.sobre100])).toEqual([
      ["a1", 50],
      ["a2", 100],
    ]);
    expect(a.promedio).toBe(75);
    expect(a.aprobadas).toBe(1);
    expect(a.promedioGrupo).toBeNull();
    expect(a.evaluadas[0].grupo100).toBeNull();
    expect(a.temas).toEqual([
      { nombre: "Fuerzas", acierto: 50, puntos: 10 },
      { nombre: "Vectores", acierto: 100, puntos: 10 },
    ].sort((x, y) => y.acierto - x.acierto));
    expect(a.porTipo.map((t) => [t.nombre, t.valor])).toEqual([
      ["Examen", 100],
      ["Tarea", 50],
    ]);
  });

  it("muestra el promedio del grupo cuando hay suficientes calificados", () => {
    const g = grupo(MINIMO_COMPARACION);
    const ents = g.alumnos.map((al, i) => entrega("a1", al.matricula, i % 2 ? 5 : 0, 5));
    const a = analiticasAlumnoCurso(g, [actividad("a1")], ents, "A0", ahora);
    expect(a.evaluadas[0].grupo100).toBe(70);
    expect(a.promedioGrupo).toBe(70);
  });

  it("cuenta la tasa de entrega con lo entregado y lo ya cerrado", () => {
    const acts = [actividad("e"), actividad("cerrada", { envioHasta: "2026-11-15T00:00:00Z" }), actividad("abierta", { envioHasta: "2026-12-15T00:00:00Z" })];
    const a = analiticasAlumnoCurso(grupo(1), acts, [entrega("e", "A0", 5, 5)], "A0", ahora);
    expect([a.entregadas, a.esperadas, a.tasaEntrega]).toEqual([1, 2, 50]);
    expect(resumenCursoAlumno(grupo(1), acts, [entrega("e", "A0", 5, 5)], "A0", ahora)).toEqual({ actividades: 3, porEntregar: 1, promedio: 100, evaluadas: 1 });
  });
});

describe("cuaderno del alumno", () => {
  it("muestra su fila sin revelar entregas no liberadas", () => {
    const acts = [actividad("a1"), actividad("a2"), actividad("futura", { resultadosDesde: "2026-12-01T00:00:00Z" })];
    const ents = [entrega("a1", "A0", 5, 5), entrega("a2", "A0", 5, 5, { estado: "evaluada" }), entrega("a2", "A1", 5, 5), entrega("futura", "A0", 5, 5)];
    const c = cuadernoAlumno(grupo(2), acts, ents, "A0", ahora);
    const columnas = c.grupos.flatMap((g) => g.columnas);
    expect(columnas.map((x) => x.id)).toEqual(["a1", "a2"]);
    expect(columnas.map((x) => x.celda.estado)).toEqual(["calificada", "pendiente"]);
    expect(columnas.every((x) => x.promedioGrupo === null)).toBe(true);
    expect(c.promedio).toBe(100);
    expect(c.promedioGrupo).toBeNull();
  });
});

describe("analíticas del alumno en una actividad", () => {
  it("da su acierto por reactivo y compara con el grupo solo con suficientes datos", () => {
    const pocos = analiticasAlumnoActividad(actividad("a1"), [entrega("a1", "A0", 5, 1)], "A0")!;
    expect(pocos.sobre100).toBe(60);
    expect(pocos.grupo).toBeNull();
    expect(pocos.reactivos.map((r) => [r.numero, r.acierto, r.grupo])).toEqual([
      [1, 100, null],
      [2, 20, null],
    ]);
    const ents = alumnos(MINIMO_COMPARACION).map((al) => entrega("a1", al.matricula, al.matricula === "A0" ? 5 : 0, 5));
    const muchos = analiticasAlumnoActividad(actividad("a1"), ents, "A0")!;
    expect(muchos.grupo).toMatchObject({ promedio: 60, calificados: MINIMO_COMPARACION });
    expect(muchos.reactivos[0].grupo).toBe(20);
    expect(analiticasAlumnoActividad(actividad("a1"), [entrega("a1", "A0", 1, 1, { estado: "evaluada" })], "A0")).toBeUndefined();
  });
});

describe("actividades del alumno por unidad", () => {
  it("agrupa por unidad en orden del temario, con avance propio y las sin unidad al final", () => {
    const asignatura = { id: "as", unidades: [{ nombre: "Vectores" }, { nombre: "Fuerzas" }, { nombre: "Energía" }] };
    const tem = (unidad: string) => ({ temario: { asignaturaId: "as", unidad, temas: [] } }) as Partial<Actividad>;
    const acts = [
      actividad("v1", { ...tem("Vectores"), etiqueta: "Tarea" }),
      actividad("v2", { ...tem("Vectores"), etiqueta: "Quiz" }),
      actividad("f1", { ...tem("Fuerzas"), envioDesde: "2026-11-01T00:00:00Z", envioHasta: "2026-11-30T00:00:00Z" }),
      actividad("suelta"),
    ];
    const ent: Record<string, Entrega> = { v1: entrega("v1", "A0", 5, 5) };
    const u = unidadesAlumno(asignatura, acts.map((a) => ({ actividad: a, entrega: ent[a.id] })), ahora);
    expect(u.map((x) => x.indice)).toEqual([0, 1, 2, null]);
    expect(u[0].avance).toBe(50);
    expect(u[0].categorias.map((c) => c.etiqueta)).toEqual(["Quiz", "Tarea"]); // primero la que falta entregar
    expect(u[1].porEntregar).toBe(true);
    expect(u[2].avance).toBeNull();
    expect(u[2].resumen.total).toBe(0);
    expect(u[3].categorias[0].items[0].actividad.id).toBe("suelta");
  });
});
