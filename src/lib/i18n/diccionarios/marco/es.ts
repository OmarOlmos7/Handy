// Marco de la app a pantalla completa (encabezado fijo, franja izquierda y contenido central),
// línea de tiempo del curso y envío del código del curso por correo.
// Los demás idiomas tienen la misma forma.

const marco = {
  menu: {
    abrir: "Abrir menú",
    cerrar: "Cerrar menú",
    secciones: "Secciones",
    plegar: "Ocultar la franja izquierda",
    desplegar: "Mostrar la franja izquierda",
  },
  curso: {
    titulo: "Este curso",
    vistas: "Vistas del curso",
    crear: "Crear",
    alumnos: "Lista de alumnos",
    volver: "Ir al curso",
  },
  lineaTiempo: {
    titulo: "Línea de tiempo del curso",
    subtitulo: "Unidades del temario repartidas del {inicio} al {fin}. Oscuras: ya debieron cubrirse. Claras: siguen en fila.",
    unidad: "Unidad {n}",
    cubierta: "Ya debió cubrirse",
    enCurso: "En curso hoy",
    pendiente: "En fila",
    transcurrido: "{p} % del curso transcurrido",
    avance: "Avance del grupo: {p} %",
    sinActividades: "Sin actividades ligadas",
    sinFechas: "Pon las fechas de inicio y término del curso con el engrane para repartir las unidades en el tiempo.",
    sinTemario: "Este curso aún no tiene temario. Crea o liga una asignatura con sus unidades para ver la línea de tiempo.",
    irAsignaturas: "Ir a Asignaturas",
    verAvance: "Ver avance del temario",
  },
  enviarCodigo: {
    titulo: "Código del curso y pago de membresía",
    texto: "Envía a cada alumno, por correo y de forma individual, el código ID del curso con el que paga su membresía (licencia) y queda inscrito.",
    todos: "Seleccionar todos",
    seleccionados: "{n} de {total} seleccionados",
    enviar: "Enviar código por correo",
    enviando: "Enviando…",
    elige: "Elige al menos un alumno con correo.",
    sinCorreo: "Sin correo",
    enviado: "Enviado el {fecha}",
    sinSmtp: "El correo del servidor no está configurado: los correos no saldrán hasta que se configure (SMTP).",
    resultado: "Correos enviados: {e}.",
    fallidos: "No se pudieron enviar: {n}.",
    sinCorreoN: "Sin correo registrado: {n}.",
    noConfigurado: "No se envió nada porque el correo del servidor no está configurado.",
    error: "No se pudo enviar. Intenta de nuevo.",
    asunto: "Tu código para el curso {curso}",
    cuerpo:
      "Hola, {nombre}:\n\nTu profesor(a) {profesor} te inscribió en el curso {curso}.\n\nCódigo ID del curso: {codigo}\n\nCon este código pagas tu membresía (licencia) y quedas inscrito:\n1. Entra a {url}\n2. Crea tu cuenta o inicia sesión con este correo.\n3. Escribe el código, elige la duración y paga.\n\nSi tienes dudas, pregúntale a tu profesor(a).\n\niEureka-Grader",
  },
  unidades: {
    titulo: "Actividades por unidad",
    pista: "Da clic en una unidad de la línea de tiempo para ver solo sus actividades.",
    verTodas: "Ver todas las unidades",
    verUnidad: "Ver las actividades de «{nombre}»",
    mostrando: "Unidad {n}: {nombre}",
    sinUnidad: "Sin unidad del temario",
    actividades1: "1 actividad",
    actividadesN: "{n} actividades",
    vacia: "Aún no hay actividades en esta unidad. Al crear una actividad, elige esta unidad en el selector de temario.",
    unidad: "Unidad {n}",
  },
};

export default marco;
