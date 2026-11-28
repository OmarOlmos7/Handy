import type es from "./es";

const copiar: typeof es = {
  boton: "Copier l’élément",
  sufijo: "copie",
  elige: "Choisissez au moins une activité.",
  noSeCopio: "L’activité n’a pas pu être copiée.",
  noSeDuplico: "Le cours n’a pas pu être dupliqué.",
  cerrar: "Fermer",
  cancelar: "Annuler",
  actividad: {
    titulo: "Copier l’élément",
    texto: "La copie garde la feuille, la grille, la solution, les pièces jointes et les dates. Ni les remises ni les notes ne sont copiées.",
    mismo: "Dupliquer dans ce cours",
    mismoNota: "Elle s’appellera « {titulo} ».",
    otro: "Envoyer une copie à un autre cours",
    elegirCurso: "Choisissez le cours",
    sinOtros: "Vous n’avez pas d’autre cours actif.",
    copiar: "Copier",
    copiando: "Copie en cours…",
    lista: "Copie créée dans {curso}.",
    abrir: "Ouvrir la copie",
  },
  directorio: {
    titulo: "Copier des activités dans ce cours",
    texto: "Choisissez des activités de vos cours (archivés compris) et ajoutez-les à ce cours. Elles sont copiées sans remises ni notes.",
    buscar: "Rechercher une activité",
    archivado: "Archivé",
    sinActividades: "Aucune activité",
    ninguna: "Aucune activité ne correspond.",
    seleccionadas1: "1 activité sélectionnée",
    seleccionadasN: "{n} activités sélectionnées",
    agregar: "Ajouter à ce cours",
    agregando: "Ajout…",
    reactivos1: "1 question",
    reactivosN: "{n} questions",
    esteCurso: "Ce cours",
  },
  curso: {
    duplicar: "Dupliquer le cours",
    confirmar:
      "Dupliquer « {curso} » ? Une copie identique avec ses {n} activités et projets sera créée, mais vide : sans élèves, remises ni notes. Elle aura un nouveau code de cours.",
    confirmar0: "Dupliquer « {curso} » ? Une copie vide, sans élèves et avec un nouveau code de cours, sera créée.",
  },
};

export default copiar;
