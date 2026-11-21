// Fuentes de los PDF que arma pdf-lib (en el servidor y en el navegador). Helvetica solo trae
// letras latinas; si el texto lleva japonés o chino se incrusta una fuente CJK (solo los
// caracteres usados, para que el PDF siga pesando poco).
import type { PDFDocument, PDFFont } from "pdf-lib";

const CJK = /[⺀-鿿가-힯豈-﫿︰-﹏＀-￯]/;

/** ¿El texto lleva caracteres japoneses, chinos o coreanos? */
export const tieneCjk = (t: string) => CJK.test(t);

/** Helvetica (WinAnsi) solo escribe letras latinas y algunos signos; el resto se cambia por "?". */
export const latino = (t: string) => t.replace(/[^\x20-\x7e\xa0-\xff–—‘’‚“”„•…€™œŒšŠžŽŸ]/g, "?");

export interface FuentesPdf {
  normal: PDFFont;
  negrita: PDFFont;
  /** true si se incrustó la fuente CJK (no tiene negritas: normal y negrita son la misma). */
  cjk: boolean;
  /** Deja el texto en caracteres que la fuente puede escribir. */
  limpiar: (t: string) => string;
}

/**
 * Fuentes para un PDF. `textos` es lo que se va a escribir: si algo lleva japonés o chino y
 * `cargarCjk` devuelve la fuente, se usa esa; si no, Helvetica.
 */
export async function fuentesPdf(
  doc: PDFDocument,
  textos: string[],
  cargarCjk: () => Promise<Uint8Array | ArrayBuffer | null | undefined>,
): Promise<FuentesPdf> {
  if (textos.some(tieneCjk)) {
    const datos = await cargarCjk().catch(() => null);
    if (datos) {
      const fontkit = (await import("@pdf-lib/fontkit")).default;
      // En una colección (.ttc) se usa la primera fuente.
      doc.registerFontkit({
        create: (b: Uint8Array, nombre?: string) => {
          const f = fontkit.create(b, nombre) as unknown as { fonts?: unknown[] };
          return (f.fonts ? f.fonts[0] : f) as ReturnType<typeof fontkit.create>;
        },
      } as unknown as Parameters<PDFDocument["registerFontkit"]>[0]);
      const fuente = await doc.embedFont(datos, { subset: true });
      return { normal: fuente, negrita: fuente, cjk: true, limpiar: (t) => t.replace(/[\u0000-\u001f]/g, " ") };
    }
  }
  const { StandardFonts } = await import("pdf-lib");
  return {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    cjk: false,
    limpiar: latino,
  };
}

/**
 * Parte un texto en renglones que caben en `ancho`. Una palabra que no cabe sola (y el japonés
 * o chino, que no separa palabras con espacios) se parte por caracteres.
 */
export function renglones(fuente: PDFFont, texto: string, tam: number, ancho: number): string[] {
  const cabe = (t: string) => fuente.widthOfTextAtSize(t, tam) <= ancho;
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (cabe(prueba)) actual = prueba;
    else if (actual && cabe(palabra)) {
      lineas.push(actual);
      actual = palabra;
    } else {
      let resto = actual ? `${actual} ` : "";
      for (const ch of Array.from(palabra)) {
        if (!resto.trim() || cabe(resto + ch)) resto += ch;
        else {
          lineas.push(resto.trimEnd());
          resto = ch;
        }
      }
      actual = resto;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** En el navegador: pide la fuente CJK al servidor (solo si el PDF la necesita). */
export async function fuenteCjkDelServidor(): Promise<ArrayBuffer | null> {
  const r = await fetch("/api/fuente-cjk");
  return r.ok ? r.arrayBuffer() : null;
}
