import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "设置",
  titulo: "设置",
  subtitulo: "你的登录信息和已归档课程。",
  cuentaTitulo: "我的账户",
  correo: "邮箱：{correo} · 学号：{matricula}",
  nombre: "姓名",
  claveActual: "当前访问密钥",
  claveNueva: "新访问密钥",
  claveConfirmar: "确认新密钥",
  guardar: "保存",
  notaClave: "如果只修改姓名，请将密钥留空。新密钥至少需要 {n} 个字符。",
  notaNombre: "你在各课程名单中的姓名由老师管理。",
  archivadosNinguno: "你没有已归档的课程。点击课程卡片上的盒子图标即可归档。",
  avisos: {
    nombreGuardado: "已保存你的姓名。",
    nombreYClave: "已保存你的姓名和新访问密钥。",
    escribeNombre: "请输入你的姓名（至少 3 个字）。",
    claveCorta: "新密钥至少需要 {n} 个字符。",
    noCoinciden: "两次输入的新密钥不一致。",
    actualIncorrecta: "当前访问密钥不正确。",
    cuentaNoExiste: "你的账户已不存在。",
  },
};

export default ajustesAlumno;
