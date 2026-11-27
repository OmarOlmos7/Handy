import type es from "./es";

const archivados: typeof es = {
  archivar: "Archiver le cours",
  desarchivar: "Désarchiver",
  quitar: "Retirer de mes cours",
  confirmarQuitar: "Retirer « {curso} » de vos cours ? Il n’apparaîtra plus dans votre vue. Votre professeur conserve vos remises et vos notes. Pour le revoir, saisissez à nouveau le code du cours.",
  noSeQuito: "Le cours n’a pas pu être retiré.",
  restaurar: "Restaurer",
  noSeArchivo: "Le cours n’a pas pu être archivé.",
  noSeRestauro: "Le cours n’a pas pu être restauré.",
  archivadoEl: "Archivé le {fecha}",
  abrir: "Ouvrir",
  verArchivados1: "1 cours archivé",
  verArchivadosN: "{n} cours archivés",
  profesor: {
    titulo: "Cours archivés",
    texto:
      "Les cours archivés n’apparaissent ni sur votre tableau de bord ni lors de la création d’une activité. Leurs activités, remises et notes sont conservées ; désarchivez-les quand vous voulez.",
    ninguno: "Vous n’avez aucun cours archivé. Archivez un cours avec l’icône de boîte de sa carte.",
  },
  alumno: {
    titulo: "Cours archivés",
    texto: "Ils sont seulement masqués de votre vue. Vos remises et vos notes ne changent pas, et votre professeur les voit toujours.",
  },
  conservacion: {
    actividades1: "1 activité",
    actividadesN: "{n} activités",
    proximo: "Prochaine suppression : {fecha}",
    archivado: "Archivé",
    sinCurso: "Sans cours",
  },
};

export default archivados;
