import type es from "./es";

const archivados: typeof es = {
  archivar: "Archive class",
  desarchivar: "Unarchive",
  restaurar: "Restore",
  noSeArchivo: "The class could not be archived.",
  noSeRestauro: "The class could not be restored.",
  archivadoEl: "Archived on {fecha}",
  abrir: "Open",
  verArchivados1: "1 archived class",
  verArchivadosN: "{n} archived classes",
  profesor: {
    titulo: "Archived classes",
    texto:
      "Archived classes do not appear on your dashboard or when you create an activity. Their activities, submissions and grades are kept; unarchive them whenever you want.",
    ninguno: "You have no archived classes. Archive a class with the box icon on its card.",
  },
  alumno: {
    titulo: "Archived classes",
    texto: "They are only hidden from your view. Your submissions and grades do not change, and your teacher still sees them.",
  },
  conservacion: {
    actividades1: "1 activity",
    actividadesN: "{n} activities",
    proximo: "Next deletion: {fecha}",
    archivado: "Archived",
    sinCurso: "No class",
  },
};

export default archivados;
