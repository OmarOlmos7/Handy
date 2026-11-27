import type es from "./es";

const archivados: typeof es = {
  archivar: "コースをアーカイブ",
  desarchivar: "アーカイブ解除",
  restaurar: "元に戻す",
  noSeArchivo: "コースをアーカイブできませんでした。",
  noSeRestauro: "コースを元に戻せませんでした。",
  archivadoEl: "{fecha} にアーカイブ",
  abrir: "開く",
  verArchivados1: "アーカイブ済みのコース 1 件",
  verArchivadosN: "アーカイブ済みのコース {n} 件",
  profesor: {
    titulo: "アーカイブ済みのコース",
    texto:
      "アーカイブしたコースはダッシュボードや課題作成画面に表示されません。課題・提出物・成績は保持されます。いつでもアーカイブを解除できます。",
    ninguno: "アーカイブ済みのコースはありません。カードの箱アイコンでコースをアーカイブできます。",
  },
  alumno: {
    titulo: "アーカイブ済みのコース",
    texto: "あなたの画面で非表示になるだけです。提出物や成績は変わらず、先生には引き続き表示されます。",
  },
  conservacion: {
    actividades1: "課題 1 件",
    actividadesN: "課題 {n} 件",
    proximo: "次の削除日: {fecha}",
    archivado: "アーカイブ済み",
    sinCurso: "コースなし",
  },
};

export default archivados;
