// Cursos archivados (profesor y alumno) y agrupación por curso en "Conservación de la información".
const archivados = {
  archivar: "Archivar curso",
  desarchivar: "Desarchivar",
  restaurar: "Restaurar",
  noSeArchivo: "No se pudo archivar el curso.",
  noSeRestauro: "No se pudo restaurar el curso.",
  archivadoEl: "Archivado el {fecha}",
  abrir: "Abrir",
  verArchivados1: "1 curso archivado",
  verArchivadosN: "{n} cursos archivados",
  profesor: {
    titulo: "Cursos archivados",
    texto:
      "Los cursos que archivas no aparecen en tu panel ni al crear una actividad. Sus actividades, entregas y calificaciones se conservan; desarchívalos cuando quieras.",
    ninguno: "No tienes cursos archivados. Archiva un curso con el ícono de caja de su tarjeta.",
  },
  alumno: {
    titulo: "Cursos archivados",
    texto: "Solo los ocultas de tu vista. Tus entregas y calificaciones no cambian, y tu profesor los sigue viendo.",
  },
  conservacion: {
    actividades1: "1 actividad",
    actividadesN: "{n} actividades",
    proximo: "Próximo borrado: {fecha}",
    archivado: "Archivado",
    sinCurso: "Sin curso",
  },
};

export default archivados;
