// Contenido del reporte PDF de analíticas (grupo o actividad). Todos los números salen de
// `analiticasCurso` y `reporteGrupo`; aquí solo se eligen y ordenan para la hoja carta.
import { APROBATORIA, type Analiticas, type ResumenAlumno } from "./analiticas";
import { colorDesempeno } from "./escala-color";
import { formatoCal, type Nivel, type ReporteGrupo } from "./estadisticas";
import type { Actividad, Grupo } from "./tipos";

export interface Rebanada {
  nombre: string;
  valor: number;
  color: string;
}

export interface FilaBarra {
  nombre: string;
  /** Sobre 100. */
  valor: number;
  detalle?: string;
}

export interface ColumnaTabla {
  titulo: string;
  /** Ancho relativo. */
  ancho: number;
  alinear?: "izq" | "der";
}

export interface CeldaTabla {
  texto: string;
  color?: string;
  negrita?: boolean;
}

export type BloqueReporte =
  | { tipo: "cifras"; items: { titulo: string; valor: string; detalle?: string }[] }
  | { tipo: "pasteles"; items: { titulo: string; nota?: string; centro: string; subcentro: string; rebanadas: Rebanada[] }[] }
  | { tipo: "lista"; titulo: string; nota?: string; items: string[] }
  | { tipo: "barras"; titulo: string; nota?: string; sufijo?: string; filas: FilaBarra[] }
  | {
      tipo: "columnas";
      titulo: string;
      nota?: string;
      max: number;
      linea?: number;
      filas: { nombre: string; valor: number; color: string; etiqueta: string }[];
    }
  | { tipo: "tabla"; titulo: string; nota?: string; columnas: ColumnaTabla[]; filas: CeldaTabla[][]; vacio?: string }
  | { tipo: "par"; bloques: [BloqueReporte, BloqueReporte] };

export interface ReporteAnaliticas {
  titulo: string;
  /** Datos del encabezado: grupo, actividad, fechas. */
  datos: { etiqueta: string; valor: string }[];
  bloques: BloqueReporte[];
}

const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
};
const hoy = () => new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/** Tinta del semáforo para un puntaje sobre 100 (85 alto, 70 medio). */
export function tintaPuntaje(p: number) {
  if (p >= 85) return "#15803d";
  if (p >= 70) return "#b45309";
  return "#dc2626";
}
const TINTA_NIVEL: Record<Nivel, string> = { alto: "#15803d", medio: "#b45309", bajo: "#dc2626" };
const TEXTO_NIVEL: Record<Nivel, string> = { alto: "Alto", medio: "Medio", bajo: "Bajo" };

function pasteles(a: Analiticas, porAlumno: string): BloqueReporte {
  const g = a.general;
  return {
    tipo: "pasteles",
    items: [
      {
        titulo: "Aprobados vs. no aprobados",
        nota: `${porAlumno}; aprueba con ${APROBATORIA} o más.`,
        centro: `${g.aprobacion}%`,
        subcentro: "aprobados",
        rebanadas: [
          { nombre: "Aprobados", valor: g.aprobados, color: "#22c55e" },
          { nombre: "No aprobados", valor: g.reprobados, color: "#ef4444" },
        ],
      },
      {
        titulo: "Niveles de desempeño",
        nota: "Alumnos por nivel.",
        centro: String(a.niveles.alto + a.niveles.medio + a.niveles.bajo),
        subcentro: "alumnos",
        rebanadas: [
          { nombre: "Alto (85+)", valor: a.niveles.alto, color: "#16a34a" },
          { nombre: "Medio (70-84)", valor: a.niveles.medio, color: "#f59e0b" },
          { nombre: "Bajo (<70)", valor: a.niveles.bajo, color: "#dc2626" },
        ],
      },
      {
        titulo: "Entregas",
        nota: "Trabajos de lo evaluado.",
        centro: `${g.tasaEntrega}%`,
        subcentro: "entregados",
        rebanadas: [
          { nombre: "Entregados", valor: g.entregadas, color: "#3b6ef6" },
          { nombre: "No entregados (0)", valor: g.noEntregadas, color: "#94a3b8" },
        ],
      },
    ],
  };
}

function distribucion(a: Analiticas, titulo: string): BloqueReporte {
  return {
    tipo: "columnas",
    titulo,
    nota: "Cuántos alumnos hay en cada rango (sobre 100).",
    max: Math.max(1, ...a.distribucion.map((d) => d.cantidad)),
    filas: a.distribucion.map((d, i) => ({
      nombre: d.rango,
      valor: d.cantidad,
      etiqueta: String(d.cantidad),
      color: colorDesempeno([30, 65, 75, 85, 95][i] ?? 50),
    })),
  };
}

