import { describe, expect, it } from "vitest";
import { cambiarRutas, copiaDeActividad, copiaDeGrupo, copiaDeProyecto, directorioActividades, idUnico, tituloCopia } from "../copiar";
import type { Actividad, BaseDeDatos, Grupo, Proyecto } from "../tipos";

const actividad: Actividad = {
  id: "mru-ab12",
  grupoId: "g1",
  titulo: "Cinemática MRU",
  descripcion: "",
  fechaAplicacion: "2026-11-20",
  envioHasta: "2026-11-30T23:59:00.000Z",
  paginas: 1,
  estado: "publicada",
  rubricaConfirmada: true,
  rubricaEditadaEn: "2026-11-21T10:00:00.000Z",
  entregasSuspendidas: true,
  etiqueta: "Tarea",
  archivos: ["actividades/mru-ab12/escaneo-1.jpg"],
  solucion: ["actividades/mru-ab12/solucion-1.jpg"],
  contenido: { anexos: [{ ruta: "actividades/mru-ab12/anexos/guia.pdf", nombre: "guia.pdf", clase: "pdf", bytes: 10 }], entrega: "digital" },
  hojaAnterior: { reactivos: [] },
  reactivos: [{ numero: 1, enunciado: "¿v?", respuesta: "3 m/s", puntos: 10 } as Actividad["reactivos"][number]],
};

describe("copiaDeActividad", () => {
  it("lleva hoja, rúbrica y archivos a la carpeta nueva, sin rastros de entregas", () => {
    const c = copiaDeActividad(actividad, "mru-zz99", "g2");
    expect(c.id).toBe("mru-zz99");
    expect(c.grupoId).toBe("g2");
    expect(c.titulo).toBe("Cinemática MRU");
    expect(c.estado).toBe("esperando_entregas");
    expect(c.rubricaConfirmada).toBe(true);
    expect(c.reactivos).toEqual(actividad.reactivos);
    expect(c.envioHasta).toBe(actividad.envioHasta);
    expect(c.archivos).toEqual(["actividades/mru-zz99/escaneo-1.jpg"]);
    expect(c.solucion).toEqual(["actividades/mru-zz99/solucion-1.jpg"]);
    expect(c.contenido!.anexos[0].ruta).toBe("actividades/mru-zz99/anexos/guia.pdf");
    expect(c.rubricaEditadaEn).toBeUndefined();
    expect(c.entregasSuspendidas).toBeUndefined();
    expect(c.hojaAnterior).toBeUndefined();
    // La original no cambia.
    expect(actividad.archivos).toEqual(["actividades/mru-ab12/escaneo-1.jpg"]);
    expect(actividad.estado).toBe("publicada");
  });

  it("solo cambia rutas que empiezan con la carpeta de la actividad", () => {
    const v = cambiarRutas({ a: "actividades/x/1.jpg", b: "otras/actividades/x/1.jpg", c: ["actividades/xy/2.jpg"], n: 3 }, "x", "y");
    expect(v).toEqual({ a: "actividades/y/1.jpg", b: "otras/actividades/x/1.jpg", c: ["actividades/xy/2.jpg"], n: 3 });
  });
});

describe("tituloCopia", () => {
  it("numera las copias sin repetir y sin acumular sufijos", () => {
    expect(tituloCopia("Quiz 1", ["Quiz 1"])).toBe("Quiz 1 (copia)");
    expect(tituloCopia("Quiz 1", ["Quiz 1", "Quiz 1 (copia)"])).toBe("Quiz 1 (copia 2)");
    expect(tituloCopia("Quiz 1 (copia)", ["Quiz 1", "Quiz 1 (copia)"])).toBe("Quiz 1 (copia 2)");
  });
});

describe("idUnico", () => {
  it("no repite aunque se pidan muchos en el mismo instante", () => {
    const usados = new Set<string>();
    const ids = Array.from({ length: 200 }, () => idUnico("Cinemática MRU", usados));
    expect(new Set(ids).size).toBe(200);
    expect(ids[0]).toMatch(/^cinematica-mru-[0-9a-f]{6}$/);
  });
});

describe("copiaDeGrupo y copiaDeProyecto", () => {
  const grupo: Grupo = {
    id: "g1",
    profesorId: "p1",
    codigo: "FIS-AAAA",
    nombre: "3° B",
    materia: "Física",
    ciclo: "2026-2027",
    color: "azul",
    archivado: "2026-11-01T00:00:00.000Z",
    inicio: "2026-08-10",
    fin: "2026-12-12",
    pesoAutoestudio: 10,
    planEvaluacion: { pesos: [{ etiqueta: "Tarea", porcentaje: 100 }], actualizadoEn: "2026-11-01" },
    alumnos: [{ matricula: "A001", nombre: "Ana", correo: "ana@correo.com" }],
  };

  it("deja el curso vacío, con código nuevo y sin archivar", () => {
    const c = copiaDeGrupo(grupo, "g9", "FIS-BBBB", "3° B (copia)");
    expect(c).toMatchObject({ id: "g9", codigo: "FIS-BBBB", nombre: "3° B (copia)", materia: "Física", color: "azul", inicio: "2026-08-10", pesoAutoestudio: 10 });
    expect(c.alumnos).toEqual([]);
    expect(c.archivado).toBeUndefined();
    expect(c.planEvaluacion).toEqual(grupo.planEvaluacion);
    expect(grupo.alumnos).toHaveLength(1);
  });

  it("copia el modelo del proyecto sin equipos, evaluadores ni etapas cerradas", () => {
    const p: Proyecto = {
      id: "pr1",
      grupoId: "g1",
      profesorId: "p1",
      titulo: "Puente",
      descripcion: "",
      creadoEn: "2026-10-01T00:00:00.000Z",
      evaluadores: ["p2"],
      equipos: [{ id: "e1", nombre: "Equipo 1", matriculas: ["A001"] }],
      etapas: [{ id: "et1", nombre: "Reporte", tipo: "reporte", instrucciones: "", peso: 100, porEquipo: true, conEvidencia: true, criterios: [], cerradaEn: "2026-10-10" }],
    };
    const c = copiaDeProyecto(p, "pr9", "g9", new Date("2026-11-27T00:00:00Z"));
    expect(c).toMatchObject({ id: "pr9", grupoId: "g9", equipos: [], evaluadores: [], creadoEn: "2026-11-27T00:00:00.000Z" });
    expect(c.etapas[0].cerradaEn).toBeUndefined();
    expect(p.etapas[0].cerradaEn).toBe("2026-10-10");
  });
});

describe("directorioActividades", () => {
  it("lista los cursos del profesor con sus actividades, archivados al final", () => {
    const db = {
      grupos: [
        { id: "g1", profesorId: "p1", nombre: "A", materia: "Física", ciclo: "c", alumnos: [], archivado: "x" },
        { id: "g2", profesorId: "p1", nombre: "B", materia: "Física", ciclo: "c", alumnos: [] },
        { id: "g3", profesorId: "p2", nombre: "C", materia: "Química", ciclo: "c", alumnos: [] },
      ],
      actividades: [actividad],
    } as unknown as BaseDeDatos;
    const d = directorioActividades(db, "p1");
    expect(d.map((c) => c.id)).toEqual(["g2", "g1"]);
    expect(d[1].actividades).toEqual([{ id: "mru-ab12", titulo: "Cinemática MRU", etiqueta: "Tarea", fecha: "2026-11-20", reactivos: 1 }]);
  });
});
