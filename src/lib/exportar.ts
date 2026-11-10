// Exportación de calificaciones para registrar en un LMS como Canvas.
import type { FilaAlumno } from "./estadisticas";

function csvCelda(valor: string | number) {
  const s = String(valor);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV con el formato de importación del libro de calificaciones de Canvas.
 * Canvas asocia cada fila por "ID" (id interno de Canvas) o por "SIS User ID";
 * aquí se usa la matrícula como SIS User ID y "ID" queda vacío.
 */
export function csvCanvas(filas: FilaAlumno[], tituloActividad: string, seccion: string) {
  const encabezado = ["Student", "ID", "SIS User ID", "SIS Login ID", "Section", tituloActividad];
  const lineas = filas.map((f) =>
    [f.alumno.nombre, "", f.alumno.matricula, f.alumno.correo, seccion, f.calificacion.toFixed(1)]
      .map(csvCelda)
      .join(","),
  );
  return [encabezado.map(csvCelda).join(","), ...lineas].join("\n") + "\n";
}

/** Filas ordenadas alfabéticamente para la hoja de Excel (nombre, matrícula, calificación). */
export function filasExcel(filas: FilaAlumno[]) {
  return [...filas]
    .sort((a, b) => a.alumno.nombre.localeCompare(b.alumno.nombre, "es"))
    .map((f) => ({
      nombre: f.alumno.nombre,
      matricula: f.alumno.matricula,
      calificacion: f.calificacion,
    }));
}

export async function excelCalificaciones(
  filas: FilaAlumno[],
  info: { actividad: string; grupo: string; materia: string; fecha: string },
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = "Ieureka-Grader";
  const hoja = libro.addWorksheet("Calificaciones");
  hoja.addRow([`${info.materia} · ${info.grupo}`]);
  hoja.addRow([`Actividad: ${info.actividad}`, "", `Fecha: ${info.fecha}`]);
  hoja.addRow([]);
  const encabezado = hoja.addRow(["Nombre", "Matrícula", "Calificación"]);
  encabezado.font = { bold: true };
  for (const f of filasExcel(filas)) {
    hoja.addRow([f.nombre, f.matricula, f.calificacion]);
  }
  hoja.getColumn(1).width = 34;
  hoja.getColumn(2).width = 14;
  hoja.getColumn(3).width = 14;
  hoja.getColumn(3).numFmt = "0.0";
  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function descargar(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
