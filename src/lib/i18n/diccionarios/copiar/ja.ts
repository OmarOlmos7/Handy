import type es from "./es";

const copiar: typeof es = {
  boton: "項目をコピー",
  sufijo: "コピー",
  elige: "アクティビティを1つ以上選んでください。",
  noSeCopio: "アクティビティをコピーできませんでした。",
  noSeDuplico: "コースを複製できませんでした。",
  cerrar: "閉じる",
  cancelar: "キャンセル",
  actividad: {
    titulo: "項目をコピー",
    texto: "シート、ルーブリック、解答、添付ファイル、日付をコピーします。提出物と成績はコピーされません。",
    mismo: "このコースで複製",
    mismoNota: "名前は「{titulo}」になります。",
    otro: "別のコースにコピーを送る",
    elegirCurso: "コースを選択",
    sinOtros: "ほかに有効なコースがありません。",
    copiar: "コピー",
    copiando: "コピー中…",
    lista: "{curso} にコピーを作成しました。",
    abrir: "コピーを開く",
  },
  directorio: {
    titulo: "このコースにアクティビティをコピー",
    texto: "自分のコース（アーカイブ済みも含む）からアクティビティを選び、このコースに追加します。提出物と成績なしでコピーされます。",
    buscar: "アクティビティを検索",
    archivado: "アーカイブ済み",
    sinActividades: "アクティビティなし",
    ninguna: "一致するアクティビティがありません。",
    seleccionadas1: "1件選択中",
    seleccionadasN: "{n}件選択中",
    agregar: "このコースに追加",
    agregando: "追加中…",
    reactivos1: "1問",
    reactivosN: "{n}問",
    esteCurso: "このコース",
  },
  curso: {
    duplicar: "コースを複製",
    confirmar:
      "「{curso}」を複製しますか？{n}件のアクティビティとプロジェクトを含む同じコースを作成しますが、生徒・提出物・成績は含まれません。新しいコースコードが付きます。",
    confirmar0: "「{curso}」を複製しますか？生徒のいない空のコースを新しいコースコードで作成します。",
  },
};

export default copiar;
