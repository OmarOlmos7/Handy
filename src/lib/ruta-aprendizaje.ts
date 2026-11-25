// Ruta de aprendizaje del alumno: a partir de su valoración inicial (nivel por unidad) y de lo que
// ya hizo (actividades del profesor y autoestudio), decide qué temas debe repasar o practicar en
// cada unidad y en qué estado va la unidad. La certificación la dan los exámenes que el profesor
// marca como "de certificación" en la unidad. Todo se calcula por código, sin IA.
import { minimoCertificacion } from "./asignaturas";
import type { Asignatura, NivelConocimiento, TemarioActividad, TipoAutoactividad } from "./tipos";

export const NIVELES_CONOCIMIENTO: readonly NivelConocimiento[] = ["avanzado", "bueno", "basico", "apoyo", "sin_idea"];

export const esNivel = (v: unknown): v is NivelConocimiento => typeof v === "string" && (NIVELES_CONOCIMIENTO as readonly string[]).includes(v);

/** A partir de este porcentaje un tema se considera dominado y sale de la ruta. */
export const DOMINIO = 80;
/** Debajo de este porcentaje el tema necesita refuerzo aunque el alumno se haya valorado alto. */
export const REFUERZO = 70;

/** Unidad certificada (azul con paloma), con actividades sin certificar (amarillo) o sin iniciar (blanco). */
export type EstadoUnidad = "certificada" | "en_progreso" | "sin_iniciar";
export type EstadoTema = "dominado" | "en_progreso" | "pendiente";
/** Qué conviene hacer con el tema, de lo más ligero a lo más profundo. */
export type AccionTema = "repasar" | "practicar" | "reforzar" | "estudiar" | "explorar";
export type Prioridad = "alta" | "media" | "baja";

export interface TemaRuta {
  nombre: string;
  /** Subtemas (para el texto de ayuda y para reconocer el autoestudio). */
  subtemas: string[];
  estado: EstadoTema;
  /** Promedio de lo hecho en el tema (%), o null si aún no hay calificaciones. */
  porcentaje: number | null;
  /** true si el tema forma parte de lo que el alumno debe repasar o practicar ahora. */
  recomendado: boolean;
  accion: AccionTema;
  /** Tipo de actividad de autoestudio que se sugiere para el tema. */
  tipo: TipoAutoactividad;
}

export interface CertificacionRuta {
  id: string;
  titulo: string;
  minimo: number;
  /** Calificación liberada del alumno (%), o null si no la ha presentado o no se ha liberado. */
  porcentaje: number | null;
  lograda: boolean;
}

export interface UnidadRuta {
  indice: number;
  nombre: string;
  nivel?: NivelConocimiento;
  estado: EstadoUnidad;
  prioridad: Prioridad;
  temas: TemaRuta[];
  certificaciones: CertificacionRuta[];
}

export interface RutaAprendizaje {
  unidades: UnidadRuta[];
  /** Unidades certificadas. */
  certificadas: number;
  /** Todas las unidades certificadas: se llega a "Completado". */
  completada: boolean;
  /** Temas que el alumno tiene por repasar o practicar ahora. */
  pendientes: number;
}

/** Actividad del profesor con lo que logró el alumno en ella. */
export interface ActividadParaRuta {
  id: string;
  titulo: string;
  temario?: TemarioActividad;
  /** El alumno ya la entregó. */
  entregada: boolean;
  /** Calificación liberada en porcentaje (null si aún no se ve). */
  porcentaje: number | null;
}

/** Actividad de autoestudio del alumno (su tema es texto libre). */
export interface AutoactividadParaRuta {
  tema: string;
  estado: "pendiente" | "evaluando" | "completada";
  calificacion?: number;
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^\s*(\d+(\.\d+)*[.)]?|[ivxlc]+[.)-])\s+/i, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** El tema que escribió el alumno corresponde al nombre del temario (igual, o uno contiene al otro). */
export function coincideTema(escrito: string, nombre: string): boolean {
  const a = normal(escrito);
  const b = normal(nombre);
  if (!a || !b) return false;
  if (a === b) return true;
  const [corto, largo] = a.length < b.length ? [a, b] : [b, a];
  return corto.length >= 5 && largo.includes(corto);
}

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

/** Acción y tipo de autoestudio según el nivel que declaró el alumno y lo que lleva. */
export function accionPara(nivel: NivelConocimiento, porcentaje: number | null): { accion: AccionTema; tipo: TipoAutoactividad } {
  if (porcentaje !== null && porcentaje < REFUERZO) return porcentaje < 50 ? { accion: "reforzar", tipo: "videos" } : { accion: "reforzar", tipo: "practica" };
  switch (nivel) {
    case "avanzado":
      return { accion: "repasar", tipo: "tarjetas" };
    case "bueno":
      return { accion: "repasar", tipo: "practica" };
    case "basico":
      return { accion: "practicar", tipo: "practica" };
    case "apoyo":
      return { accion: "estudiar", tipo: "lectura" };
    default:
      return { accion: "explorar", tipo: "videos" };
  }
}

