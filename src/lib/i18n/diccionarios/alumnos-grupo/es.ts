// Lista de alumnos de un curso: altas, cambios y bajas que hace el profesor.
// Los demás idiomas tienen la misma forma.

const alumnosGrupo = {
  boton: "Lista de alumnos",
  enlaceEditar: "Altas, bajas y cambios de alumnos",
  meta: "Lista de alumnos",
  titulo: "Lista de alumnos",
  subtitulo: "Da de alta, cambia datos o da de baja a los alumnos del curso.",
  alta: {
    titulo: "Dar de alta un alumno",
    matricula: "Matrícula",
    nombre: "Nombre completo",
    correo: "Correo (opcional)",
    agregar: "Dar de alta",
    nota: "Con correo, el alumno ve sus resultados al crear su cuenta con ese mismo correo. Sin correo, se liga por su matrícula.",
    hecha: "{nombre} quedó dado de alta.",
  },
  lista: {
    titulo: "Pegar una lista",
    ayuda: "Una línea por alumno: matrícula, nombre completo y correo (opcional). Puedes pegar directo desde Excel.",
    agregar: "Agregar lista",
    hecha: "Alumnos agregados: {n}.",
    fallidas: "Líneas sin agregar: {l}.",
  },
  tabla: {
    alumno: "Alumno",
    matricula: "Matrícula",
    correo: "Correo",
    cuenta: "Cuenta",
    conCuenta: "Con cuenta",
    sinCuenta: "Sin cuenta",
    entregas: "Entregas",
    acciones: "Acciones",
    vacio: "Aún no hay alumnos. Dalos de alta aquí o se suman solos al entregar su primera actividad.",
    sinResultados: "Ningún alumno coincide con la búsqueda.",
    buscar: "Buscar por nombre, matrícula o correo",
  },
  cambiar: "Cambiar datos",
  guardar: "Guardar",
  cancelar: "Cancelar",
  guardado: "Cambios guardados.",
  avisoMatricula: "Si cambias la matrícula, sus entregas y calificaciones pasan a la nueva.",
  baja: "Dar de baja",
  bajaHecha: "{nombre} fue dado de baja.",
  confirmarBaja:
    "¿Dar de baja a {nombre} ({m})? Sale de la lista del curso y se borran sus {e} entregas y {a} actividades de autoestudio en este curso, con sus calificaciones. Su cuenta y sus otros cursos no cambian. No se puede deshacer.",
  confirmarBajaSinTrabajo: "¿Dar de baja a {nombre} ({m})? Sale de la lista del curso. Su cuenta y sus otros cursos no cambian.",
  enActividad: {
    boton: "Altas, bajas y cambios de alumnos",
    ocultar: "Ocultar lista de alumnos",
    ayuda: "Los cambios aplican a todo el curso, no solo a esta actividad.",
    verLista: "Abrir la lista completa",
  },
  errores: {
    matricula: "La matrícula debe tener de 3 a 20 letras, números o guiones.",
    nombre: "Escribe el nombre completo (3 letras o más).",
    correo: "El correo no es válido.",
    matriculaRepetida: "Ya hay un alumno con esa matrícula en el curso.",
    correoRepetido: "Ya hay un alumno con ese correo en el curso.",
    noEncontrado: "No se encontró el alumno o el curso.",
    general: "No se pudo guardar. Intenta de nuevo.",
  },
};

export default alumnosGrupo;
