// Modelo de datos de la plataforma. Cuando exista la API (FastAPI), estos
// tipos deben coincidir con los esquemas que devuelva el backend.

export type TipoReactivo =
  | "verdadero_falso"
  | "opcion_multiple"
  | "relacion_columnas"
  | "parentesis"
  | "desarrollo"
  | "abierto"
  // Solo en actividades en plataforma (el alumno responde en la app):
  | "seleccion_multiple"
  | "numerica"
  | "si_no"
  | "orden"
  | "relacion_imagenes"
  | "seleccion_imagenes";

/**
 * Cómo responde el alumno: "manuscrita" (hoja impresa que entrega con fotos, lo de siempre) o
 * "plataforma" (responde los reactivos en su vista de la app, web o celular).
 */
export type FormatoActividad = "manuscrita" | "plataforma";

/** Imagen de un reactivo en plataforma (dibujo en SVG) con su descripción para la IA y la accesibilidad. */
export interface ImagenReactivo {
  svg: string;
  descripcion: string;
}

/**
 * Respuesta del alumno a un reactivo en plataforma. `seleccion`: letras elegidas (opción,
 * selección múltiple, imágenes), la secuencia elegida (orden), "V"/"F" o "Sí"/"No", o la letra
 * elegida para cada elemento de la columna A (relaciones). `texto`: respuesta escrita o numérica.
 * `archivos`: fotos o archivos del desarrollo (rutas relativas a la carpeta de datos).
 */
export interface RespuestaPlataforma {
  numero: number;
  texto?: string;
  seleccion?: string[];
  archivos?: string[];
  /**
   * Páginas que la IA revisa de los archivos (evidencia digital de una actividad de contenido:
   * un PDF cuenta sus páginas, un Word, Excel o PowerPoint cuenta uno, el audio y el video no
   * cuentan). Sin valor, una por archivo.
   */
  paginas?: number;
  /** Nombres originales de los archivos de evidencia digital, en el orden de `archivos`. */
  nombres?: string[];
}

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
  /** Imágenes con letra (a, b, c…) para relacionar o seleccionar (solo en plataforma). */
  imagenes?: ImagenReactivo[];
  /** Respuesta numérica: margen aceptado (±) en las mismas unidades; sin valor, 1 % del resultado. */
  tolerancia?: number;
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
  /** Código del curso (ej. FIS-3B7K): el profesor lo comparte y con él el alumno activa su licencia. */
  codigo?: string;
  nombre: string;
  materia: string;
  ciclo: string;
  /** Color de la tarjeta en el panel (clave de la paleta en lib/colores). */
  color?: string;
  alumnos: Alumno[];
  /** Ponderación de cada tipo de actividad para la nota final del curso. */
  planEvaluacion?: PlanEvaluacion;
  /**
   * Porcentaje de la nota final que aportan las actividades autoasignadas por los alumnos
   * (0 a 100). Sin valor, 0 %: no cuentan hasta que el profesor lo ajuste.
   */
  pesoAutoestudio?: number;
}

/** Peso de un tipo de actividad (etiqueta) en la nota final. "" es el de las actividades sin etiqueta. */
export interface PesoTipo {
  etiqueta: string;
  porcentaje: number;
}

/** Plan de evaluación del curso: porcentaje de cada tipo de actividad (suman 100). */
export interface PlanEvaluacion {
  /** Instrucciones que escribió el profesor (si el plan se generó con IA). */
  instrucciones?: string;
  pesos: PesoTipo[];
  /** Notas de la IA sobre cómo interpretó las instrucciones. */
  notas?: string;
  actualizadoEn: string;
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
  /**
   * Números de los reactivos a los que aplica (por ejemplo, un criterio del ejercicio 2 solo
   * califica el reactivo 2). Sin valor o vacío: aplica a todos los reactivos abiertos.
   */
  reactivos?: number[];
}

export type OrigenActividad = "ia" | "escaneada" | "contenido";

/** Clase de archivo que se anexa o entrega en una actividad de contenido. */
export type ClaseArchivo = "pdf" | "word" | "excel" | "ppt" | "audio" | "video" | "imagen";