export function prioridadDe(nivel: NivelConocimiento): Prioridad {
  return nivel === "avanzado" || nivel === "bueno" ? "baja" : nivel === "basico" ? "media" : "alta";
}

/**
 * Arma la ruta de aprendizaje del alumno en una asignatura. Sin valoración de una unidad, se toma
 * como "Básico". Una unidad certificada deja de pedir temas; un tema dominado (≥ 80 %) también.
 * Quien se valoró "Avanzado" solo repasa los temas en los que le fue mal.
 */
export function rutaDeAprendizaje({
  asignatura,
  niveles,
  actividades,
  autoactividades,
}: {
  asignatura: Pick<Asignatura, "id" | "unidades">;
  niveles?: Record<string, NivelConocimiento>;
  actividades: ActividadParaRuta[];
  autoactividades: AutoactividadParaRuta[];
}): RutaAprendizaje {
  const propias = actividades.filter((a) => a.temario?.asignaturaId === asignatura.id);
  const unidades = asignatura.unidades.map((u, indice): UnidadRuta => {
    const nivelDeclarado = niveles?.[u.nombre];
    const nivel = nivelDeclarado ?? "basico";
    const deUnidad = propias.filter((a) => a.temario!.unidad === u.nombre);
    const certificaciones = deUnidad
      .filter((a) => a.temario!.certificacion)
      .map((a) => {
        const minimo = minimoCertificacion(a.temario!.certificacion!.minimo);
        return { id: a.id, titulo: a.titulo, minimo, porcentaje: a.porcentaje, lograda: a.porcentaje !== null && a.porcentaje >= minimo };
      });
    const certificada = certificaciones.some((c) => c.lograda);
    const autoDeUnidad = autoactividades.filter((x) => u.temas.some((t) => [t.nombre, ...t.subtemas].some((n) => coincideTema(x.tema, n))));

    const temas = u.temas.map((t): TemaRuta => {
      const nombres = [t.nombre, ...t.subtemas];
      // Actividades del profesor que eligieron este tema (o sus subtemas); sin temas elegidos, cubren la unidad.
      const delProfesor = deUnidad.filter((a) => !a.temario!.temas.length || a.temario!.temas.some((x) => nombres.includes(x)));
      const auto = autoactividades.filter((x) => nombres.some((n) => coincideTema(x.tema, n)));
      const notas = [
        ...delProfesor.map((a) => a.porcentaje).filter((p): p is number => p !== null),
        ...auto.filter((x) => x.estado === "completada" && typeof x.calificacion === "number").map((x) => x.calificacion!),
      ];
      const porcentaje = promedio(notas);
      const hecho = delProfesor.some((a) => a.entregada) || auto.length > 0;
      const estado: EstadoTema = porcentaje !== null && porcentaje >= DOMINIO ? "dominado" : hecho ? "en_progreso" : "pendiente";
      const { accion, tipo } = accionPara(nivel, porcentaje);
      const flojo = porcentaje !== null && porcentaje < REFUERZO;
      const recomendado = !certificada && estado !== "dominado" && (nivel !== "avanzado" || flojo);
      return { nombre: t.nombre, subtemas: t.subtemas, estado, porcentaje, recomendado, accion, tipo };
    });

    const iniciada = deUnidad.some((a) => a.entregada) || autoDeUnidad.length > 0;
    const estado: EstadoUnidad = certificada ? "certificada" : iniciada ? "en_progreso" : "sin_iniciar";
    return { indice, nombre: u.nombre, nivel: nivelDeclarado, estado, prioridad: prioridadDe(nivel), temas, certificaciones };
  });
  const certificadas = unidades.filter((u) => u.estado === "certificada").length;
  return {
    unidades,
    certificadas,
    completada: unidades.length > 0 && certificadas === unidades.length,
    pendientes: unidades.reduce((s, u) => s + u.temas.filter((t) => t.recomendado).length, 0),
  };
}

/** Respuestas válidas de la valoración: solo unidades que existen y niveles conocidos. */
export function limpiarNiveles(a: Pick<Asignatura, "unidades">, crudo: unknown): Record<string, NivelConocimiento> {
  const fuente = crudo && typeof crudo === "object" ? (crudo as Record<string, unknown>) : {};
  const niveles: Record<string, NivelConocimiento> = {};
  for (const u of a.unidades) {
    const v = fuente[u.nombre];
    if (esNivel(v)) niveles[u.nombre] = v;
  }
  return niveles;
}

