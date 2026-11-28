// "Copiar elemento" (actividades a cualquier curso) y "Duplicar curso" (copia vacía, sin alumnos).
const copiar = {
  boton: "Copiar elemento",
  sufijo: "copia",
  elige: "Elige al menos una actividad.",
  noSeCopio: "No se pudo copiar la actividad.",
  noSeDuplico: "No se pudo duplicar el curso.",
  cerrar: "Cerrar",
  cancelar: "Cancelar",
  // Resumen de la actividad: duplicarla aquí o mandar una copia a otro curso.
  actividad: {
    titulo: "Copiar elemento",
    texto: "La copia lleva la hoja, la rúbrica, la solución, los anexos y las fechas. No lleva entregas ni calificaciones.",
    mismo: "Duplicar en este curso",
    mismoNota: "Se llamará «{titulo}».",
    otro: "Enviar una copia a otro curso",
    elegirCurso: "Elige el curso",
    sinOtros: "No tienes otros cursos activos.",
    copiar: "Copiar",
    copiando: "Copiando…",
    lista: "Copia creada en {curso}.",
    abrir: "Abrir la copia",
  },
  // Vista del curso: directorio de actividades de los demás cursos para traerlas aquí.
  directorio: {
    titulo: "Copiar actividades a este curso",
    texto: "Elige actividades de tus cursos (también de los archivados) y agrégalas a la lista de este curso. Se copian sin entregas ni calificaciones.",
    buscar: "Buscar actividad",
    archivado: "Archivado",
    sinActividades: "Sin actividades",
    ninguna: "No hay actividades que coincidan.",
    seleccionadas1: "1 actividad seleccionada",
    seleccionadasN: "{n} actividades seleccionadas",
    agregar: "Agregar a este curso",
    agregando: "Agregando…",
    reactivos1: "1 reactivo",
    reactivosN: "{n} reactivos",
    esteCurso: "Este curso",
  },
  // Tarjeta del curso en el panel.
  curso: {
    duplicar: "Duplicar curso",
    confirmar:
      "¿Duplicar «{curso}»? Se creará una copia idéntica con sus {n} actividades y proyectos, pero vacía: sin alumnos, sin entregas y sin calificaciones. Tendrá un código de curso nuevo.",
    confirmar0: "¿Duplicar «{curso}»? Se creará una copia vacía, sin alumnos, con un código de curso nuevo.",
  },
};

export default copiar;
