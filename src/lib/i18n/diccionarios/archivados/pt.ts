import type es from "./es";

const archivados: typeof es = {
  archivar: "Arquivar curso",
  desarchivar: "Desarquivar",
  quitar: "Sair do curso",
  confirmarQuitar: "Sair de “{curso}”? Você sairá da lista do professor e suas entregas, notas e autoestudo deste curso serão excluídos. Não é possível desfazer.",
  noSeQuito: "Não foi possível sair do curso.",
  restaurar: "Restaurar",
  noSeArchivo: "Não foi possível arquivar o curso.",
  noSeRestauro: "Não foi possível restaurar o curso.",
  archivadoEl: "Arquivado em {fecha}",
  abrir: "Abrir",
  verArchivados1: "1 curso arquivado",
  verArchivadosN: "{n} cursos arquivados",
  profesor: {
    titulo: "Cursos arquivados",
    texto:
      "Os cursos arquivados não aparecem no seu painel nem ao criar uma atividade. As atividades, entregas e notas são mantidas; desarquive-os quando quiser.",
    ninguno: "Você não tem cursos arquivados. Arquive um curso com o ícone de caixa do cartão.",
  },
  alumno: {
    titulo: "Cursos arquivados",
    texto: "Eles só ficam ocultos na sua visualização. Suas entregas e notas não mudam, e seu professor continua vendo-os.",
  },
  conservacion: {
    actividades1: "1 atividade",
    actividadesN: "{n} atividades",
    proximo: "Próxima exclusão: {fecha}",
    archivado: "Arquivado",
    sinCurso: "Sem curso",
  },
};

export default archivados;
