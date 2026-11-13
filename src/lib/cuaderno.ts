// Cuaderno de calificaciones del curso: una fila por alumno y una columna por actividad,
// agrupadas por tipo. Los promedios los calcula este código. Un trabajo no entregado
// cuenta como 0 en las actividades que ya tienen calificaciones.
import { agruparPorEtiqueta } from "./colores";
import { calificacion, calificacionCalculada, calificada, escalaDe } from "./estadisticas";
import type { Actividad, Entrega, Escala, Grupo } from "./tipos";

export type EstadoCelda = "calificada" | "no_entregada" | "pendiente" | "sin_resultados";

export interface Celda {
  /** Calificación en la escala de la actividad; null si aún no hay. */
  valor: number | null;
  estado: EstadoCelda;
  /** true si el profesor la cambió a mano en el cuaderno. */
  manual: boolean;
  /** La que salió de la rúbrica (solo cuando hubo ajuste manual). */
  calculada?: number;
}

export interface Columna {
  id: string;
  titulo: string;
  fecha: string;
  escala: Escala;
  /** false si la actividad aún no tiene ninguna calificación (no cuenta en promedios). */
  cuenta: boolean;
  /** Promedio de la actividad en su escala, con lo no entregado en 0. */
  promedio: number | null;
}

export interface GrupoColumnas {
  etiqueta: string;
  columnas: Columna[];
}

export interface FilaCuaderno {
  matricula: string;
  nombre: string;
  celdas: Record<string, Celda>;
  /** Promedio del alumno en la escala del cuaderno; null si no tiene actividades que cuenten. */
  promedio: number | null;
}

export interface Cuaderno {
  /** 100 si alguna actividad es sobre 100; si todas son sobre 10, 10. */
  escala: Escala;
  grupos: GrupoColumnas[];
  filas: FilaCuaderno[];
  /** Promedio del grupo en la escala del cuaderno. */
  promedioGrupo: number | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function cuadernoCurso(grupo: Grupo, actividades: Actividad[], entregas: Entrega[]): Cuaderno {
  const porFecha = [...actividades].sort((a, b) => a.fechaAplicacion.localeCompare(b.fechaAplicacion));
  const escala: Escala = porFecha.some((a) => escalaDe(a) === 100) ? 100 : 10;
  const entregaDe = (actividadId: string, matricula: string) =>
    entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
  const cuenta = new Map(porFecha.map((a) => [a.id, entregas.some((e) => e.actividadId === a.id && calificada(e))]));

  const celdaDe = (a: Actividad, matricula: string): Celda => {
    const e = entregaDe(a.id, matricula);
    if (e && calificada(e)) {
      const manual = e.calificacionManual !== undefined;
      return { valor: calificacion(a, e), estado: "calificada", manual, calculada: manual && e.resultados.length ? calificacionCalculada(a, e) : undefined };
    }
    if (!cuenta.get(a.id)) return { valor: null, estado: "sin_resultados", manual: false };
    if (e && e.estado !== "sin_entregar") return { valor: null, estado: "pendiente", manual: false };
    return { valor: 0, estado: "no_entregada", manual: false };
  };

  const filas: FilaCuaderno[] = grupo.alumnos.map((al) => {
    const celdas: Record<string, Celda> = {};
    const normalizadas: number[] = [];
    for (const a of porFecha) {
      const c = celdaDe(a, al.matricula);
      celdas[a.id] = c;
      if (c.valor !== null) normalizadas.push((c.valor / escalaDe(a)) * escala);
    }
    const p = prom(normalizadas);
    return { matricula: al.matricula, nombre: al.nombre, celdas, promedio: p === null ? null : r1(p) };
  });

  const columna = (a: Actividad): Columna => {
    const valores = filas.map((f) => f.celdas[a.id].valor).filter((v): v is number => v !== null);
    const p = prom(valores);
    return {
      id: a.id,
      titulo: a.titulo,
      fecha: a.fechaAplicacion,
      escala: escalaDe(a),
      cuenta: !!cuenta.get(a.id),
      promedio: cuenta.get(a.id) && p !== null ? r1(p) : null,
    };
  };

  const grupos = agruparPorEtiqueta(porFecha).map(({ etiqueta, items }) => ({
    etiqueta: etiqueta ?? "Sin etiqueta",
    columnas: items.map(columna),
  }));

  const promedios = filas.map((f) => f.promedio).filter((v): v is number => v !== null);
  const pg = prom(promedios);
  return { escala, grupos, filas, promedioGrupo: pg === null ? null : r1(pg) };
}

export type Orden = "nombre" | "apellido" | "matricula" | "mayor" | "menor";

export const ORDENES: { clave: Orden; texto: string }[] = [
  { clave: "nombre", texto: "Orden alfabético (nombre)" },
  { clave: "apellido", texto: "Orden alfabético (apellido)" },
  { clave: "matricula", texto: "Matrícula" },
  { clave: "mayor", texto: "Desempeño (mayor a menor)" },
  { clave: "menor", texto: "Desempeño (menor a mayor)" },
];

/**
 * Clave para ordenar por apellido en nombres escritos "Nombre(s) Apellido Apellido":
 * "Sofía Hernández Ruiz" → "Hernández Ruiz Sofía". Con dos palabras, el apellido es la última.
 */
export function claveApellido(nombre: string) {
  const t = nombre.trim().split(/\s+/);
  if (t.length >= 3) return [...t.slice(-2), ...t.slice(0, -2)].join(" ");
  if (t.length === 2) return `${t[1]} ${t[0]}`;
  return nombre;
}

const comparar = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base", numeric: true });

export function ordenarFilas(filas: FilaCuaderno[], orden: Orden): FilaCuaderno[] {
  const o = [...filas];
  switch (orden) {
    case "nombre":
      return o.sort((a, b) => comparar(a.nombre, b.nombre));
    case "apellido":
      return o.sort((a, b) => comparar(claveApellido(a.nombre), claveApellido(b.nombre)));
    case "matricula":
      return o.sort((a, b) => comparar(a.matricula, b.matricula));
    case "mayor":
      return o.sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1) || comparar(a.nombre, b.nombre));
    case "menor":
      return o.sort((a, b) => (a.promedio ?? Infinity) - (b.promedio ?? Infinity) || comparar(a.nombre, b.nombre));
  }
}
