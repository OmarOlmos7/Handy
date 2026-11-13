import { describe, expect, it } from "vitest";
import { actividades, entregas, grupos } from "../datos-ejemplo";

const entregasDeActividad = (id: string) => entregas.filter((e) => e.actividadId === id);
import { calificacion, formatoCal, nivelDe, puntosTotales, reporteGrupo } from "../estadisticas";
import { csvCanvas, filasExcel } from "../exportar";
import type { Actividad, Entrega } from "../tipos";

const actividad = actividades[0];
const grupo = grupos[0];

describe("calificación", () => {
  it("convierte puntos a escala de 10 con un decimal", () => {
    const act: Actividad = { ...actividad, reactivos: actividad.reactivos.slice(0, 2) }; // 2 puntos
    const e: Entrega = {
      actividadId: act.id, matricula: "X", estado: "evaluada", paginasRecibidas: 1, positivos: [], mejoras: [],
      resultados: [
        { numero: 1, puntosObtenidos: 1, respuestaLeida: "V", confianza: "alta", comentario: "" },
        { numero: 2, puntosObtenidos: 0, respuestaLeida: "a", confianza: "alta", comentario: "" },
      ],
    };
    expect(puntosTotales(act)).toBe(2);
    expect(calificacion(act, e)).toBe(5);
  });

  it("califica sobre 100 en enteros cuando la actividad usa esa escala", () => {
    const act: Actividad = { ...actividad, escala: 100, reactivos: actividad.reactivos.slice(0, 3) };
    const total = puntosTotales(act);
    const e: Entrega = {
      actividadId: act.id, matricula: "X", estado: "evaluada", paginasRecibidas: 1, positivos: [], mejoras: [],
      resultados: act.reactivos.map((r, i) => ({ numero: r.numero, puntosObtenidos: i === 0 ? 0 : r.puntos, respuestaLeida: "", confianza: "alta" as const, comentario: "" })),
    };
    const esperado = Math.round(((total - act.reactivos[0].puntos) / total) * 100);
    expect(calificacion(act, e)).toBe(esperado);
    expect(formatoCal(85, 100)).toBe("85");
    expect(formatoCal(8.5, 10)).toBe("8.5");
    expect(nivelDe(85, 100)).toBe("alto");
    expect(nivelDe(69, 100)).toBe("bajo");
    const rep = reporteGrupo(act, [e], [{ ...grupo.alumnos[0], matricula: "X" }]);
    expect(rep.escala).toBe(100);
    expect(rep.distribucion.map((d) => d.rango)).toEqual(["0 a 59", "60 a 69", "70 a 79", "80 a 89", "90 a 100"]);
  });

  it("clasifica niveles con los umbrales", () => {
    expect(nivelDe(9)).toBe("alto");
    expect(nivelDe(8.5)).toBe("alto");
    expect(nivelDe(7)).toBe("medio");
    expect(nivelDe(6.9)).toBe("bajo");
  });
});

describe("reporte del grupo", () => {
  const rep = reporteGrupo(actividad, entregasDeActividad(actividad.id), grupo.alumnos);

  it("separa entregadas y pendientes", () => {
    expect(rep.entregadas + rep.pendientes).toBe(grupo.alumnos.length);
    expect(rep.pendientes).toBe(1);
  });

  it("la distribución suma el total de entregas", () => {
    expect(rep.distribucion.reduce((s, d) => s + d.cantidad, 0)).toBe(rep.entregadas);
  });

  it("los niveles suman el total de entregas", () => {
    const n = rep.niveles;
    expect(n.alto.length + n.medio.length + n.bajo.length).toBe(rep.entregadas);
  });

  it("calcula acierto por reactivo entre 0 y 100", () => {
    expect(rep.porReactivo).toHaveLength(actividad.reactivos.length);
    for (const r of rep.porReactivo) {
      expect(r.acierto).toBeGreaterThanOrEqual(0);
      expect(r.acierto).toBeLessThanOrEqual(100);
    }
  });
});

describe("exportación", () => {
  const rep = reporteGrupo(actividad, entregasDeActividad(actividad.id), grupo.alumnos);

  it("genera CSV de Canvas con encabezado y una fila por alumno evaluado", () => {
    const csv = csvCanvas(rep.filas, "Cinemática, MRU", "3° B");
    const lineas = csv.trim().split("\n");
    expect(lineas[0]).toBe('Student,ID,SIS User ID,SIS Login ID,Section,"Cinemática, MRU"');
    expect(lineas).toHaveLength(rep.entregadas + 1);
    expect(lineas[1]).toMatch(/,A02\d\d,/);
  });

  it("ordena el Excel alfabéticamente", () => {
    const nombres = filasExcel(rep.filas).map((f) => f.nombre);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, "es")));
  });
});
