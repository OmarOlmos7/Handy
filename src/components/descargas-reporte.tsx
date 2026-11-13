"use client";

import { useState } from "react";
import type { FilaAlumno } from "@/lib/estadisticas";
import { csvCanvas, descargar, excelCalificaciones } from "@/lib/exportar";
import { Boton } from "./ui";

export function DescargasReporte({
  filas,
  actividad,
  actividadId,
  grupo,
  materia,
  fecha,
}: {
  filas: FilaAlumno[];
  actividad: string;
  actividadId: string;
  grupo: string;
  materia: string;
  fecha: string;
}) {
  const [generando, setGenerando] = useState(false);

  async function bajarExcel() {
    setGenerando(true);
    try {
      const blob = await excelCalificaciones(filas, { actividad, grupo, materia, fecha });
      descargar(blob, `calificaciones-${actividadId}.xlsx`);
    } finally {
      setGenerando(false);
    }
  }

  function bajarCsv() {
    const csv = csvCanvas(filas, actividad, `${materia} ${grupo}`);
    // BOM para que Excel abra bien los acentos.
    descargar(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `canvas-${actividadId}.csv`);
  }

  return (
    <>
      <Boton variante="secundario" onClick={bajarExcel} disabled={generando}>
        {generando ? "Generando…" : "Descargar Excel"}
      </Boton>
      <Boton variante="secundario" onClick={bajarCsv}>
        CSV para Canvas
      </Boton>
    </>
  );
}