/** Archivo que el profesor anexa a una actividad de contenido (se ve con el previsualizador). */
export interface AnexoContenido {
  /** Ruta relativa a la carpeta de datos. */
  ruta: string;
  /** Nombre original del archivo. */
  nombre: string;
  clase: ClaseArchivo;
  bytes: number;
}

/** Cómo entrega el alumno una actividad de contenido. */
export type EntregaContenido = "manuscrita" | "digital";

/**
 * Actividad de contenido: el profesor comparte material (PDF, Word, Excel, PowerPoint, audio o
 * video) con instrucciones, y el alumno entrega a mano (fotos) o con evidencia digital.
 */
export interface ContenidoActividad {
  anexos: AnexoContenido[];
  entrega: EntregaContenido;
}

/** Escala de calificación: sobre 100 (por defecto en actividades nuevas) o sobre 10. */
export type Escala = 10 | 100;

export interface Actividad {
  id: string;
  /** Escala en la que se muestran las calificaciones; sin valor, sobre 10 (actividades anteriores). */
  escala?: Escala;
  /** Color del renglón en la vista del curso (clave de la paleta en lib/colores). */
  color?: string;
  /** Etiqueta para agrupar: Tarea, Actividad, Quiz, Examen, Ensayo u otra que escriba el profesor. */
  etiqueta?: string;
  /** Unidad y temas del syllabus de la asignatura que cubre la actividad. */
  temario?: TemarioActividad;
  /** Cómo responde el alumno; sin valor, manuscrita (actividades anteriores). */
  formato?: FormatoActividad;
  /** Cómo se creó: generada con IA o cargada desde un escaneo del profesor. */
  origen?: OrigenActividad;
  /** Lo que pidió el profesor para generar la actividad con IA. */
  prompt?: string;
  /** Actividad de contenido: material anexo y tipo de entrega del alumno. */
  contenido?: ContenidoActividad;
  /** Instrucciones para el alumno que van impresas en la hoja. */
  instruccionesAlumno?: string[];
  /** Escaneo de la actividad en blanco (rutas relativas a la carpeta de datos). */
  archivos?: string[];
  /** Condiciones que dio el profesor para que la IA resolviera la actividad. */
  condicionesSolucion?: string;
  /** Versión anterior de la hoja, para deshacer la última edición con IA. */
  hojaAnterior?: { instruccionesAlumno?: string[]; criterios?: CriterioEvaluacion[]; reactivos: Reactivo[]; rubricaConfirmada?: boolean; versiones?: VersionActividad[] };
  /**
   * Versiones B, C… de la hoja (la A es la actividad misma): los mismos reactivos con otros
   * valores numéricos y su propia solución. Todas se califican con la misma rúbrica.
   */
  versiones?: VersionActividad[];
  /** true si la solución la generó la IA en lugar de escanearla. */
  solucionIA?: boolean;
  /** true en las actividades de ejemplo (sin fotos reales; se dibujan en SVG). */
  demo?: boolean;
  /** Indicaciones del profesor para la IA. */
  instrucciones?: string;
  /** Imágenes de la solución del profesor (rutas relativas a la carpeta de datos). */
  solucion?: string[];
  rubricaConfirmada?: boolean;
  /**
   * true si la actividad no requiere solución (ensayos, producciones escritas, análisis): se valora
   * la composición escrita (contenido, coherencia y elementos lingüísticos) con los criterios.
   */
  sinSolucion?: boolean;
  /**
   * true si la rúbrica es sin puntaje: solo se marcan aciertos y elementos a corregir, sin
   * calificación ni puntos (adecuado para producciones escritas).
   */
  sinPuntaje?: boolean;
  /**
   * Idioma de la actividad (código de la app: es, en, fr...): en él van la hoja, la rúbrica, la
   * retroalimentación y las recomendaciones. Sin valor (actividades anteriores), se detecta del texto.
   */
  idioma?: string;
  /** true si el profesor suspendió las entregas: el QR no recibe actividades hasta que las reanude. */
  entregasSuspendidas?: boolean;
  /**
   * Cómo se corrige sobre la hoja: "margen" (marca en el procedimiento y comentario al costado
   * derecho, lo predeterminado) o "subrayado" (subraya lo que hay que corregir y comenta encima,
   * ideal para producciones escritas).
   */
  estiloCorreccion?: EstiloCorreccion;
  /** Videos y lecturas (Khan Academy, YouTube, OpenStax) por tema, compartidos por todo el grupo. */
  recursos?: RecursosActividad;
  /** Motor y esfuerzo de la IA para esta actividad; sin valor, el predeterminado (Medio). */
  precision?: PrecisionIA;
  /** Criterios de evaluación con su porcentaje, tomados de las indicaciones del profesor. */
  criterios?: CriterioEvaluacion[];
  /** Recomendaciones del profesor a seguir al evaluar. */
  recomendaciones?: string[];
  grupoId: string;
  titulo: string;
  descripcion: string;
  fechaAplicacion: string; // ISO yyyy-mm-dd
  /** Desde cuándo ven los alumnos la actividad en su panel (ISO). Sin valor: desde que se crea. */
  visibleDesde?: string;
  /** Desde cuándo se reciben entregas (ISO). Sin valor: desde el alta. */
  envioDesde?: string;
  /** Hasta cuándo se reciben entregas (ISO). Sin valor: sin cierre. */
  envioHasta?: string;
  /** Desde cuándo ven los alumnos sus resultados (ISO). Sin valor: en cuanto el profesor los aprueba. */
  resultadosDesde?: string;
  paginas: number;
  estado: EstadoActividad;
  reactivos: Reactivo[];
}

