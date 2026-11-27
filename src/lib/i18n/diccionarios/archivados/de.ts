import type es from "./es";

const archivados: typeof es = {
  archivar: "Kurs archivieren",
  desarchivar: "Wiederherstellen",
  quitar: "Kurs verlassen",
  confirmarQuitar: "„{curso}“ verlassen? Du wirst aus der Liste der Lehrkraft entfernt, und deine Abgaben, Noten und dein Selbststudium in diesem Kurs werden gelöscht. Das kann nicht rückgängig gemacht werden.",
  noSeQuito: "Du konntest den Kurs nicht verlassen.",
  restaurar: "Wiederherstellen",
  noSeArchivo: "Der Kurs konnte nicht archiviert werden.",
  noSeRestauro: "Der Kurs konnte nicht wiederhergestellt werden.",
  archivadoEl: "Archiviert am {fecha}",
  abrir: "Öffnen",
  verArchivados1: "1 archivierter Kurs",
  verArchivadosN: "{n} archivierte Kurse",
  profesor: {
    titulo: "Archivierte Kurse",
    texto:
      "Archivierte Kurse erscheinen weder in Ihrer Übersicht noch beim Erstellen einer Aktivität. Aktivitäten, Abgaben und Noten bleiben erhalten; Sie können sie jederzeit wiederherstellen.",
    ninguno: "Sie haben keine archivierten Kurse. Archivieren Sie einen Kurs mit dem Kistensymbol auf seiner Karte.",
  },
  alumno: {
    titulo: "Archivierte Kurse",
    texto: "Sie werden nur in deiner Ansicht ausgeblendet. Deine Abgaben und Noten ändern sich nicht, und deine Lehrkraft sieht sie weiterhin.",
  },
  conservacion: {
    actividades1: "1 Aktivität",
    actividadesN: "{n} Aktivitäten",
    proximo: "Nächste Löschung: {fecha}",
    archivado: "Archiviert",
    sinCurso: "Ohne Kurs",
  },
};

export default archivados;
