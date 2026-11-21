// Contenido del reporte PDF de analíticas (grupo o actividad). Todos los números salen de
// `analiticasCurso` y `reporteGrupo`; aquí solo se eligen y ordenan para la hoja carta.
import { formato } from "./i18n/idiomas";
import profesorEs from "./i18n/diccionarios/profesor/es";
import type { TextosCalculo } from "./analiticas";
import { APROBATORIA, type Analiticas, type ResumenAlumno } from "./analiticas";
import { rebanadasNiveles } from "./configuracion";
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
  /** Datos del encabezado: grupo, actividad, fechas. `corto`: también va en el encabezado de las demás páginas. */
  datos: { etiqueta: string; valor: string; corto?: boolean }[];
  bloques: BloqueReporte[];
  /** Textos fijos del PDF en el idioma de la interfaz. */
  textos: { sinDatos: string; sinResultados: string; generado: string; pagina: string };
}

/** Textos del reporte PDF (profesor.reportePdf del diccionario). */
export type TextosReportePdf = typeof profesorEs.reportePdf;

/** Idioma del reporte: textos, formato regional, hallazgos y nombres de los niveles. */
export interface OpcionesReporte {
  tx?: TextosReportePdf;
  locale?: string;
  calculo?: TextosCalculo;
  niveles?: Parameters<typeof rebanadasNiveles>[2];
}

function ayudas(o: OpcionesReporte) {
  const tx = o.tx ?? profesorEs.reportePdf;
  const locale = o.locale ?? "es-MX";
  const num = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
  const fecha = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    if (locale.startsWith("es")) return `${d} ${MESES[m - 1]} ${a}`;
    return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };
  const hoy = () => new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const textos = { sinDatos: tx.sinDatos, sinResultados: tx.sinResultados, generado: formato(tx.generado, { fecha: hoy() }), pagina: tx.pagina };
  return { tx, num, fecha, hoy, textos };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Tinta del semáforo para un puntaje sobre 100 (85 alto, 70 medio). */
export function tintaPuntaje(p: number) {
  if (p >= 85) return "#15803d";
  if (p >= 70) return "#b45309";
  return "#dc2626";
}
const TINTA_NIVEL: Record<Nivel, string> = { alto: "#15803d", medio: "#b45309", bajo: "#dc2626" };

function pasteles(a: Analiticas, porAlumno: string, tx: TextosReportePdf, niveles: OpcionesReporte["niveles"]): BloqueReporte {
  const g = a.general;
  return {
    tipo: "pasteles",
    items: [
      {
        titulo: tx.aprobadosVs,
        nota: formato(tx.apruebaCon, { base: porAlumno, n: APROBATORIA }),
        centro: `${g.aprobacion}%`,
        subcentro: tx.aprobadosMin,
        rebanadas: [
          { nombre: tx.aprobados, valor: g.aprobados, color: "#22c55e" },
          { nombre: tx.noAprobados, valor: g.reprobados, color: "#ef4444" },
        ],
      },
      {
        titulo: tx.niveles,
        nota: tx.alumnosPorNivel,
        centro: String(a.niveles.superior + a.niveles.alto + a.niveles.medio + a.niveles.bajo),
        subcentro: tx.alumnosMin,
        rebanadas: rebanadasNiveles(a.niveles, a.rangos, niveles),
      },
      {
        titulo: tx.entregas,
        nota: tx.trabajosEvaluado,
        centro: `${g.tasaEntrega}%`,
        subcentro: tx.entregadosMin,
        rebanadas: [
          { nombre: tx.entregados, valor: g.entregadas, color: "#3b6ef6" },
          { nombre: tx.noEntregados, valor: g.noEntregadas, color: "#94a3b8" },
        ],
      },
    ],
  };
}

