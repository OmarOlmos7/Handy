import { describe, expect, it } from "vitest";
import { plantilla } from "../perfil/crear";
import { PROMPT_RUTA_MEJORA, VERSION_RUTA_MEJORA } from "../perfil/prompts/ruta_mejora_v1";
import {
  comparaAutodiagnostico,
  datosRutaMejora,
  etapasARecomendar,
  fortalezasYAreas,
  franjaDe,
  guardarReflexion,
  horarioTrabajo,
  porUnidad,
  porUnidadGrupo,
  reflexionesDelCurso,
  reporteAlumno,
  reporteGrupo,
} from "../perfil/tablero";
import type { Actividad, IntentoActividad } from "../tipos";

const intento = (x: Partial<IntentoActividad> & Pick<IntentoActividad, "actividadId" | "numero" | "calificacion">): IntentoActividad => ({
  alumnoId: "al1",
  grupoId: "g1",
  origen: x.numero > 1 ? "caso" : "actividad",
  clave: `${x.actividadId}-${x.numero}`,
  porEtapa: {},
  nivel: "uniestructural",
  fecha: `2026-09-1${x.numero}T18:00:00Z`,
  dia: 2,
  hora: 12,
  ...x,
});

const actividades: Pick<Actividad, "id" | "temario">[] = [
  { id: "a1", temario: { asignaturaId: "s1", unidad: "Cinemática", temas: [] } },
  { id: "a2", temario: { asignaturaId: "s1", unidad: "Dinámica", temas: [] } },
];

const intentos: IntentoActividad[] = [
  intento({ actividadId: "a1", numero: 1, calificacion: 50, porEtapa: { comprender: 90, aplicar: 40 }, segundos: 600 }),
  intento({ actividadId: "a1", numero: 2, calificacion: 80, porEtapa: { comprender: 95, aplicar: 60 }, dia: 4, hora: 20, segundos: 300 }),
  intento({ actividadId: "a2", numero: 1, calificacion: 90, porEtapa: { comprender: 88, representar: 75, resultado: 92 }, dia: 4, hora: 21 }),
  intento({ alumnoId: "al2", actividadId: "a1", numero: 1, calificacion: 40, porEtapa: { comprender: 50, aplicar: 30 } }),
];

