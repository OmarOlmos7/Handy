// Cálculos del reporte. Los números siempre los calcula el código; la IA solo
// redacta el resumen narrativo a partir de estos resultados.
import type { Actividad, Alumno, Entrega } from "./tipos";

export type Nivel = "alto" | "medio" | "bajo";

/** Umbrales de desempeño sobre 10. Configurables por profesor en el futuro. */
export const UMBRALES = { alto: 8.5, medio: 7 };

export function puntosTotales(actividad: Actividad) {
  return actividad.reactivos.reduce((s, r) => s + r.puntos, 0);
}

export function puntosObtenidos(entrega: Entrega) {
  return entrega.resultados.reduce((s, r) => s + r.puntosObtenidos, 0);
}

/** Calificación sobre 10 con un decimal. */
export function calificacion(actividad: Actividad, entrega: Entrega) {
  const total = puntosTotales(actividad);
  if (total === 0 || entrega.resultados.length === 0) return 0;
  return Math.round((puntosObtenidos(entrega) / total) * 100) / 10;
}

export function nivelDe(cal: number): Nivel {
  if (cal >= UMBRALES.alto) return "alto";
  if (cal >= UMBRALES.medio) return "medio";
  return "bajo";
}

function promedio(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function mediana(xs: number[]) {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

export interface FilaAlumno {
  alumno: Alumno;
  entrega: Entrega;
  calificacion: number;
  nivel: Nivel;
  reactivosBajaConfianza: number;
}

export interface AciertoPorReactivo {
  numero: number;
  tema: string;
  habilidad: string;
  tipo: string;
  /** Porcentaje promedio de puntos obtenidos (0 a 100). */
  acierto: number;
}

export interface AciertoPorGrupo {
  nombre: string;
  acierto: number;
}

export interface ReporteGrupo {
  entregadas: number;
  pendientes: number;
  promedio: number;
  mediana: number;
  maxima: number;
  minima: number;
  distribucion: { rango: string; cantidad: number }[];
  filas: FilaAlumno[];
  porReactivo: AciertoPorReactivo[];
  porTema: AciertoPorGrupo[];
  porHabilidad: AciertoPorGrupo[];
  niveles: Record<Nivel, FilaAlumno[]>;
}

function agrupar(items: AciertoPorReactivo[], clave: "tema" | "habilidad"): AciertoPorGrupo[] {
  const mapa = new Map<string, number[]>();
  for (const it of items) {
    mapa.set(it[clave], [...(mapa.get(it[clave]) ?? []), it.acierto]);
  }
  return [...mapa.entries()]
    .map(([nombre, xs]) => ({ nombre, acierto: Math.round(promedio(xs)) }))
    .sort((a, b) => b.acierto - a.acierto);
}

export function reporteGrupo(
  actividad: Actividad,
  entregas: Entrega[],
  alumnos: Alumno[],
): ReporteGrupo {
  const evaluadas = entregas.filter((e) => e.resultados.length > 0);
  const filas: FilaAlumno[] = evaluadas
    .map((entrega) => {
      const alumno = alumnos.find((a) => a.matricula === entrega.matricula)!;
      const cal = calificacion(actividad, entrega);
      return {
        alumno,
        entrega,
        calificacion: cal,
        nivel: nivelDe(cal),
        reactivosBajaConfianza: entrega.resultados.filter((r) => r.confianza === "baja").length,
      };
    })
    .sort((a, b) => b.calificacion - a.calificacion);

  const cals = filas.map((f) => f.calificacion);

  const rangos = [
    { rango: "0 a 5.9", min: 0, max: 6 },
    { rango: "6 a 6.9", min: 6, max: 7 },
    { rango: "7 a 7.9", min: 7, max: 8 },
    { rango: "8 a 8.9", min: 8, max: 9 },
    { rango: "9 a 10", min: 9, max: 10.01 },
  ];

  const porReactivo = actividad.reactivos.map((r) => {
    const fr = evaluadas.map(
      (e) => (e.resultados.find((x) => x.numero === r.numero)?.puntosObtenidos ?? 0) / r.puntos,
    );
    return {
      numero: r.numero,
      tema: r.tema,
      habilidad: r.habilidad,
      tipo: r.tipo,
      acierto: Math.round(promedio(fr) * 100),
    };
  });

  return {
    entregadas: evaluadas.length,
    pendientes: entregas.length - evaluadas.length,
    promedio: r1(promedio(cals)),
    mediana: r1(mediana(cals)),
    maxima: cals.length ? Math.max(...cals) : 0,
    minima: cals.length ? Math.min(...cals) : 0,
    distribucion: rangos.map(({ rango, min, max }) => ({
      rango,
      cantidad: cals.filter((c) => c >= min && c < max).length,
    })),
    filas,
    porReactivo,
    porTema: agrupar(porReactivo, "tema"),
    porHabilidad: agrupar(porReactivo, "habilidad"),
    niveles: {
      alto: filas.filter((f) => f.nivel === "alto"),
      medio: filas.filter((f) => f.nivel === "medio"),
      bajo: filas.filter((f) => f.nivel === "bajo"),
    },
  };
}

/**
 * Resumen narrativo del grupo. En producción lo redacta Claude a partir de
 * este mismo reporte; aquí se arma con plantillas para la demostración.
 */
export function resumenNarrativo(rep: ReporteGrupo): string {
  if (rep.entregadas === 0) return "Aún no hay entregas evaluadas.";
  const debiles = [...rep.porReactivo].sort((a, b) => a.acierto - b.acierto).slice(0, 2);
  const fuerte = rep.porTema[0];
  const debilTema = rep.porTema[rep.porTema.length - 1];
  return (
    `El grupo obtuvo un promedio de ${rep.promedio} (mediana ${rep.mediana}) con ${rep.entregadas} entregas. ` +
    `Por nivel de desempeño: ${rep.niveles.alto.length} ${rep.niveles.alto.length === 1 ? "alumno" : "alumnos"} en alto, ${rep.niveles.medio.length} en medio y ${rep.niveles.bajo.length} en bajo. ` +
    `El tema mejor dominado es ${fuerte.nombre} (${fuerte.acierto}% de acierto) y el más débil es ${debilTema.nombre} (${debilTema.acierto}%). ` +
    `Conviene repasar los reactivos ${debiles.map((d) => d.numero).join(" y ")}, que tuvieron el menor acierto.`
  );
}
