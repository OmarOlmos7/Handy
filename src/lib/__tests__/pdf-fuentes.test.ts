import fs from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fuentesPdf, latino, renglones, tieneCjk } from "../pdf-fuentes";

const FUENTES_CJK = ["/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"];
const rutaCjk = FUENTES_CJK.find((r) => fs.existsSync(r));

describe("fuentes de los PDF", () => {
  it("detecta japonés y chino", () => {
    expect(tieneCjk("フィードバック")).toBe(true);
    expect(tieneCjk("反馈报告")).toBe(true);
    expect(tieneCjk("Retroalimentación · Schüler · élève")).toBe(false);
  });

  it("deja las letras latinas y cambia el resto por ?", () => {
    expect(latino("Schüler/in · élève · œuvre")).toBe("Schüler/in · élève · œuvre");
    expect(latino("反馈")).toBe("??");
  });

  it("sin japonés ni chino usa Helvetica y no pide la fuente", async () => {
    const doc = await PDFDocument.create();
    let pedida = false;
    const f = await fuentesPdf(doc, ["Hola", "Note"], async () => {
      pedida = true;
      return null;
    });
    expect(f.cjk).toBe(false);
    expect(pedida).toBe(false);
  });

  it("si no hay fuente CJK, cae en Helvetica", async () => {
    const doc = await PDFDocument.create();
    const f = await fuentesPdf(doc, ["反馈报告"], async () => null);
    expect(f.cjk).toBe(false);
    expect(f.limpiar("反馈")).toBe("??");
  });

  it.skipIf(!rutaCjk)("incrusta la fuente CJK y parte el chino por caracteres", async () => {
    const doc = await PDFDocument.create();
    const f = await fuentesPdf(doc, ["反馈报告"], async () => new Uint8Array(fs.readFileSync(rutaCjk!)));
    expect(f.cjk).toBe(true);
    const texto = "你的作业已经批改完成，请查看每一道题的评语并在家练习推荐的习题。";
    const lineas = renglones(f.normal, texto, 10, 80);
    expect(lineas.length).toBeGreaterThan(2);
    expect(lineas.join("")).toBe(texto);
    for (const l of lineas) expect(f.normal.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(80);
    const p = doc.addPage();
    p.drawText(lineas[0], { x: 20, y: 700, size: 10, font: f.normal });
    expect((await doc.save()).length).toBeGreaterThan(1000);
  });
});

describe("renglones", () => {
  it("parte por palabras y respeta el ancho", async () => {
    const doc = await PDFDocument.create();
    const { normal } = await fuentesPdf(doc, ["a"], async () => null);
    const lineas = renglones(normal, "Paloma verde: respuesta correcta. Tache rojo: hay un error.", 10, 120);
    expect(lineas.length).toBeGreaterThan(1);
    expect(lineas.join(" ")).toBe("Paloma verde: respuesta correcta. Tache rojo: hay un error.");
  });
});