export type EstiloCorreccion = "margen" | "subrayado";

/** Lo que cambia en un reactivo de otra versión: el texto impreso y su solución. */
export interface ReactivoVersion {
  numero: number;
  enunciado: string;
  opciones?: string[];
  columnaA?: string[];
  columnaB?: string[];
  ilustracion?: string;
  /** Respuesta correcta de esta versión (vacía hasta preparar la solución). */
  respuesta: string;
  solucionPasos?: string[];
}

export interface VersionActividad {
  /** Letra impresa en la hoja: B, C, D… */
  letra: string;
  reactivos: ReactivoVersion[];
  /**
   * Reactivos cuya solución no coincidió con una segunda resolución independiente: el profesor
   * debe revisarlos. "otra" es la respuesta de la segunda resolución.
   */
  revisar?: { numero: number; otra: string }[];
}

/** Fragmento subrayado en la hoja del alumno con su comentario (estilo "subrayado"). */
export interface Subrayado {
  pagina: number;
  /** Altura de la línea de texto (0 arriba, 1 abajo). */
  y: number;
  /** Inicio y fin del fragmento (0 izquierda, 1 derecha). */
  x0: number;
  x1: number;
  comentario: string;
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
  /** Para abiertos con criterios de la actividad: fracción lograda de cada criterio (0 a 1). */
  criterios?: number[];
  /** Fragmentos a corregir, subrayados sobre la hoja (estilo "subrayado"). */
  subrayados?: Subrayado[];
  /**
   * Dónde está en la hoja cada elemento de la rúbrica del reactivo (pasos o criterios), en el
   * mismo orden que `puntosPorElemento`: ahí se dibuja su numeral (1.1, 1.2…).
   */
  ubicacionesElementos?: UbicacionElemento[];
  /**
   * Reactivos cerrados con varios renglones (relación, paréntesis): dónde está cada respuesta del
   * alumno, en el orden de la clave. Ahí se dibuja la paloma o el tache con la letra correcta.
   */
  ubicacionesIncisos?: UbicacionInciso[];
}

/** Respuesta de un renglón; si se elige una palabra de un conjunto, también dónde está la correcta. */
export interface UbicacionInciso extends UbicacionElemento {
  xCorrecta?: number;
  yCorrecta?: number;
}