function tablaAlumnos(
  titulo: string,
  nota: string,
  filas: ResumenAlumno[],
  vacio: string,
  valor: string,
  extra: "motivos" | "entregas" | null,
): BloqueReporte {
  const columnas: ColumnaTabla[] = [
    { titulo: "Alumno", ancho: extra === "motivos" ? 3 : 4 },
    { titulo: valor, ancho: 1, alinear: "der" },
  ];
  if (extra === "motivos") columnas.push({ titulo: "Motivo", ancho: 4 });
  if (extra === "entregas") columnas.push({ titulo: "Entregas", ancho: 1, alinear: "der" });
  return {
    tipo: "tabla",
    titulo,
    nota,
    vacio,
    columnas,
    filas: filas.map((r) => {
      const fila: CeldaTabla[] = [{ texto: r.alumno.nombre }, { texto: num(r.promedio), color: tintaPuntaje(r.promedio), negrita: true }];
      if (extra === "motivos") fila.push({ texto: r.motivos.join(" · "), color: "#475569" });
      if (extra === "entregas") fila.push({ texto: `${r.puntajes.length - r.noEntregadas}/${r.puntajes.length}`, color: "#475569" });
      return fila;
    }),
  };
}

/** Reporte de las analíticas de todo el grupo. */
export function reporteGrupoPdf(grupo: Grupo, a: Analiticas): ReporteAnaliticas {
  const g = a.general;
  const bloques: BloqueReporte[] = [
    {
      tipo: "cifras",
      items: [
        { titulo: "Promedio general", valor: num(g.promedio), detalle: `${num(g.promedioEntregadas)} sin contar lo no entregado` },
        { titulo: "Mediana", valor: num(g.mediana), detalle: "De los promedios por alumno" },
        { titulo: "Desviación estándar", valor: num(g.desviacion), detalle: "Dispersión de los promedios" },
        { titulo: "Aprobación", valor: `${g.aprobacion}%`, detalle: `Promedio de ${APROBATORIA} o más` },
        { titulo: "Tasa de entrega", valor: `${g.tasaEntrega}%`, detalle: `${g.noEntregadas} sin entregar` },
      ],
    },
    pasteles(a, "Por promedio del alumno"),
    { tipo: "lista", titulo: "Hallazgos", nota: "Calculados con los resultados del curso.", items: a.hallazgos },
    {
      tipo: "par",
      bloques: [
        {
          tipo: "barras",
          titulo: "Promedio por tipo de actividad",
          nota: `La línea gris marca ${APROBATORIA}.`,
          filas: a.porTipo.map((t) => ({
            nombre: t.nombre,
            valor: t.promedio,
            detalle: `${t.cantidad} ${t.cantidad === 1 ? "actividad" : "actividades"}`,
          })),
        },
        distribucion(a, "Distribución de promedios"),
      ],
    },
  ];
  if (a.porTipo.length) {
    bloques.push({
      tipo: "tabla",
      titulo: "Métricas por tipo de actividad",
      nota: "Todo sobre 100; lo no entregado cuenta como 0 en el promedio.",
      columnas: [
        { titulo: "Tipo", ancho: 2.4 },
        { titulo: "Actividades", ancho: 1.1, alinear: "der" },
        { titulo: "Promedio", ancho: 1, alinear: "der" },
        { titulo: "Mediana", ancho: 1, alinear: "der" },
        { titulo: "Aprobación", ancho: 1.1, alinear: "der" },
        { titulo: "Entrega", ancho: 1, alinear: "der" },
        { titulo: "Prom. entregados", ancho: 1.4, alinear: "der" },
      ],
      filas: a.porTipo.map((t) => [
        { texto: t.nombre, negrita: true },
        { texto: String(t.cantidad) },
        { texto: num(t.promedio), color: tintaPuntaje(t.promedio), negrita: true },
        { texto: num(t.mediana) },
        { texto: `${t.aprobacion}%` },
        { texto: `${t.tasaEntrega}%` },
        { texto: num(t.promedioEntregadas) },
      ]),
    });
  }
  if (a.actividades.length) {
    bloques.push({
      tipo: "columnas",
      titulo: "Evolución del promedio",
      nota: `Promedio de cada actividad, en orden de fecha. La línea punteada marca ${APROBATORIA}.`,
      max: 100,
      linea: APROBATORIA,
      filas: a.actividades.map((s) => ({ nombre: s.titulo, valor: s.promedio, etiqueta: num(s.promedio), color: colorDesempeno(s.promedio) })),
    });
  }
  if (a.temas.length) {
    const temas = a.temas.length > 12 ? a.temas.slice(-12) : a.temas;
    bloques.push({
      tipo: "barras",
      titulo: "Acierto por tema",
      nota:
        a.temas.length > 12
          ? "Los 12 temas con menor acierto: porcentaje de puntos logrados en sus reactivos."
          : "Porcentaje de puntos logrados en los reactivos de cada tema, de mayor a menor.",
      sufijo: "%",
      filas: temas.map((t) => ({ nombre: t.nombre, valor: t.acierto })),
    });
  }
  bloques.push(
    tablaAlumnos("Mejores resultados", "Los cinco promedios más altos.", a.mejores, "Aún no hay alumnos destacados.", "Promedio", "entregas"),
    tablaAlumnos(
      "Atención urgente",
      `Promedio menor a ${APROBATORIA}, dos o más trabajos sin entregar, o una caída de 15 puntos o más.`,
      a.atencion,
      "Ningún alumno requiere atención urgente.",
      "Promedio",
      "motivos",
    ),
    {
      tipo: "tabla",
      titulo: "Estadísticas por actividad",
      nota: "Sobre 100. El promedio cuenta como 0 lo no entregado.",
      columnas: [
        { titulo: "Actividad", ancho: 4.4 },
        { titulo: "Tipo", ancho: 1.1 },
        { titulo: "Entrega", ancho: 0.9, alinear: "der" },
        { titulo: "Prom.", ancho: 0.9, alinear: "der" },
        { titulo: "Prom. entr.", ancho: 1.2, alinear: "der" },
        { titulo: "Mediana", ancho: 0.9, alinear: "der" },
        { titulo: "Desv.", ancho: 0.8, alinear: "der" },
        { titulo: "Mín.", ancho: 0.7, alinear: "der" },
        { titulo: "Máx.", ancho: 0.7, alinear: "der" },
        { titulo: "Aprob.", ancho: 0.8, alinear: "der" },
      ],
      filas: a.actividades.map((s) => [
        { texto: `${s.titulo} (${fecha(s.fecha)})`, negrita: true },
        { texto: s.etiqueta ?? "—", color: "#475569" },
        { texto: `${s.tasaEntrega}%` },
        { texto: num(s.promedio), color: tintaPuntaje(s.promedio), negrita: true },
        { texto: num(s.promedioEntregadas) },
        { texto: num(s.mediana) },
        { texto: num(s.desviacion) },
        { texto: num(s.minima) },
        { texto: num(s.maxima) },
        { texto: `${s.aprobacion}%` },
      ]),
    },
  );

  return {
    titulo: "Analíticas de aprendizaje del grupo",
    datos: [
      { etiqueta: "Materia", valor: grupo.materia },
      { etiqueta: "Grupo", valor: grupo.nombre },
      { etiqueta: "Ciclo", valor: grupo.ciclo },
      { etiqueta: "Alumnos", valor: String(g.alumnos) },
      { etiqueta: "Actividades evaluadas", valor: String(a.actividades.length) },
      { etiqueta: "Fecha del reporte", valor: hoy() },
    ],
    bloques,
  };
}

