// Ícono pequeño de cada tipo de actividad (etiqueta) en los chips del alta y de la edición.
// Se elige por palabras clave, en los idiomas de la app, para que también sirva con los tipos
// que escribe el profesor ("Examen Módulo", "Video Actividad"…).

const REGLAS: [RegExp, string][] = [
  [/contenid|content|conte[uú]do|inhalt|コンテンツ|内容/i, "📎"],
  [/m[oó]dulo|module|modul|モジュール|模块/i, "🗂️"],
  [/examen|exam|prova|pr[uü]fung|試験|考试/i, "📝"],
  [/quiz|cuestionario|questionnaire|question[aá]rio|クイズ|小测|测验/i, "❓"],
  [/reto|desaf|challenge|d[eé]fi|herausforderung|チャレンジ|挑战/i, "🏆"],
  [/video|vid[eé]o|ビデオ|動画|视频/i, "🎬"],
  [/tarea|homework|devoir|tarefa|hausaufgabe|宿題|作业/i, "🏠"],
  [/ensayo|essay|dissertation|ensaio|aufsatz|作文|论文|小論文/i, "🖋️"],
  [/proyecto|project|projet|projeto|projekt|プロジェクト|项目/i, "🛠️"],
  [/pr[aá]ctica|laboratorio|lab|practice|pratique|pr[aá]tica|praktikum|実験|实验/i, "🔬"],
  [/lectura|reading|lecture|leitura|lesen|読|阅读/i, "📖"],
  [/exposici[oó]n|presentaci[oó]n|presentation|apresenta|vortrag|発表|演讲/i, "🎤"],
  [/participaci[oó]n|participation|participa|beteiligung|参加|参与/i, "🙋"],
  [/actividad|activity|activit[eé]|atividade|aktivit[aä]t|アクティビティ|活动/i, "✏️"],
];

/** Ícono del tipo de actividad; 🏷️ si no se reconoce. */
export function iconoTipoActividad(etiqueta: string): string {
  return REGLAS.find(([r]) => r.test(etiqueta))?.[1] ?? "🏷️";
}

/** true si la etiqueta es la de las actividades de contenido (en cualquier idioma de la app). */
export function esEtiquetaContenido(etiqueta: string): boolean {
  return /^\s*(contenido|content|contenu|conte[uú]do|inhalt|コンテンツ|内容)\s*$/i.test(etiqueta);
}
