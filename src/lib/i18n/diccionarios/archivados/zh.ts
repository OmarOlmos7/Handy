import type es from "./es";

const archivados: typeof es = {
  archivar: "归档课程",
  desarchivar: "取消归档",
  restaurar: "恢复",
  noSeArchivo: "无法归档该课程。",
  noSeRestauro: "无法恢复该课程。",
  archivadoEl: "归档于 {fecha}",
  abrir: "打开",
  verArchivados1: "1 门已归档课程",
  verArchivadosN: "{n} 门已归档课程",
  profesor: {
    titulo: "已归档课程",
    texto: "已归档的课程不会出现在你的面板中，也不会在创建作业时显示。其作业、提交和成绩都会保留；你可以随时取消归档。",
    ninguno: "你没有已归档的课程。点击课程卡片上的盒子图标即可归档。",
  },
  alumno: {
    titulo: "已归档课程",
    texto: "只是在你的视图中隐藏。你的提交和成绩不会改变，老师仍然可以看到。",
  },
  conservacion: {
    actividades1: "1 项作业",
    actividadesN: "{n} 项作业",
    proximo: "下次删除：{fecha}",
    archivado: "已归档",
    sinCurso: "无课程",
  },
};

export default archivados;
