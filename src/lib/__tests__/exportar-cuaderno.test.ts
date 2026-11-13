import { describe, expect, it } from "vitest";
import { cuadernoCurso } from "../cuaderno";
import { excelCuaderno, nombreArchivoCuaderno, pdfCuaderno, tablaExportable } from "../exportar-cuaderno";
import type { Actividad, Entrega, Grupo } from "../tipos";

const act = (id: string, fecha: string, etiqueta: string, escala: 10 | 100): Actividad => ({
  id,
  grupoId: "g",
  titulo: `Actividad ${id} con un título largo de prueba`,
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
    { matricula: "A1", nombre: "Sofía Hernández Ruiz", correo: "" },
    { matricula: "A2", nombre: "Diego Álvarez López", correo: "" },
    { matricula: "A3", nombre: "Ana Zúñiga Pérez", correo: "" },
  ],
};

const c = cuadernoCurso(
  grupo,
  [act("quiz", "2026-10-01", "Quiz", 100), act("tarea", "2026-10-05", "Tarea", 10)],
  [ent("quiz", "A1", 9), ent("quiz", "A2", 5, { calificacionManual: 70 }), ent("tarea", "A1", 8), ent("tarea", "A2", null), ent("tarea", "A3", 10)],
);
const info = { materia: grupo.materia, grupo: grupo.nombre, ciclo: grupo.ciclo };

describe("tablaExportable", () => {
  const t = tablaExportable(c, "mayor");

  it("respeta el orden elegido y los tipos de actividad", () => {
    expect(t.filas.map((f) => f.matricula)).toEqual(["A1", "A2", "A3"]);
    expect(t.orden).toBe("Desempeño (mayor a menor)");
    expect(t.grupos).toEqual([
      { etiqueta: "Quiz", columnas: 1 },
      { etiqueta: "Tarea", columnas: 1 },
    ]);
  });

  it("escribe cada celda como en la pantalla", () => {
    const [sofia, diego, ana] = t.filas;
    expect(sofia.celdas[0]).toMatchObject({ texto: "90", valor: 90, nivel: "alto" });
    expect(diego.celdas[0]).toMatchObject({ texto: "70", nivel: "medio", nota: "Cambiada a mano (con la rúbrica: 50)" });
    expect(diego.celdas[1]).toMatchObject({ texto: "Por evaluar", valor: null, nivel: null });
    expect(ana.celdas[0]).toMatchObject({ texto: "0 NE", valor: 0, nivel: "bajo" });
    expect(t.pie).toHaveLength(3);
  });

  it("arma un nombre de archivo limpio", () => {
    expect(nombreArchivoCuaderno(info)).toBe("cuaderno-fisica-3-b");
  });
});

describe("archivos del cuaderno", () => {
  const t = tablaExportable(c, "apellido");

  it("genera un PDF válido", async () => {
    const blob = await pdfCuaderno(t, info);
    const inicio = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(inicio).toBe("%PDF-");
  });

  it("genera un Excel con la tabla", async () => {
    const blob = await excelCuaderno(t, info);
    const ExcelJS = (await import("exceljs")).default;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await blob.arrayBuffer());
    const hoja = libro.getWorksheet("Cuaderno")!;
    expect(hoja.getRow(5).getCell(3).value).toBe("Quiz");
    expect(hoja.getRow(7).getCell(1).value).toBe("Diego Álvarez López");
  });
});