describe("tablero del perfil CREAR", () => {
  it("separa fortalezas (≥ 85) y áreas (< 70) en orden", () => {
    const r = fortalezasYAreas({ comprender: 90, representar: 72, estrategia: 40, aplicar: 65, resultado: 99 });
    expect(r.fortalezas.map((x) => x.etapa)).toEqual(["resultado", "comprender"]);
    expect(r.areas.map((x) => x.etapa)).toEqual(["estrategia", "aplicar"]);
  });

  it("recomienda las áreas o, sin áreas, las etapas que aún no son fortaleza", () => {
    expect(etapasARecomendar({ porEtapa: { aplicar: 40 }, areas: [{ etapa: "aplicar", logro: 40 }] })).toEqual(["aplicar"]);
    expect(etapasARecomendar({ porEtapa: { comprender: 90, representar: 80, aplicar: 75 }, areas: [] })).toEqual(["aplicar", "representar"]);
    expect(etapasARecomendar({ porEtapa: { comprender: 95 }, areas: [] })).toEqual([]);
  });

  it("cuenta el horario por día y franja", () => {
    expect([franjaDe(3), franjaDe(9), franjaDe(15), franjaDe(22)]).toEqual(["madrugada", "manana", "tarde", "noche"]);
    const h = horarioTrabajo(intentos.filter((x) => x.alumnoId === "al1"));
    expect(h.celdas[4][3]).toBe(2);
    expect(h.celdas[2][2]).toBe(1);
    expect(h.maximo).toBe(2);
    expect(h.masFrecuente).toEqual({ dia: 4, franja: "noche" });
    expect(horarioTrabajo([]).masFrecuente).toBeUndefined();
  });

  it("arma el reporte del alumno con el último intento de cada actividad", () => {
    const r = reporteAlumno(intentos, "al1", "g1");
    expect(r.intentos).toBe(3);
    expect(r.casos).toBe(1);
    expect(r.actividades).toBe(2);
    expect(r.calificacion).toBe(85);
    expect(r.mejoraCasos).toBe(30);
    expect(r.segundos).toBe(900);
    expect(r.evolucion.map((p) => p.calificacion)).toEqual([50, 90, 80]);
    expect(r.areas.map((x) => x.etapa)).toContain("aplicar");
    expect(reporteAlumno(intentos, "al1", "otro").intentos).toBe(0);
  });

  it("calcula el avance por unidad y lo compara con el autodiagnóstico", () => {
    const u = porUnidad(
      intentos.filter((x) => x.alumnoId === "al1"),
      actividades,
      ["Cinemática", "Dinámica", "Energía"],
      { niveles: { Cinemática: "sin_idea", Dinámica: "avanzado" } },
    );
    expect(u.map((x) => x.calificacion)).toEqual([80, 90, null]);
    expect(u[0].autodiagnostico).toBe("sin_idea");
    expect(comparaAutodiagnostico(u[0])).toBe("arriba");
    expect(comparaAutodiagnostico(u[1])).toBe("igual");
    expect(comparaAutodiagnostico(u[2])).toBeNull();
    expect(comparaAutodiagnostico({ autodiagnostico: "avanzado", calificacion: 50 })).toBe("abajo");
  });

  it("resume el grupo y su avance por unidad", () => {
    const g = reporteGrupo(intentos, ["al1", "al2", "al3"], "g1");
    expect(g.alumnos).toBe(2);
    expect(g.calificacion).toBe(63);
    expect(g.areas.aplicar).toBe(2);
    expect(Object.values(g.niveles).reduce((s, n) => s + n!, 0)).toBe(2);
    const u = porUnidadGrupo(intentos, ["al1", "al2"], "g1", actividades, ["Cinemática", "Dinámica"]);
    expect(u[0]).toMatchObject({ calificacion: 60, alumnos: 2 });
    expect(u[1]).toMatchObject({ calificacion: 90, alumnos: 1 });
  });

  it("guarda, reemplaza y borra reflexiones por unidad y de cierre", () => {
    const ahora = new Date("2026-11-28T18:00:00Z");
    let lista = guardarReflexion(undefined, { grupoId: "g1", alcance: "unidad", unidad: "Cinemática", texto: "  Costó representar.\r\n " }, ahora);
    lista = guardarReflexion(lista, { grupoId: "g1", alcance: "cierre", texto: "Buen cierre", unidad: "ignorada" }, ahora);
    lista = guardarReflexion(lista, { grupoId: "g1", alcance: "unidad", unidad: "Cinemática", texto: "Mejor con diagramas" }, ahora);
    lista = guardarReflexion(lista, { grupoId: "g2", alcance: "cierre", texto: "Otro curso" }, ahora);
    const m = reflexionesDelCurso(lista, "g1");
    expect(m.size).toBe(2);
    expect(m.get("unidad:Cinemática")?.texto).toBe("Mejor con diagramas");
    expect(m.get("cierre")?.unidad).toBeUndefined();
    lista = guardarReflexion(lista, { grupoId: "g1", alcance: "cierre", texto: "   " }, ahora);
    expect(reflexionesDelCurso(lista, "g1").has("cierre")).toBe(false);
    expect(guardarReflexion([], { grupoId: "g1", alcance: "cierre", texto: "x".repeat(5000) })[0].texto).toHaveLength(3000);
  });

  it("a la IA solo van números y el modelo del curso, sin datos personales", () => {
    const r = reporteAlumno(intentos, "al1", "g1");
    const datos = datosRutaMejora(r, "Física", { etapas: plantilla("fisica") }, { efectoInicio: 120, efectoFin: 80 });
    const json = JSON.stringify(datos);
    expect(json).not.toContain("al1");
    expect(json).not.toContain("g1");
    expect(json).not.toMatch(/nombre|matr[ií]cula|correo/i);
    expect(datos.logroPorEtapa).toEqual(r.porEtapa);
    expect(VERSION_RUTA_MEJORA).toBe("ruta_mejora_v1");
    expect(PROMPT_RUTA_MEJORA).toMatch(/No diagnostiques/);
  });
});