export interface UbicacionElemento {
  pagina: number;
  /** De 0 arriba a 1 abajo. */
  y: number;
  /** De 0 izquierda a 1 derecha. */
  x: number;
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
  /** Respuestas en la app (actividades en plataforma), una por reactivo contestado. */
  respuestas?: RespuestaPlataforma[];
  /** Versión de la hoja que respondió el alumno (A, B, C…); sin valor, la A. */
  version?: string;
  entregadaEn?: string;
  /** Hora de la primera entrega; los reenvíos de los primeros minutos la conservan. */
  primeraEntregaEn?: string;
  evaluadaEn?: string;
  /** Último error de evaluación, si lo hubo. */
  error?: string;
  /**
   * Calificación que el profesor escribió en el cuaderno, en la escala de la actividad.
   * Si existe, reemplaza a la calculada con los puntos de los reactivos.
   */
  calificacionManual?: number;
  /** Hora en que empezó la evaluación automática (mientras está en curso). */
  evaluandoDesde?: string;
  /** Recomendaciones de estudio: videos sugeridos y ejercicios de repaso con su respuesta. */
  estudio?: RecomendacionesEstudio;
  /** PDF corregido final (ruta relativa a la carpeta de datos); al archivarlo se borran las fotos. */
  pdf?: string;
  /** Cuándo se archivó la entrega (fotos borradas, queda solo el PDF). */
  archivadaEn?: string;
}

export interface VideoSugerido {
  titulo: string;
  /** Texto para buscar el video en YouTube (la IA no inventa enlaces). */
  busqueda: string;
}

export interface EjercicioRepaso {
  tema: string;
  enunciado: string;
  /** Solo la respuesta final, sin procedimiento. */
  respuesta: string;
}

/** Material de estudio con enlace real (lo encontró la búsqueda web; la IA no inventa enlaces). */
export interface RecursoEstudio {
  tipo: "khan" | "video" | "openstax";
  titulo: string;
  url: string;
  /** Canal, libro o sitio, por ejemplo "Khan Academy en Español" o "Cálculo volumen 1 · 3.3". */
  fuente: string;
}

export interface RecursosActividad {
  generadoEn: string;
  /** Por tema de la rúbrica. */
  temas: Record<string, RecursoEstudio[]>;
}

export interface RecomendacionesEstudio {
  temas: string[];
  videos: VideoSugerido[];
  ejercicios: EjercicioRepaso[];
  generadoEn: string;
}

export interface Movimiento {
  profesorId?: string;
  fecha: string;
  concepto: string;
  cantidad: number;
}

/** Tipo de usuario de una cuenta. El administrador es un profesor con correo en ADMIN_CORREOS. */
export type TipoUsuario = "alumno" | "profesor" | "administrador";

export interface Profesor {
  id: string;
  /** Profesor (editor de actividades) o administrador. */
  tipo: "profesor" | "administrador";
  nombre: string;
  correo: string;
  /** scrypt: "sal:hash" en hexadecimal. Nunca la contraseña en claro. */
  contrasena: string;
  creadoEn: string;
  /** Preferencias del profesor (rangos de calificación y precisión de la IA). */
  config?: ConfiguracionProfesor;
  /** Términos y avisos de privacidad aceptados al crear la cuenta. */
  aceptacion?: AceptacionLegal;
}

/** Versión de los textos legales que aceptó una cuenta y cuándo (ISO, UTC). */
export interface AceptacionLegal {
  version: string;
  fecha: string;
}

/** Motor de IA: Rápido (Haiku), Medio (Sonnet) o Preciso (Opus). */
export type MotorIA = "rapido" | "medio" | "preciso";
/** Esfuerzo de razonamiento del motor. */
export type EsfuerzoIA = "bajo" | "medio" | "alto";

export interface PrecisionIA {
  motor: MotorIA;
  esfuerzo: EsfuerzoIA;
}

/** Límite inferior (sobre 100) de cada nivel; Bajo va de 0 al límite de Medio. */
export interface RangosCalificacion {
  medio: number;
  alto: number;
  superior: number;
}

export interface ConfiguracionProfesor {
  rangos?: RangosCalificacion;
  /** Motor predeterminado para las actividades nuevas. */
  motor?: MotorIA;
  /** Esfuerzo elegido para cada motor. */
  esfuerzos?: Partial<Record<MotorIA, EsfuerzoIA>>;
  /** Idioma de la interfaz ("es", "en", "fr", "de", "ja", "pt" o "zh"). */
  idioma?: string;
  /** Versión del logo propio (fecha en que se subió); sin ella se usa el de iEureka-Grader. */
  logo?: string;
}

