import type es from "./es";

const copiar: typeof es = {
  boton: "Copy item",
  sufijo: "copy",
  elige: "Choose at least one activity.",
  noSeCopio: "The activity could not be copied.",
  noSeDuplico: "The class could not be duplicated.",
  cerrar: "Close",
  cancelar: "Cancel",
  actividad: {
    icono: "Duplicate or send to another class",
    titulo: "Copy item",
    texto: "The copy keeps the sheet, rubric, solution, attachments and dates. Submissions and grades are not copied.",
    mismo: "Duplicate in this class",
    mismoNota: "It will be called “{titulo}”.",
    otro: "Send a copy to another class",
    elegirCurso: "Choose the class",
    sinOtros: "You have no other active classes.",
    copiar: "Copy",
    copiando: "Copying…",
    lista: "Copy created in {curso}.",
    abrir: "Open the copy",
  },
  directorio: {
    boton: "Duplicate activity",
    titulo: "Copy activities to this class",
    texto: "Choose activities from your classes (archived ones too) and add them to this class. They are copied without submissions or grades.",
    buscar: "Search activity",
    archivado: "Archived",
    sinActividades: "No activities",
    ninguna: "No matching activities.",
    seleccionadas1: "1 activity selected",
    seleccionadasN: "{n} activities selected",
    agregar: "Add to this class",
    agregando: "Adding…",
    reactivos1: "1 item",
    reactivosN: "{n} items",
    esteCurso: "This class",
  },
  curso: {
    duplicar: "Duplicate class",
    confirmar:
      "Duplicate “{curso}”? An identical copy with its {n} activities and projects will be created, but empty: no students, submissions or grades. It will get a new class code.",
    confirmar0: "Duplicate “{curso}”? An empty copy with no students and a new class code will be created.",
  },
};

export default copiar;
