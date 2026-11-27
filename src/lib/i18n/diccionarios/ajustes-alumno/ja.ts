import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "設定",
  titulo: "設定",
  subtitulo: "ログイン情報とアーカイブ済みのコース。",
  cuentaTitulo: "マイアカウント",
  correo: "メール: {correo} · 学籍番号: {matricula}",
  nombre: "名前",
  claveActual: "現在のアクセスキー",
  claveNueva: "新しいアクセスキー",
  claveConfirmar: "新しいキーの確認",
  guardar: "保存",
  notaClave: "名前だけを変更する場合はキー欄を空のままにしてください。新しいキーは {n} 文字以上必要です。",
  notaNombre: "各コースの名簿上の名前は先生が管理します。",
  archivadosNinguno: "アーカイブ済みのコースはありません。カードの箱アイコンでアーカイブできます。",
  avisos: {
    nombreGuardado: "名前を保存しました。",
    nombreYClave: "名前と新しいアクセスキーを保存しました。",
    escribeNombre: "名前を入力してください（3文字以上）。",
    claveCorta: "新しいキーは {n} 文字以上必要です。",
    noCoinciden: "2つの新しいキーが一致しません。",
    actualIncorrecta: "現在のアクセスキーが正しくありません。",
    cuentaNoExiste: "アカウントが存在しません。",
  },
};

export default ajustesAlumno;