function distribucion(a: Analiticas, titulo: string, tx: TextosReportePdf): BloqueReporte {
  return {
    tipo: "columnas",
    titulo,
    nota: tx.cuantosRango,
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
  ay: ReturnType<typeof ayudas>,
  titulo: string,
  nota: string,
  filas: ResumenAlumno[],
  vacio: string,
  valor: string,
  extra: "motivos" | "entregas" | null,
): BloqueReporte {
  const { tx, num } = ay;
  const columnas: ColumnaTabla[] = [
    { titulo: tx.alumno, ancho: extra === "motivos" ? 3 : 4 },
    { titulo: valor, ancho: 1, alinear: "der" },
  ];
  if (extra === "motivos") columnas.push({ titulo: tx.motivo, ancho: 4 });
  if (extra === "entregas") columnas.push({ titulo: tx.entregas, ancho: 1, alinear: "der" });
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
export function reporteGrupoPdf(grupo: Grupo, a: Analiticas, opciones: OpcionesReporte = {}): ReporteAnaliticas {
  const ay = ayudas(opciones);
  const { tx, num, fecha, hoy } = ay;
  const g = a.general;
  const bloques: BloqueReporte[] = [
    {
      tipo: "cifras",
      items: [
        { titulo: tx.promedioGeneral, valor: num(g.promedio), detalle: formato(tx.sinNoEntregado, { n: num(g.promedioEntregadas) }) },
        { titulo: tx.mediana, valor: num(g.mediana), detalle: tx.deLosPromedios },
        { titulo: tx.desviacion, valor: num(g.desviacion), detalle: tx.dispersionPromedios },
        { titulo: tx.aprobacion, valor: `${g.aprobacion}%`, detalle: formato(tx.promedioDeOMas, { n: APROBATORIA }) },
        { titulo: tx.tasaEntrega, valor: `${g.tasaEntrega}%`, detalle: formato(tx.sinEntregar, { n: g.noEntregadas }) },
      ],
    },
    pasteles(a, tx.porPromedioAlumno, tx, opciones.niveles),
    { tipo: "lista", titulo: tx.hallazgos, nota: tx.calculadosCurso, items: a.hallazgos },
    {
      tipo: "par",
      bloques: [
        {
          tipo: "barras",
          titulo: tx.promedioPorTipo,
          nota: formato(tx.lineaGris, { n: APROBATORIA }),
          filas: a.porTipo.map((t) => ({
            nombre: t.nombre,
            valor: t.promedio,
            detalle: t.cantidad === 1 ? tx.unaActividad : formato(tx.nActividades, { n: t.cantidad }),
          })),
        },
        distribucion(a, tx.distribucionPromedios, tx),
      ],
    },
  ];
  if (a.porTipo.length) {
    bloques.push({
      tipo: "tabla",
      titulo: tx.metricasTipo,
      nota: tx.todoSobre100,
      columnas: [
        { titulo: tx.tipo, ancho: 2.4 },
        { titulo: tx.actividades, ancho: 1.1, alinear: "der" },
        { titulo: tx.promedio, ancho: 1, alinear: "der" },
        { titulo: tx.mediana, ancho: 1, alinear: "der" },
        { titulo: tx.aprobacion, ancho: 1.1, alinear: "der" },
        { titulo: tx.entrega, ancho: 1, alinear: "der" },
        { titulo: tx.promEntregados, ancho: 1.4, alinear: "der" },
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
      titulo: tx.evolucion,
      nota: formato(tx.evolucionNota, { n: APROBATORIA }),
      max: 100,
      linea: APROBATORIA,
      filas: a.actividades.map((s) => ({ nombre: s.titulo, valor: s.promedio, etiqueta: num(s.promedio), color: colorDesempeno(s.promedio) })),
    });
  }
  if (a.temas.length) {
    const temas = a.temas.length > 12 ? a.temas.slice(-12) : a.temas;
    bloques.push({
      tipo: "barras",
      titulo: tx.aciertoTema,
      nota: a.temas.length > 12 ? tx.temas12 : tx.temasTodos,
      sufijo: "%",
      filas: temas.map((t) => ({ nombre: t.nombre, valor: t.acierto })),
    });
  }
  bloques.push(
    tablaAlumnos(ay, tx.mejores, tx.cincoPromedios, a.mejores, tx.sinDestacados, tx.promedio, "entregas"),
    tablaAlumnos(ay, tx.atencion, formato(tx.atencionNotaGrupo, { n: APROBATORIA }), a.atencion, tx.sinAtencion, tx.promedio, "motivos"),
    {
      tipo: "tabla",
      titulo: tx.estadisticasActividad,
      nota: tx.sobre100Nota,
      columnas: [
        { titulo: tx.actividad, ancho: 4.4 },
        { titulo: tx.tipo, ancho: 1.1 },
        { titulo: tx.entrega, ancho: 0.9, alinear: "der" },
        { titulo: tx.prom, ancho: 0.9, alinear: "der" },
        { titulo: tx.promEntr, ancho: 1.2, alinear: "der" },
        { titulo: tx.mediana, ancho: 0.9, alinear: "der" },
        { titulo: tx.desv, ancho: 0.8, alinear: "der" },
        { titulo: tx.min, ancho: 0.7, alinear: "der" },
        { titulo: tx.max, ancho: 0.7, alinear: "der" },
        { titulo: tx.aprob, ancho: 0.8, alinear: "der" },
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
    titulo: tx.tituloGrupo,
    datos: [
      { etiqueta: tx.materia, valor: grupo.materia, corto: true },
      { etiqueta: tx.grupo, valor: grupo.nombre, corto: true },
      { etiqueta: tx.ciclo, valor: grupo.ciclo },
      { etiqueta: tx.alumnos, valor: String(g.alumnos) },
      { etiqueta: tx.actividadesEvaluadas, valor: String(a.actividades.length) },
      { etiqueta: tx.fechaReporte, valor: hoy() },
    ],
    bloques,
    textos: ay.textos,
  };
}

export function nombreTipoReactivo(tipo: string, tx: TextosReportePdf = profesorEs.reportePdf) {
  const nombres: Record<string, string> = {
    verdadero_falso: tx.tipoVf,
    opcion_multiple: tx.tipoOpcion,
    relacion_columnas: tx.tipoRelacion,
    parentesis: tx.tipoParentesis,
    desarrollo: tx.tipoDesarrollo,
    abierto: tx.tipoAbierto,
    seleccion_multiple: tx.tipoSeleccionMultiple,
    numerica: tx.tipoNumerica,
    si_no: tx.tipoSiNo,
    orden: tx.tipoOrden,
    relacion_imagenes: tx.tipoRelacionImagenes,
    seleccion_imagenes: tx.tipoSeleccionImagenes,
  };
  return nombres[tipo] ?? tipo;
}

/** Hallazgos de una actividad: los del curso más reactivos y habilidades. */
export function hallazgosActividad(a: Analiticas, rep: ReporteGrupo, tx: TextosCalculo = profesorEs.calculo) {
  const hallazgos = [...a.hallazgos];
  if (rep.porReactivo.length >= 2) {
    const debiles = [...rep.porReactivo].sort((x, y) => x.acierto - y.acierto).slice(0, 2);
    hallazgos.splice(1, 0, formato(tx.repasarReactivos, { lista: debiles.map((d) => `${d.numero} (${d.acierto}%)`).join(tx.y) }));
  }
  const fuerte = rep.porHabilidad[0];
  const debil = rep.porHabilidad[rep.porHabilidad.length - 1];
  if (fuerte && debil && fuerte.nombre !== debil.nombre) {
    hallazgos.push(formato(tx.habilidades, { f: fuerte.nombre, fa: fuerte.acierto, d: debil.nombre, da: debil.acierto }));
  }
  return hallazgos;
}

/** Reporte de las analíticas de una actividad. */
export function reporteActividadPdf(grupo: Grupo, actividad: Actividad, a: Analiticas, rep: ReporteGrupo, opciones: OpcionesReporte = {}): ReporteAnaliticas {
  const ay = ayudas(opciones);
  const { tx, num, fecha, hoy, textos } = ay;
  const s = a.actividades[0];
  const datos = [
    { etiqueta: tx.materia, valor: grupo.materia, corto: true },
    { etiqueta: tx.grupo, valor: grupo.nombre, corto: true },
    { etiqueta: tx.ciclo, valor: grupo.ciclo },
    { etiqueta: tx.actividad, valor: actividad.titulo, corto: true },
    { etiqueta: tx.tipo, valor: actividad.etiqueta ?? tx.sinEtiqueta },
    { etiqueta: tx.aplicada, valor: fecha(actividad.fechaAplicacion) },
    { etiqueta: tx.calificacion, valor: formato(tx.sobreEscala, { e: rep.escala }) },
    { etiqueta: tx.fechaReporte, valor: hoy() },
  ];
  if (!s) return { titulo: tx.tituloActividad, datos, bloques: [], textos };

  const sinEntregar = grupo.alumnos.filter((al) => !rep.filas.some((f) => f.alumno.matricula === al.matricula));
  const bloques: BloqueReporte[] = [
    {
      tipo: "cifras",
      items: [
        { titulo: tx.promedio, valor: num(s.promedio), detalle: formato(tx.sinNoEntregado, { n: num(s.promedioEntregadas) }) },
        { titulo: tx.mediana, valor: num(s.mediana), detalle: formato(tx.minMax, { min: num(s.minima), max: num(s.maxima) }) },
        { titulo: tx.desviacion, valor: num(s.desviacion), detalle: tx.dispersionPuntajes },
        { titulo: tx.aprobacion, valor: `${s.aprobacion}%`, detalle: formato(tx.alumnosConOMas, { n: APROBATORIA }) },
        {
          titulo: tx.tasaEntrega,
          valor: `${s.tasaEntrega}%`,
          detalle: `${formato(tx.sinEntregar, { n: s.noEntregadas })}${s.pendientes ? formato(tx.porEvaluar, { n: s.pendientes }) : ""}`,
        },
      ],
    },
    pasteles(a, tx.porPuntajeAlumno, tx, opciones.niveles),
    { tipo: "lista", titulo: tx.hallazgos, nota: tx.calculadosActividad, items: hallazgosActividad(a, rep, opciones.calculo) },
    {
      tipo: "par",
      bloques: [
        {
          tipo: "barras",
          titulo: tx.aciertoReactivo,
          nota: tx.aciertoReactivoNota,
          sufijo: "%",
          filas: rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipoReactivo(r.tipo, tx)}`, valor: r.acierto })),
        },
        {
          tipo: "barras",
          titulo: tx.aciertoTema,
          nota: tx.aciertoTemaNota,
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
          titulo: tx.habilidades,
          nota: tx.habilidadesNota,
          sufijo: "%",
          filas: rep.porHabilidad.map((h) => ({ nombre: h.nombre, valor: h.acierto })),
        },
        distribucion(a, tx.distribucionPuntajes, tx),
      ],
    },
    tablaAlumnos(ay, tx.mejores, tx.cincoPuntajes, a.mejores, tx.sinDestacados, tx.puntaje, null),
    tablaAlumnos(ay, tx.atencion, formato(tx.atencionNotaActividad, { n: APROBATORIA }), a.atencion, tx.sinAtencion, tx.puntaje, "motivos"),
    {
      tipo: "tabla",
      titulo: tx.calificacionesActividad,
      nota: formato(tx.calificacionesNota, { e: rep.escala }),
      columnas: [
        { titulo: "#", ancho: 0.5 },
        { titulo: tx.alumno, ancho: 4 },
        { titulo: tx.matricula, ancho: 1.5 },
        { titulo: tx.nivel, ancho: 1.3 },
        { titulo: tx.calificacion, ancho: 1.3, alinear: "der" },
      ],
      filas: [
        ...rep.filas.map((f, i) => [
          { texto: String(i + 1), color: "#94a3b8" },
          { texto: f.alumno.nombre },
          { texto: f.alumno.matricula, color: "#475569" },
          { texto: tx[f.nivel], color: TINTA_NIVEL[f.nivel] },
          { texto: formatoCal(f.calificacion, rep.escala), color: TINTA_NIVEL[f.nivel], negrita: true },
        ]),
        ...sinEntregar.map((al) => [
          { texto: "—", color: "#cbd5e1" },
          { texto: al.nombre, color: "#64748b" },
          { texto: al.matricula, color: "#64748b" },
          { texto: tx.sinCalificacion, color: "#64748b" },
          { texto: tx.ne, color: "#dc2626", negrita: true },
        ]),
      ],
    },
  ];
  return { titulo: tx.tituloActividad, datos, bloques, textos };
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