/** Cuenta del alumno: entra con su correo y su clave de acceso para ver solo sus resultados. */
export interface CuentaAlumno {
  id: string;
  tipo: "alumno";
  correo: string;
  nombre: string;
  matricula: string;
  /** scrypt: "sal:hash" en hexadecimal. */
  contrasena: string;
  creadoEn: string;
  /** Términos y avisos de privacidad aceptados al crear la cuenta. */
  aceptacion?: AceptacionLegal;
  /** Color que el alumno eligió para la tarjeta de cada curso (id del grupo → clave de la paleta). */
  colores?: Record<string, string>;
}

/** Sesión abierta. Se guarda solo el hash SHA-256 del token de la cookie. */
/** Enlace para recuperar la contraseña. Se guarda solo el hash SHA-256 del token del correo. */
export interface Recuperacion {
  hash: string;
  tipo: "profesor" | "alumno";
  cuentaId: string;
  vence: string;
}

export interface Sesion {
  token: string;
  expira: string;
  /** Sesión de profesor. */
  profesorId?: string;
  /** Sesión de alumno (cuenta con correo y clave de acceso). */
  alumnoId?: string;
}

/** Para qué se llamó a la IA (para el panel de administración). */
export type TipoConsumoIA =
  | "evaluacion"
  | "rubrica"
  | "generar"
  | "editar"
  | "resolver"
  | "estudio"
  | "recursos"
  | "plan"
  | "temario"
  | "relaciones"
  | "autoestudio"
  | "autoestudio_evaluar"
  | "instrucciones"
  | "proyecto_rubrica"
  | "proyecto_evaluar";

/** Tokens que gastó una llamada a la IA. No guarda textos ni datos del alumno. */
export interface ConsumoIA {
  fecha: string;
  tipo: TipoConsumoIA;
  profesorId?: string;
  actividadId?: string;
  modelo: string;
  entrada: number;
  salida: number;
  cacheLectura: number;
  cacheEscritura: number;
  /** false si la IA respondió pero la respuesta no sirvió (rechazo, incompleta o mal formada). */
  ok: boolean;
}

/** Tema de una unidad del temario, con sus subtemas. */
export interface TemaAsignatura {
  nombre: string;
  subtemas: string[];
}

export interface UnidadAsignatura {
  nombre: string;
  temas: TemaAsignatura[];
}

/** Syllabus de una asignatura del profesor: unidades, temas y subtemas. */
export interface Asignatura {
  id: string;
  profesorId: string;
  nombre: string;
  /** Nivel o grado (por ejemplo "2.º de secundaria"). */
  nivel?: string;
  unidades: UnidadAsignatura[];
  /** Cómo se cargó: archivo (PDF, Word o txt), texto pegado o generado con IA. */
  origen: "archivo" | "texto" | "ia";
  creadaEn: string;
  actualizadaEn: string;
  /** Temas o subtemas afines entre sí (para el mapa), por su clave "Unidad › Tema › Subtema". */
  relaciones?: RelacionTemario[];
}

export interface RelacionTemario {
  a: string;
  b: string;
  /** Por qué se relacionan, en pocas palabras. */
  motivo?: string;
}

/** Ruta de estudio que arma el alumno en el mapa del temario. */
export interface RutaAlumno {
  alumnoId: string;
  asignaturaId: string;
  /** Claves de los temas y subtemas, en el orden de la ruta. */
  nodos: string[];
  actualizadaEn: string;
}

/** Temas del syllabus que cubre una actividad. */
export interface TemarioActividad {
  asignaturaId: string;
  unidad: string;
  /** Temas y subtemas elegidos, con su texto. */
  temas: string[];
  /**
   * Si la actividad es el examen (o quiz) de certificación de la unidad: el alumno la certifica
   * cuando su calificación liberada llega al mínimo, en porcentaje.
   */
  certificacion?: { minimo: number };
}

/** Respuestas del alumno a "Mi nivel de conocimiento y uso de las herramientas de la unidad…". */
export type NivelConocimiento = "avanzado" | "bueno" | "basico" | "apoyo" | "sin_idea";

