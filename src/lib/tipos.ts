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
  /** Opciones impresas (opción múltiple), por ejemplo "a) 9.8 m/s²". */
  opciones?: string[];
  /** Columnas impresas para relación de columnas o paréntesis. */
  columnaA?: string[];
  columnaB?: string[];
  /** Renglones de espacio para responder (desarrollo y abiertos). */
  lineas?: number;
  /** Dibujo esquemático en SVG que ilustra el ejercicio (se muestra a la derecha del texto). */
  ilustracion?: string;
  /** Dónde va el dibujo: a la derecha del texto (por defecto) o abajo, más grande (gráficas). */
  ubicacionIlustracion?: "derecha" | "abajo";
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
  /** Código interno del curso (ya no se muestra; los alumnos entran con correo y clave). */
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

export type OrigenActividad = "ia" | "escaneada";

/** Escala de calificación: sobre 100 (por defecto en actividades nuevas) o sobre 10. */
export type Escala = 10 | 100;

export interface Actividad {
  id: string;
  /** Escala en la que se muestran las calificaciones; sin valor, sobre 10 (actividades anteriores). */
  escala?: Escala;
  /** Cómo se creó: generada con IA o cargada desde un escaneo del profesor. */
  origen?: OrigenActividad;
  /** Lo que pidió el profesor para generar la actividad con IA. */
  prompt?: string;
  /** Instrucciones para el alumno que van impresas en la hoja. */
  instruccionesAlumno?: string[];
  /** Escaneo de la actividad en blanco (rutas relativas a la carpeta de datos). */
  archivos?: string[];
  /** Condiciones que dio el profesor para que la IA resolviera la actividad. */
  condicionesSolucion?: string;
  /** Versión anterior de la hoja, para deshacer la última edición con IA. */
  hojaAnterior?: { instruccionesAlumno?: string[]; criterios?: CriterioEvaluacion[]; reactivos: Reactivo[]; rubricaConfirmada?: boolean };
  /** true si la solución la generó la IA en lugar de escanearla. */
  solucionIA?: boolean;
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
  /** Hora en que empezó la evaluación automática (mientras está en curso). */
  evaluandoDesde?: string;
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

/** Cuenta del alumno: entra con su correo y su clave de acceso para ver solo sus resultados. */
export interface CuentaAlumno {
  id: string;
  correo: string;
  nombre: string;
  matricula: string;
  /** scrypt: "sal:hash" en hexadecimal. */
  contrasena: string;
  creadoEn: string;
}

/** Sesión abierta. Se guarda solo el hash SHA-256 del token de la cookie. */
export interface Sesion {
  token: string;
  expira: string;
  /** Sesión de profesor. */
  profesorId?: string;
  /** Sesión de alumno (cuenta con correo y clave de acceso). */
  alumnoId?: string;
}

export interface BaseDeDatos {
  version: 1 | 2 | 3;
  profesores: Profesor[];
  cuentasAlumno: CuentaAlumno[];
  sesiones: Sesion[];
  grupos: Grupo[];
  actividades: Actividad[];
  entregas: Entrega[];
  movimientos: Movimiento[];
}
