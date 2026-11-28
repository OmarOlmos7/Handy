import { describe, expect, it } from "vitest";
import {
  indiceNivel,
  limpiarCompetencias,
  limpiarCriterio,
  limpiarEntregables,
  limpiarEvaluacion,
  limpiarNiveles,
  nivelesDe,
  pasosAltaProyecto,
  puntajeDePuntos,
  puntosElemento,
  rangosParejos,
  resultadoEtapa,
  revisarNiveles,
  revisarRubricaEtapa,
} from "../proyectos";
import type { EtapaProyecto, Proyecto } from "../tipos";

const etapa = (extra: Partial<EtapaProyecto> = {}): EtapaProyecto => ({
  id: "e1",
  nombre: "Diagnóstico",
  tipo: "reporte",
  instrucciones: "",
  fecha: "2026-12-01",
  peso: 100,
  porEquipo: false,
  conEvidencia: true,
  criterios: [
    { id: "c1", nombre: "Problema", descripcion: "", porcentaje: 25, niveles: ["", "", "", ""] },
    { id: "c2", nombre: "Fuentes", descripcion: "", porcentaje: 75, niveles: ["", "", "", ""] },
  ],
  ...extra,
});

describe("niveles de desempeño con rango", () => {
  it("sin niveles propios usa los cuatro base con los nombres dados", () => {
    const n = nivelesDe({}, ["Excelente", "Bueno", "Suficiente", "Insuficiente"]);
    expect(n.map((x) => `${x.nombre} ${x.min}-${x.max}`)).toEqual(["Excelente 90-100", "Bueno 80-89", "Suficiente 70-79", "Insuficiente 0-69"]);
    expect(revisarNiveles(n)).toBeUndefined();
  });

  it("ubica un puntaje en su nivel, también entre rangos", () => {
    const n = nivelesDe({});
    expect(indiceNivel(n, 100)).toBe(0);
    expect(indiceNivel(n, 89.5)).toBe(1);
    expect(indiceNivel(n, 70)).toBe(2);
    expect(indiceNivel(n, 12)).toBe(3);
  });

  it("reparte rangos parejos para 2 a 6 niveles sin encimarse", () => {
    for (let k = 2; k <= 6; k++) {
      const n = rangosParejos(k).map((r, i) => ({ nombre: `N${i}`, ...r }));
      expect(n).toHaveLength(k);
      expect(revisarNiveles(n)).toBeUndefined();
    }
    expect(rangosParejos(3)).toEqual([
      { min: 85, max: 100 },
      { min: 70, max: 84 },
      { min: 0, max: 69 },
    ]);
  });

  it("detecta rangos encimados o que no cubren de 0 a 100", () => {
    expect(revisarNiveles([{ nombre: "A", min: 50, max: 100 }, { nombre: "B", min: 0, max: 60 }])).toBe("nivelesRango");
    expect(revisarNiveles([{ nombre: "A", min: 50, max: 90 }, { nombre: "B", min: 0, max: 49 }])).toBe("nivelesRango");
  });

  it("limpia los niveles del formulario (mínimo 2, rango 0-100)", () => {
    expect(limpiarNiveles([{ nombre: "Solo", min: 0, max: 100 }])).toBeUndefined();
    expect(limpiarNiveles([{ nombre: " Alto ", min: 120, max: 60 }, { nombre: "", min: -5, max: 59 }])).toEqual([
      { nombre: "Alto", min: 60, max: 100 },
      { nombre: "#2", min: 0, max: 59 },
    ]);
  });
});

describe("puntos de la rúbrica", () => {
  it("convierte el puntaje a puntos del elemento y de vuelta, dentro del rango del nivel", () => {
    expect(puntosElemento(80, 25)).toBe(20);
    expect(puntajeDePuntos(21, 25, { min: 80, max: 89 })).toBe(84);
    // Fuera del rango del nivel, se queda en su límite.
    expect(puntajeDePuntos(25, 25, { min: 80, max: 89 })).toBe(89);
    expect(puntajeDePuntos(5, 25, { min: 80, max: 89 })).toBe(80);
  });

  it("guarda puntajes con un decimal y el resultado nombra el nivel de la etapa", () => {
    const e = etapa({ niveles: [{ nombre: "Logrado", min: 70, max: 100 }, { nombre: "En proceso", min: 0, max: 69 }], criterios: [
      { id: "c1", nombre: "Problema", descripcion: "", porcentaje: 100, niveles: ["", ""] },
    ] });
    const limpia = limpiarEvaluacion(e, { criterios: [{ criterioId: "c1", puntaje: 84.44 }], terminada: true });
    expect(limpia.criterios[0].puntaje).toBe(84.4);
    const p: Proyecto = { id: "p", grupoId: "g", profesorId: "prof", titulo: "R", descripcion: "", creadoEn: "", etapas: [e], evaluadores: [], equipos: [] };
    const r = resultadoEtapa(p, e, [{ proyectoId: "p", etapaId: "e1", sujeto: "A1", evaluadorId: "prof", ...limpia, actualizadaEn: "" }], "A1");
    expect(r.porCriterio[0].nivelIndice).toBe(0);
  });

  it("ajusta las descripciones de cada criterio al número de niveles", () => {
    expect(limpiarCriterio({ nombre: "X", niveles: ["a", "b", "c", "d", "e"] }, 0, 3).niveles).toEqual(["a", "b", "c"]);
    expect(limpiarCriterio({ nombre: "X", niveles: ["a"] }, 0, 3).niveles).toEqual(["a", "", ""]);
  });
});

describe("ruta de alta del proyecto", () => {
  const base: Proyecto = { id: "p", grupoId: "g", profesorId: "prof", titulo: "Agua limpia", objetivo: "Purificar agua", descripcion: "", creadoEn: "", etapas: [etapa()], evaluadores: [], equipos: [] };

  it("marca A con título, objetivo, fechas y pesos; B con rúbricas completas; C con todo cerrado", () => {
    expect(pasosAltaProyecto(base)).toEqual({ informacion: true, rubrica: true, evaluacion: false });
    expect(pasosAltaProyecto({ ...base, objetivo: "" }).informacion).toBe(false);
    expect(pasosAltaProyecto({ ...base, etapas: [etapa({ fecha: undefined })] }).informacion).toBe(false);
    expect(pasosAltaProyecto({ ...base, etapas: [etapa({ criterios: [] })] }).rubrica).toBe(false);
    expect(pasosAltaProyecto({ ...base, etapas: [etapa({ cerradaEn: "2026-12-02" })] }).evaluacion).toBe(true);
  });

  it("revisa la rúbrica de una etapa", () => {
    expect(revisarRubricaEtapa(etapa())).toBeUndefined();
    expect(revisarRubricaEtapa(etapa({ criterios: [] }))).toBe("sinCriterios");
    expect(revisarRubricaEtapa(etapa({ niveles: [{ nombre: "A", min: 0, max: 90 }, { nombre: "B", min: 0, max: 50 }] }))).toBe("nivelesRango");
  });

  it("limpia entregables y competencias", () => {
    const d = limpiarEntregables([{ id: "d1", nombre: " Reporte ", descripcion: "" }, { nombre: "" }, { id: "d1", nombre: "Bitácora" }]);
    expect(d.map((x) => x.nombre)).toEqual(["Reporte", "Bitácora"]);
    expect(new Set(d.map((x) => x.id)).size).toBe(2);
    expect(limpiarCompetencias("- Trabajo en equipo\n\n2) Comunicación\nTrabajo en equipo")).toEqual(["Trabajo en equipo", "Comunicación"]);
  });
});