/** Valoración inicial que hace el alumno al empezar un curso: su nivel en cada unidad. */
export interface ValoracionInicial {
  alumnoId: string;
  grupoId: string;
  /** Matrícula con que el alumno aparece en el curso (para la vista del profesor). */
  matricula: string;
  asignaturaId: string;
  /** Nivel por nombre de unidad. */
  niveles: Record<string, NivelConocimiento>;
  creadaEn: string;
  actualizadaEn: string;
}

export interface BaseDeDatos {
  version: 1 | 2 | 3;
  profesores: Profesor[];
  cuentasAlumno: CuentaAlumno[];
  sesiones: Sesion[];
  /** Enlaces vigentes para recuperar la contraseña. */
  recuperaciones?: Recuperacion[];
  grupos: Grupo[];
  actividades: Actividad[];
  entregas: Entrega[];
  movimientos: Movimiento[];
  /** Consumo de tokens de la IA, el más reciente al final. */
  consumoIA?: ConsumoIA[];
  /** Asignaturas (syllabus) de los profesores. */
  asignaturas?: Asignatura[];
  /** Rutas de estudio de los alumnos en el mapa de cada asignatura. */
  rutas?: RutaAlumno[];
  /** Valoraciones iniciales de los alumnos (base de su ruta de aprendizaje). */
  valoraciones?: ValoracionInicial[];
  /** Tiempo que cada alumno tiene abierta cada actividad (para las analíticas de avance). */
  tiempos?: TiempoActividad[];
  /** Actividades que cada alumno se asignó a sí mismo (generadas con IA). */
  autoactividades?: Autoactividad[];
  /** Licencias de alumno por curso (ver lib/licencias). */
  licencias?: Licencia[];
  /** Proyectos (retos) por etapas con evaluación de varios profesores (ver lib/proyectos). */
  proyectos?: Proyecto[];
  /** Evidencias que entregan los alumnos o equipos en cada etapa de un proyecto. */
  entregasProyecto?: EntregaProyecto[];
  /** Evaluaciones de cada profesor evaluador, una por etapa y alumno o equipo. */
  evaluacionesProyecto?: EvaluacionProyecto[];
}

// ---------- Proyectos (retos) con evaluación de varios profesores ----------

/**
 * Tipo de evaluación de una etapa del proyecto: avance de reporte (documento), presentación oral
 * grupal, entrevista oral individual o demostración del proyecto.
 */
export type TipoEtapaProyecto = "reporte" | "oral_grupal" | "entrevista" | "demostracion";

/** Elemento de la rúbrica de una etapa, con la descripción de cada nivel de desempeño. */
export interface CriterioProyecto {
  id: string;
  nombre: string;
  descripcion: string;
  /** Peso del elemento en la calificación de la etapa (los de una etapa suman 100). */
  porcentaje: number;
  /** Qué se observa en cada nivel, del más alto al más bajo (ver NIVELES_RUBRICA en lib/proyectos). */
  niveles: string[];
}

/** Etapa (fase o avance) del proyecto, con su rúbrica y su peso en la calificación final. */
export interface EtapaProyecto {
  id: string;
  nombre: string;
  tipo: TipoEtapaProyecto;
  /** Qué debe hacer y entregar el alumno o el equipo. */
  instrucciones: string;
  /** Fecha de entrega o de presentación (ISO yyyy-mm-dd). */
  fecha?: string;
  /** Peso de la etapa en la calificación final del proyecto (las etapas suman 100). */
  peso: number;
  /** true si la etapa se evalúa por equipo (cada integrante recibe la calificación del equipo). */
  porEquipo: boolean;
  /** true si el alumno o el equipo sube evidencia (documento, presentación, audio o video). */
  conEvidencia: boolean;
  criterios: CriterioProyecto[];
  /** Cuándo se cerró la etapa: desde entonces el alumno ve su calificación y la retroalimentación. */
  cerradaEn?: string;
}

export interface EquipoProyecto {
  id: string;
  nombre: string;
  matriculas: string[];
}

