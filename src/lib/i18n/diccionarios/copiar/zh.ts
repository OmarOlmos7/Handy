import type es from "./es";

const copiar: typeof es = {
  boton: "复制项目",
  sufijo: "副本",
  elige: "请至少选择一项活动。",
  noSeCopio: "无法复制该活动。",
  noSeDuplico: "无法复制该课程。",
  cerrar: "关闭",
  cancelar: "取消",
  actividad: {
    titulo: "复制项目",
    texto: "副本包含作业单、评分规则、答案、附件和日期，不包含提交和成绩。",
    mismo: "在本课程中复制",
    mismoNota: "名称将为“{titulo}”。",
    otro: "发送副本到其他课程",
    elegirCurso: "选择课程",
    sinOtros: "你没有其他进行中的课程。",
    copiar: "复制",
    copiando: "正在复制…",
    lista: "已在 {curso} 中创建副本。",
    abrir: "打开副本",
  },
  directorio: {
    titulo: "将活动复制到本课程",
    texto: "从你的课程（包括已归档课程）中选择活动并添加到本课程。复制时不包含提交和成绩。",
    buscar: "搜索活动",
    archivado: "已归档",
    sinActividades: "没有活动",
    ninguna: "没有匹配的活动。",
    seleccionadas1: "已选择 1 项活动",
    seleccionadasN: "已选择 {n} 项活动",
    agregar: "添加到本课程",
    agregando: "正在添加…",
    reactivos1: "1 道题",
    reactivosN: "{n} 道题",
    esteCurso: "本课程",
  },
  curso: {
    duplicar: "复制课程",
    confirmar: "复制“{curso}”？将创建一个包含其 {n} 项活动和项目的相同课程，但为空：没有学生、提交和成绩。它将获得新的课程代码。",
    confirmar0: "复制“{curso}”？将创建一个没有学生、带有新课程代码的空课程。",
  },
};

export default copiar;
