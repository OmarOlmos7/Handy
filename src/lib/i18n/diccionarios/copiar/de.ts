import type es from "./es";

const copiar: typeof es = {
  boton: "Element kopieren",
  sufijo: "Kopie",
  elige: "Wähle mindestens eine Aktivität.",
  noSeCopio: "Die Aktivität konnte nicht kopiert werden.",
  noSeDuplico: "Der Kurs konnte nicht dupliziert werden.",
  cerrar: "Schließen",
  cancelar: "Abbrechen",
  actividad: {
    titulo: "Element kopieren",
    texto: "Die Kopie übernimmt Blatt, Bewertungsraster, Lösung, Anhänge und Termine. Abgaben und Noten werden nicht kopiert.",
    mismo: "In diesem Kurs duplizieren",
    mismoNota: "Sie heißt „{titulo}“.",
    otro: "Eine Kopie an einen anderen Kurs senden",
    elegirCurso: "Kurs wählen",
    sinOtros: "Du hast keine anderen aktiven Kurse.",
    copiar: "Kopieren",
    copiando: "Wird kopiert…",
    lista: "Kopie in {curso} erstellt.",
    abrir: "Kopie öffnen",
  },
  directorio: {
    titulo: "Aktivitäten in diesen Kurs kopieren",
    texto: "Wähle Aktivitäten aus deinen Kursen (auch archivierten) und füge sie diesem Kurs hinzu. Sie werden ohne Abgaben und Noten kopiert.",
    buscar: "Aktivität suchen",
    archivado: "Archiviert",
    sinActividades: "Keine Aktivitäten",
    ninguna: "Keine passenden Aktivitäten.",
    seleccionadas1: "1 Aktivität ausgewählt",
    seleccionadasN: "{n} Aktivitäten ausgewählt",
    agregar: "Zu diesem Kurs hinzufügen",
    agregando: "Wird hinzugefügt…",
    reactivos1: "1 Aufgabe",
    reactivosN: "{n} Aufgaben",
    esteCurso: "Dieser Kurs",
  },
  curso: {
    duplicar: "Kurs duplizieren",
    confirmar:
      "„{curso}“ duplizieren? Es wird eine identische Kopie mit ihren {n} Aktivitäten und Projekten erstellt, aber leer: ohne Lernende, Abgaben und Noten. Sie erhält einen neuen Kurscode.",
    confirmar0: "„{curso}“ duplizieren? Es wird eine leere Kopie ohne Lernende und mit neuem Kurscode erstellt.",
  },
};

export default copiar;
