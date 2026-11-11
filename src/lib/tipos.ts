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
  /** Posición vertical aproximada del reactivo en su página (0 = arriba, 1 = abajo). */
  y?: number;
}

export interface Alumno {
  matricula: string;
  nombre: string;
  correo: string;
}

export interface Grupo {
  id: string;
  /** Profesor dueño del curso. */
  profesorId?: string;
  /** ID de curso que el profesor comparte con sus alumnos (ej. FIS-7K2Q). */
  codigo?: string;
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

export interface CriterioEvaluacion {
  nombre: string;
  /** Porcentaje de la calificación (0-100); 0 si el profesor no lo indicó. */
  porcentaje: number;
  descripcion: string;
}

export interface Actividad {
  id: string;
  /** true en las actividades de ejemplo (sin fotos reales; se dibujan en SVG). */
  demo?: boolean;
  /** Indicaciones del profesor para la IA. */
  instrucciones?: string;
  /** Imágenes de la solución del profesor (rutas relativas a la carpeta de datos). */
  solucion?: string[];
  rubricaConfirmada?: boolean;
  /** Criterios de evaluación con su porcentaje, tomados de las indicaciones del profesor. */
  criterios?: CriterioEvaluacion[];
  /** Recomendaciones del profesor a seguir al evaluar. */
  recomendaciones?: string[];
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
  /** Dónde está el reactivo en la hoja del alumno, para dibujar la marca. */
  /** x: posición horizontal de la respuesta (0 izquierda, 1 derecha). */
  ubicacion?: { pagina: number; y: number; x?: number };
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
  /** Fotos de las hojas del alumno, en orden (rutas relativas a la carpeta de datos). */
  imagenes?: string[];
  entregadaEn?: string;
  evaluadaEn?: string;
  /** Último error de evaluación, si lo hubo. */
  error?: string;
}

export interface Movimiento {
  profesorId?: string;
  fecha: string;
  concepto: string;
  cantidad: number;
}

export interface Profesor {
  id: string;
  nombre: string;
  correo: string;
  /** scrypt: "sal:hash" en hexadecimal. Nunca la contraseña en claro. */
  contrasena: string;
  creadoEn: string;
}

/** Sesión abierta. Se guarda solo el hash SHA-256 del token de la cookie. */
export interface Sesion {
  token: string;
  expira: string;
  /** Sesión de profesor. */
  profesorId?: string;
  /** Sesión de alumno: entra con ID de curso y matrícula, sin cuenta. */
  alumno?: { grupoId: string; matricula: string };
}

export interface BaseDeDatos {
  version: 1 | 2;
  profesores: Profesor[];
  sesiones: Sesion[];
  grupos: Grupo[];
  actividades: Actividad[];
  entregas: Entrega[];
  movimientos: Movimiento[];
}