/** Descripción breve de los temas de una unidad para la pregunta de la valoración. */
export function descripcionUnidad(u: Pick<Asignatura["unidades"][number], "nombre" | "temas">, max = 160): string {
  const temas = u.temas.map((t) => t.nombre.replace(/^\s*\d+(\.\d+)*[.)]?\s+/, "")).filter(Boolean);
  if (!temas.length) return u.nombre;
  let texto = "";
  for (const t of temas) {
    const siguiente = texto ? `${texto}, ${t}` : t;
    if (siguiente.length > max) return `${texto || t.slice(0, max)}…`;
    texto = siguiente;
  }
  return texto;
}

// ---------- Diagrama de espina de pescado ----------

/**
 * Colores de los nodos de la ruta. Se evitan el azul y el amarillo, que marcan el estado de la
 * unidad (certificada y en progreso).
 */
export const COLORES_RUTA = ["#8e3f96", "#2f7d7a", "#c0504d", "#5f7f2e", "#b23f68", "#6d48a6", "#c8611a", "#3f6a52", "#8a5a3c", "#9b3a8a"];
export const colorRuta = (i: number) => COLORES_RUTA[i % COLORES_RUTA.length];
export const AZUL_CERTIFICADA = "#2563eb";
export const AMARILLO_PROGRESO = "#facc15";

export interface NodoEspina {
  x: number;
  y: number;
}

export interface RamaEspina {
  unidad: number;
  tema: number;
  /** Punto en la espina de donde sale la rama. */
  desde: NodoEspina;
  nodo: NodoEspina;
  /** true si la rama va hacia arriba (la etiqueta va arriba del nodo). */
  arriba: boolean;
}

export interface AcomodoEspina {
  ancho: number;
  alto: number;
  /** Altura de la espina. */
  y: number;
  inicio: NodoEspina;
  fin: NodoEspina;
  unidades: NodoEspina[];
  ramas: RamaEspina[];
}

/**
 * Acomodo tipo espina de pescado: Inicio a la izquierda, las unidades sobre una línea horizontal y
 * Completado a la derecha. Los temas de cada unidad salen en diagonal, alternando arriba y abajo,
 * como las espinas. El ancho entre unidades crece con las ramas para que no se encimen.
 */
export function acomodoEspina(temasPorUnidad: number[], paso = 64): AcomodoEspina {
  const d = paso * Math.SQRT1_2; // avance en x y en y de cada tema sobre la diagonal
  const margenX = 70;
  const porLado = temasPorUnidad.map((n) => Math.ceil(n / 2));
  const maxLado = Math.max(1, ...porLado);
  const maxAbajo = Math.max(1, ...temasPorUnidad.map((n) => Math.floor(n / 2)));
  // Arriba y abajo se miden por separado: abajo suele haber una rama menos.
  const y = maxLado * d + 70;
  const alto = y + maxAbajo * d + 75;
  const unidades: NodoEspina[] = [];
  const ramas: RamaEspina[] = [];
  let x = margenX + 130; // de Inicio a la primera unidad
  temasPorUnidad.forEach((n, u) => {
    unidades.push({ x, y });
    // Las ramas salen un poco después del nodo de la unidad, una arriba y otra abajo.
    const salida = x + 36;
    for (let k = 0; k < n; k++) {
      const arriba = k % 2 === 0;
      const paso = Math.floor(k / 2) + 1;
      ramas.push({
        unidad: u,
        tema: k,
        arriba,
        desde: { x: salida, y },
        nodo: { x: salida + paso * d, y: arriba ? y - paso * d : y + paso * d },
      });
    }
    x += Math.max(180, 36 + porLado[u] * d + 140);
  });
  const fin = { x: x - 20, y };
  return { ancho: fin.x + margenX + 40, alto, y, inicio: { x: margenX, y }, fin, unidades, ramas };
}

/** Parte un nombre largo en renglones cortos para la etiqueta del diagrama (máximo `lineas`). */
export function renglones(texto: string, largo = 22, lineas = 2): string[] {
  const palabras = texto.trim().split(/\s+/);
  const r: string[] = [];
  let actual = "";
  for (const p of palabras) {
    if (!actual) actual = p;
    else if ((actual + " " + p).length <= largo) actual += " " + p;
    else {
      r.push(actual);
      actual = p;
    }
  }
  if (actual) r.push(actual);
  if (r.length <= lineas) return r.map((x) => (x.length > largo + 6 ? `${x.slice(0, largo + 5)}…` : x));
  const cortado = r.slice(0, lineas);
  const ultimo = cortado[lineas - 1];
  cortado[lineas - 1] = `${ultimo.length > largo - 1 ? ultimo.slice(0, largo - 1) : ultimo}…`;
  return cortado;
}