export interface Proyecto {
  id: string;
  grupoId: string;
  /** Profesor dueño (el del curso): arma el modelo del proyecto y cierra las etapas. */
  profesorId: string;
  titulo: string;
  descripcion: string;
  /** Idioma del proyecto (rúbricas y textos de la IA). */
  idioma?: string;
  creadoEn: string;
  etapas: EtapaProyecto[];
  /** Otros profesores registrados que también evalúan (por su id); el dueño siempre evalúa. */
  evaluadores: string[];
  equipos: EquipoProyecto[];
}

/** Evidencia de una etapa: archivos del alumno o de su equipo. */
export interface EntregaProyecto {
  proyectoId: string;
  etapaId: string;
  /** Matrícula del alumno, o "equipo:<id>" si la etapa es por equipo. */
  sujeto: string;
  archivos: string[];
  nombres: string[];
  /** Matrícula de quien subió la evidencia. */
  matricula: string;
  entregadaEn: string;
  /** Páginas que leería la IA (un PDF sus páginas; Word, Excel, PowerPoint o imagen, una; audio y video, ninguna). */
  paginasIA?: number;
}

/** Calificación de un elemento de la rúbrica: puntaje de 0 a 100 y comentario del evaluador. */
export interface PuntajeCriterio {
  criterioId: string;
  /** 0 a 100; sin valor, el elemento no se ha calificado. */
  puntaje?: number;
  comentario: string;
}

/** Evaluación independiente de un profesor en una etapa, para un alumno o un equipo. */
export interface EvaluacionProyecto {
  proyectoId: string;
  etapaId: string;
  sujeto: string;
  evaluadorId: string;
  criterios: PuntajeCriterio[];
  /** Comentario general para el alumno. */
  comentario: string;
  /** Áreas de mejora, una por renglón. */
  mejoras: string[];
  /** true cuando el evaluador terminó: solo así cuenta en el promedio. */
  terminada: boolean;
  actualizadaEn: string;
}

// ---------- Licencias de alumno ----------

/** Duración de la licencia de un alumno en un curso. */
export type IdLicencia = "semanas5" | "semanas10" | "semestre" | "anual";

/**
 * Licencia de un alumno en un curso. La llave (IEG-XXXX-XXXX-XXXX) liga el pago al alumno y al
 * curso: viaja como referencia externa a la pasarela y vuelve en la confirmación del pago.
 */
export interface Licencia {
  llave: string;
  tipo: IdLicencia;
  alumnoId: string;
  grupoId: string;
  /** Código del curso con que el alumno se inscribió. */
  codigoCurso: string;
  /** Precio en MXN con IVA al crearla. */
  precio: number;
  semanas: number;
  /** Créditos de IA que abona al profesor del curso al pagarse. */
  creditosProfesor: number;
  estado: "pendiente" | "pagada" | "cancelada";
  creadaEn: string;
  pagadaEn?: string;
  /** Fin del acceso (ISO). */
  vence?: string;
  proveedor?: "mercadopago" | "demo" | "cortesia";
  /** Id del pago en la pasarela. */
  pagoId?: string;
}

// ---------- Actividades autoasignadas por el alumno ----------

/**
 * Tipos de actividad que el alumno puede pedirle a la IA:
 * - practica: ejercicios que se contestan en pantalla (cerrados, completar, relación y texto).
 * - manuscrita: ejercicios que resuelve a mano y sube en foto (o escritos en iPad/tableta).
 * - videos: videos de YouTube del tema y unas preguntas para comprobar lo aprendido.
 * - lectura: lectura del tema con resumen, conceptos, ecuaciones, ejemplos e ilustraciones,
 *   con fuentes de sitios educativos de alta reputación.
 * - tarjetas: tarjetas de estudio; el alumno escribe lo que recuerda y luego compara.
 */
export type TipoAutoactividad = "practica" | "manuscrita" | "videos" | "lectura" | "tarjetas";

export type TipoEjercicio =
  | "opcion"
  | "multirespuesta"
  | "verdadero_falso"
  | "completar"
  | "relacion"
  | "relacion_imagenes"
  | "texto"
  | "manuscrito"
  /** Solo el resultado numérico (lo califica el código, con tolerancia). */
  | "numerica"
  /** Resultado numérico en pantalla más la foto del procedimiento a mano. */
  | "numerica_desarrollo";

