import type es from "./es";

const copiar: typeof es = {
  boton: "Copiar item",
  sufijo: "cópia",
  elige: "Escolha pelo menos uma atividade.",
  noSeCopio: "Não foi possível copiar a atividade.",
  noSeDuplico: "Não foi possível duplicar o curso.",
  cerrar: "Fechar",
  cancelar: "Cancelar",
  actividad: {
    icono: "Duplicar ou enviar para outro curso",
    titulo: "Copiar item",
    texto: "A cópia leva a folha, a rubrica, a solução, os anexos e as datas. Não leva entregas nem notas.",
    mismo: "Duplicar neste curso",
    mismoNota: "Vai se chamar “{titulo}”.",
    otro: "Enviar uma cópia para outro curso",
    elegirCurso: "Escolha o curso",
    sinOtros: "Você não tem outros cursos ativos.",
    copiar: "Copiar",
    copiando: "Copiando…",
    lista: "Cópia criada em {curso}.",
    abrir: "Abrir a cópia",
  },
  directorio: {
    boton: "Duplicar atividade",
    titulo: "Copiar atividades para este curso",
    texto: "Escolha atividades dos seus cursos (também dos arquivados) e adicione-as a este curso. São copiadas sem entregas nem notas.",
    buscar: "Buscar atividade",
    archivado: "Arquivado",
    sinActividades: "Sem atividades",
    ninguna: "Nenhuma atividade corresponde.",
    seleccionadas1: "1 atividade selecionada",
    seleccionadasN: "{n} atividades selecionadas",
    agregar: "Adicionar a este curso",
    agregando: "Adicionando…",
    reactivos1: "1 questão",
    reactivosN: "{n} questões",
    esteCurso: "Este curso",
  },
  curso: {
    duplicar: "Duplicar curso",
    confirmar:
      "Duplicar “{curso}”? Será criada uma cópia idêntica com suas {n} atividades e projetos, mas vazia: sem alunos, entregas nem notas. Terá um novo código de curso.",
    confirmar0: "Duplicar “{curso}”? Será criada uma cópia vazia, sem alunos e com um novo código de curso.",
  },
};

export default copiar;
