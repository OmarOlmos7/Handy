// Modelo de datos de la plataforma. Cuando exista la API (FastAPI), estos
// tipos deben coincidir con los esquemas que devuelva el backend.

export type TipoReactivo =
  | "verdadero_falso"
  | "opcion_multiple"
  | "relacion_columnas"
  | "parentesis"
  | "desarrollo"
  | "abierto";

export type Confianza = "alta" | "media" | "baja";

/** Paso esperado dentro de un reactivo de desarrollo (datos, ecuación, resultado...). */
export interface PasoRubrica {
  nombre: string;
  /** Peso del paso dentro del reactivo, de 0 a 1. Los pesos de un reactivo suman 1. */
  peso: number;
}

export interface Reactivo {
  numero: number;
  tipo: TipoReactivo;
  enunciado: string;
  /** Respuesta correcta para reactivos cerrados, o resultado final para desarrollos. */
  respuesta: string;
  puntos: number;
  tema: string;
  habilidad: string;
  pagina: number;
  pasos?: PasoRubrica[];
  /** Líneas de la solución del profesor, una por paso (solo desarrollos). */
  solucionPasos?: string[];
}

export interface Alumno {
  matricula: string;
  nombre: string;
  correo: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  materia: string;
  ciclo: string;
  alumnos: Alumno[];
}

export type EstadoActividad =
  | "esperando_entregas"
  | "rubrica_pendiente"
  | "evaluando"
  | "en_revision"
  | "publicada";

export interface Actividad {
  id: string;
  grupoId: string;
  titulo: string;
  descripcion: string;
  fechaAplicacion: string; // ISO yyyy-mm-dd
  paginas: number;
  estado: EstadoActividad;
  reactivos: Reactivo[];
}

export interface ResultadoReactivo {
  numero: number;
  puntosObtenidos: number;
  /** Lo que la IA leyó en la hoja del alumno. */
  respuestaLeida: string;
  confianza: Confianza;
  comentario: string;
  /** Para desarrollos: fracción lograda de cada paso (0 a 1), en el orden de la rúbrica. */
  pasos?: number[];
}

export type EstadoEntrega = "sin_entregar" | "entregada" | "evaluada" | "aprobada";

export interface Entrega {
  actividadId: string;
  matricula: string;
  estado: EstadoEntrega;
  paginasRecibidas: number;
  resultados: ResultadoReactivo[];
  positivos: string[];
  mejoras: string[];
}