export interface EjercicioAuto {
  numero: number;
  tipo: TipoEjercicio;
  /** En "completar", cada espacio va marcado con ___ (tres guiones bajos). */
  enunciado: string;
  opciones?: string[];
  columnaA?: string[];
  columnaB?: string[];
  /** Dibujos con letra (a, b, c…) para relacionar con imágenes. */
  imagenes?: ImagenReactivo[];
  /** Dibujo de apoyo del enunciado (SVG). */
  ilustracion?: string;
  /**
   * Clave: letra ("b"), letras ("a, c"), "V"/"F", pares ("1-b, 2-a"), palabras de cada espacio
   * separadas por " | " (completar), la respuesta modelo (texto y manuscrito) o el resultado con
   * unidades (numérica y numérica con desarrollo).
   */
  respuesta: string;
  /** Margen aceptado (±) del resultado numérico; sin él, 1 % del resultado. */
  tolerancia?: number;
  /** Procedimiento modelo paso a paso (numérica con desarrollo); el alumno lo ve al terminar. */
  procedimiento?: string;
  /** Explicación breve que el alumno ve al terminar. */
  explicacion: string;
}

export interface TarjetaEstudio {
  /** Lo que se pide recordar ("¿Qué dice la segunda ley de Newton?"). */
  frente: string;
  /** La respuesta para comparar. */
  reverso: string;
  pista?: string;
}

export interface FuenteLectura {
  titulo: string;
  url: string;
  sitio: string;
}

export interface LecturaAuto {
  introduccion: string;
  /** Resumen en secciones cortas, cada una con su ilustración opcional (SVG). */
  secciones: { titulo: string; texto: string; ilustracion?: string; pie?: string }[];
  conceptos: { termino: string; definicion: string }[];
  ecuaciones: { formula: string; descripcion: string }[];
  ejemplos: { enunciado: string; solucion: string }[];
  /** Páginas de sitios educativos de alta reputación de donde sale el contenido. */
  fuentes: FuenteLectura[];
}

/** Lo que logró el alumno en un ejercicio o tarjeta (0 a 1) y lo que respondió. */
export interface ResultadoAuto {
  numero: number;
  logro: number;
  respuesta: string;
  comentario?: string;
}

export type EstadoAutoactividad = "pendiente" | "evaluando" | "completada";

export interface Autoactividad {
  id: string;
  /** Cuenta del alumno que la pidió. */
  alumnoId: string;
  grupoId: string;
  /** Matrícula con que el alumno aparece en el curso (para el cuaderno del profesor). */
  matricula: string;
  tipo: TipoAutoactividad;
  titulo: string;
  tema: string;
  /** Lo que escribió el alumno al pedirla (opcional). */
  peticion?: string;
  /** Idioma en que se generó. */
  idioma?: string;
  creadaEn: string;
  ejercicios?: EjercicioAuto[];
  tarjetas?: TarjetaEstudio[];
  lectura?: LecturaAuto;
  videos?: RecursoEstudio[];
  estado: EstadoAutoactividad;
  /** Sobre 100, calculada por código. */
  calificacion?: number;
  resultados?: ResultadoAuto[];
  /** Tiempo activo que tardó en resolverla. */
  segundos?: number;
  completadaEn?: string;
  /** Cómo se sintió al hacerla (opcional). */
  sentir?: string;
  /** Carita que eligió al terminar. */
  animo?: string;
  /** true si su comentario tiene señales de agresión, tristeza profunda, enojo o violencia. */
  alerta?: boolean;
  /** Fotos del desarrollo (ejercicios manuscritos), rutas relativas a la carpeta de datos. */
  archivos?: string[];
  /** Créditos que costó (generar y evaluar). */
  creditos?: number;
  error?: string;
}

/**
 * Tiempo que un alumno pasó con una actividad abierta (contestándola o revisando su
 * retroalimentación). Solo cuenta mientras la pestaña está visible y el alumno la usa.
 */
export interface TiempoActividad {
  actividadId: string;
  matricula: string;
  segundos: number;
  /** Segundos por hora del día (0-23, hora del centro de México). */
  porHora: number[];
  /** Segundos por día de la semana (0 domingo … 6 sábado). */
  porDia: number[];
  primeraVez: string;
  ultimaVez: string;
}