const NOMBRE_TIPO: Record<string, string> = {
  verdadero_falso: "V/F",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Abierto",
};

export const nombreTipoReactivo = (tipo: string) => NOMBRE_TIPO[tipo] ?? tipo;

/** Hallazgos de una actividad: los del curso más reactivos y habilidades. */
export function hallazgosActividad(a: Analiticas, rep: ReporteGrupo) {
  const hallazgos = [...a.hallazgos];
  if (rep.porReactivo.length >= 2) {
    const debiles = [...rep.porReactivo].sort((x, y) => x.acierto - y.acierto).slice(0, 2);
    hallazgos.splice(1, 0, `Conviene repasar los reactivos ${debiles.map((d) => `${d.numero} (${d.acierto}%)`).join(" y ")}, que tuvieron el menor acierto.`);
  }
  const fuerte = rep.porHabilidad[0];
  const debil = rep.porHabilidad[rep.porHabilidad.length - 1];
  if (fuerte && debil && fuerte.nombre !== debil.nombre) {
    hallazgos.push(`La habilidad mejor lograda es ${fuerte.nombre} (${fuerte.acierto}%) y la más débil, ${debil.nombre} (${debil.acierto}%).`);
  }
  return hallazgos;
}

/** Reporte de las analíticas de una actividad. */
export function reporteActividadPdf(grupo: Grupo, actividad: Actividad, a: Analiticas, rep: ReporteGrupo): ReporteAnaliticas {
  const s = a.actividades[0];
  const datos = [
    { etiqueta: "Materia", valor: grupo.materia },
    { etiqueta: "Grupo", valor: grupo.nombre },
    { etiqueta: "Ciclo", valor: grupo.ciclo },
    { etiqueta: "Actividad", valor: actividad.titulo },
    { etiqueta: "Tipo", valor: actividad.etiqueta ?? "Sin etiqueta" },
    { etiqueta: "Aplicada", valor: fecha(actividad.fechaAplicacion) },
    { etiqueta: "Calificación", valor: `sobre ${rep.escala} (el reporte usa puntajes sobre 100)` },
    { etiqueta: "Fecha del reporte", valor: hoy() },
  ];
  if (!s) return { titulo: "Analíticas de la actividad", datos, bloques: [] };

  const sinEntregar = grupo.alumnos.filter((al) => !rep.filas.some((f) => f.alumno.matricula === al.matricula));
  const bloques: BloqueReporte[] = [
    {
      tipo: "cifras",
      items: [
        { titulo: "Promedio", valor: num(s.promedio), detalle: `${num(s.promedioEntregadas)} sin contar lo no entregado` },
        { titulo: "Mediana", valor: num(s.mediana), detalle: `Mín. ${num(s.minima)} · máx. ${num(s.maxima)}` },
        { titulo: "Desviación estándar", valor: num(s.desviacion), detalle: "Dispersión de los puntajes" },
        { titulo: "Aprobación", valor: `${s.aprobacion}%`, detalle: `Alumnos con ${APROBATORIA} o más` },
        {
          titulo: "Tasa de entrega",
          valor: `${s.tasaEntrega}%`,
          detalle: `${s.noEntregadas} sin entregar${s.pendientes ? ` · ${s.pendientes} por evaluar` : ""}`,
        },
      ],
    },
    pasteles(a, "Por puntaje del alumno"),
    { tipo: "lista", titulo: "Hallazgos", nota: "Calculados con los resultados de la actividad.", items: hallazgosActividad(a, rep) },
    {
      tipo: "par",
      bloques: [
        {
          tipo: "barras",
          titulo: "Acierto por reactivo",
          nota: "Porcentaje de puntos logrados en cada reactivo.",
          sufijo: "%",
          filas: rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipoReactivo(r.tipo)}`, valor: r.acierto })),
        },
        {
          tipo: "barras",
          titulo: "Acierto por tema",
          nota: "Porcentaje de puntos logrados por tema.",
          sufijo: "%",
          filas: a.temas.map((t) => ({ nombre: t.nombre, valor: t.acierto })),
        },
      ],
    },
    {
      tipo: "par",
      bloques: [
        {
          tipo: "barras",
          titulo: "Habilidades",
          nota: "Sobresalientes arriba, áreas de mejora abajo.",
          sufijo: "%",
          filas: rep.porHabilidad.map((h) => ({ nombre: h.nombre, valor: h.acierto })),
        },
        distribucion(a, "Distribución de puntajes"),
      ],
    },
    tablaAlumnos("Mejores resultados", "Los cinco puntajes más altos.", a.mejores, "Aún no hay alumnos destacados.", "Puntaje", null),
    tablaAlumnos(
      "Atención urgente",
      `Puntaje menor a ${APROBATORIA} o trabajo sin entregar.`,
      a.atencion,
      "Ningún alumno requiere atención urgente.",
      "Puntaje",
      "motivos",
    ),
    {
      tipo: "tabla",
      titulo: "Calificaciones de la actividad",
      nota: `Calificación sobre ${rep.escala}. NE: no entregó (cuenta 0).`,
      columnas: [
        { titulo: "#", ancho: 0.5 },
        { titulo: "Alumno", ancho: 4 },
        { titulo: "Matrícula", ancho: 1.5 },
        { titulo: "Nivel", ancho: 1.3 },
        { titulo: "Calificación", ancho: 1.3, alinear: "der" },
      ],
      filas: [
        ...rep.filas.map((f, i) => [
          { texto: String(i + 1), color: "#94a3b8" },
          { texto: f.alumno.nombre },
          { texto: f.alumno.matricula, color: "#475569" },
          { texto: TEXTO_NIVEL[f.nivel], color: TINTA_NIVEL[f.nivel] },
          { texto: formatoCal(f.calificacion, rep.escala), color: TINTA_NIVEL[f.nivel], negrita: true },
        ]),
        ...sinEntregar.map((al) => [
          { texto: "—", color: "#cbd5e1" },
          { texto: al.nombre, color: "#64748b" },
          { texto: al.matricula, color: "#64748b" },
          { texto: "Sin calificación", color: "#64748b" },
          { texto: "0 NE", color: "#dc2626", negrita: true },
        ]),
      ],
    },
  ];
  return { titulo: "Analíticas de la actividad", datos, bloques };
}

/** Nombre de archivo sin acentos ni espacios. */
export function nombreArchivoReporte(partes: string[]) {
  const base = partes
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 80) || "reporte";
}
