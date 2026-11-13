import { describe, expect, it } from "vitest";
import { analiticasCurso } from "../analiticas";
import { reporteGrupo } from "../estadisticas";
import { pdfReporteAnaliticas } from "../pdf-reporte";
import { nombreArchivoReporte, reporteActividadPdf, reporteGrupoPdf } from "../reporte-analiticas";
import type { Actividad, Entrega, Grupo } from "../tipos";

const reactivo = (numero: number, tema: string) => ({
  numero,
  tipo: "desarrollo" as const,
  enunciado: "",
  respuesta: "",
  puntos: 5,
  tema,
  habilidad: "Cálculo",
  pagina: 1,
});

const actividad = (id: string, fecha: string, etiqueta: string): Actividad => ({
  id,
  grupoId: "g",
  titulo: `Actividad ${id}`,
  descripcion: "",
  fechaAplicacion: fecha,
  paginas: 1,
  estado: "publicada",
  etiqueta,
  reactivos: [reactivo(1, "Vectores"), reactivo(2, "Fuerzas")],
});

const entrega = (actividadId: string, matricula: string, p1: number, p2: number): Entrega => ({
  actividadId,
  matricula,
  estado: "evaluada",
  paginasRecibidas: 1,
  resultados: [
    { numero: 1, puntosObtenidos: p1, respuestaLeida: "", confianza: "alta", comentario: "" },
    { numero: 2, puntosObtenidos: p2, respuestaLeida: "", confianza: "alta", comentario: "" },
  ],
  positivos: [],
  mejoras: [],
});

const grupo: Grupo = {
  id: "g",
  nombre: "3° B",
  materia: "Física",
  ciclo: "2026-2027",
  alumnos: Array.from({ length: 45 }, (_, i) => ({ matricula: `A${i}`, nombre: `Alumno Número ${i} Apellido`, correo: "" })),
};

const q = actividad("quiz", "2026-10-01", "Quiz");
const t = actividad("tarea", "2026-10-10", "Tarea");
const entregas = grupo.alumnos.flatMap((al, i) => [entrega("quiz", al.matricula, i % 6, 5), ...(i % 4 ? [entrega("tarea", al.matricula, 5, i % 5)] : [])]);

describe("reporte PDF de analíticas", () => {
  it("lleva los datos del grupo en el encabezado y los números calculados", () => {
    const a = analiticasCurso(grupo, [q, t], entregas);
    const r = reporteGrupoPdf(grupo, a);
    expect(r.datos.map((d) => d.etiqueta)).toEqual(["Materia", "Grupo", "Ciclo", "Alumnos", "Actividades evaluadas", "Fecha del reporte"]);
    expect(r.datos[0].valor).toBe("Física");
    const cifras = r.bloques[0];
    expect(cifras.tipo === "cifras" && cifras.items[0].valor).toBe(a.general.promedio.toLocaleString("es-MX", { maximumFractionDigits: 1 }));
  });

  it("incluye el nombre de la actividad y una fila por alumno, con los no entregados", () => {
    const entregasTarea = entregas.filter((e) => e.actividadId === "tarea");
    const a = analiticasCurso(grupo, [t], entregasTarea);
    const r = reporteActividadPdf(grupo, t, a, reporteGrupo(t, entregasTarea, grupo.alumnos));
    expect(r.datos.find((d) => d.etiqueta === "Actividad")?.valor).toBe("Actividad tarea");
    const tabla = r.bloques.at(-1)!;
    expect(tabla.tipo === "tabla" && tabla.filas.length).toBe(45);
    expect(tabla.tipo === "tabla" && tabla.filas.at(-1)![4].texto).toBe("0 NE");
  });

  it("genera un PDF de varias páginas carta", async () => {
    const entregasTarea = entregas.filter((e) => e.actividadId === "tarea");
    const a = analiticasCurso(grupo, [t], entregasTarea);
    const blob = await pdfReporteAnaliticas(reporteActividadPdf(grupo, t, a, reporteGrupo(t, entregasTarea, grupo.alumnos)));
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await blob.arrayBuffer());
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    const g = await pdfReporteAnaliticas(reporteGrupoPdf(grupo, analiticasCurso(grupo, [q, t], entregas)));
    expect(g.size).toBeGreaterThan(1000);
  });

  it("arma el nombre del archivo", () => {
    expect(nombreArchivoReporte(["analiticas", "Física", "3° B", "Vectores y fuerzas"])).toBe("analiticas-fisica-3-b-vectores-y-fuerzas");
  });
});
