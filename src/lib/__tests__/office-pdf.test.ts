import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));
const datos = fs.mkdtempSync(path.join(os.tmpdir(), "office-pdf-prueba-"));
process.env.DATA_DIR = datos;

const { convertirAPdf, filtroPdf, rutaVistaPdf, vistaPdfGuardada } = await import("../office-pdf");

const hayLibreOffice = (() => {
  try {
    execFileSync(process.env.SOFFICE_RUTA || "soffice", ["--version"], { stdio: "ignore", timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
})();

/** Un .xlsx mínimo con formato, hecho con exceljs. */
async function libroDePrueba() {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Mediciones");
  hoja.addRow(["Intento", "Tiempo (s)"]).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.addRow([1, 0.45]);
  hoja.addRow([2, 0.55]);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe("vista en PDF de documentos de Office", () => {
  it("elige el filtro de exportación según el tipo", () => {
    expect(filtroPdf("word")).toBe("pdf:writer_pdf_Export");
    expect(filtroPdf("ppt")).toBe("pdf:impress_pdf_Export");
    // Cada hoja de Excel en una sola página, como se ve en pantalla.
    expect(filtroPdf("excel")).toContain("SinglePageSheets");
  });

  it("guarda la vista junto al original", () => {
    expect(rutaVistaPdf("actividades/a1/anexos/1.docx")).toBe("actividades/a1/anexos/1.docx.vista.pdf");
  });

  it("no convierte lo que no es de Office", async () => {
    await expect(convertirAPdf(Buffer.from("x"), "pdf")).rejects.toThrow();
  });

  it("si la conversión está apagada, falla y el visor usa la vista de texto", async () => {
    process.env.OFFICE_PDF = "0";
    try {
      await expect(convertirAPdf(await libroDePrueba(), "excel")).rejects.toThrow(/no disponible/);
    } finally {
      delete process.env.OFFICE_PDF;
    }
  });

  it.skipIf(!hayLibreOffice)(
    "convierte con LibreOffice y reutiliza el PDF guardado",
    async () => {
      const relativa = "actividades/a1/anexos/1.xlsx";
      fs.mkdirSync(path.join(datos, "actividades/a1/anexos"), { recursive: true });
      fs.writeFileSync(path.join(datos, relativa), await libroDePrueba());
      const pdf = await vistaPdfGuardada(relativa, "excel");
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      const cache = path.join(datos, rutaVistaPdf(relativa));
      expect(fs.existsSync(cache)).toBe(true);
      // La segunda vez sale del archivo guardado, sin volver a convertir.
      const antes = fs.statSync(cache).mtimeMs;
      await vistaPdfGuardada(relativa, "excel");
      expect(fs.statSync(cache).mtimeMs).toBe(antes);
    },
    120_000,
  );
});
