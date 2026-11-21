// Texto de un documento de Word (.docx) sin dependencias: el .docx es un ZIP y el texto vive en
// word/document.xml. Las listas con viñetas o numeración conservan su nivel como sangría.
import { inflateRawSync } from "node:zlib";

/** Archivo dentro de un ZIP, o undefined si no está. */
function archivoDeZip(zip: Buffer, nombre: string): Buffer | undefined {
  // Fin del directorio central: firma 0x06054b50, en los últimos 64 KB.
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return undefined;
  const entradas = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  for (let k = 0; k < entradas && p + 46 <= zip.length; k++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) return undefined;
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const este = zip.subarray(p + 46, p + 46 + largoNombre).toString("utf8");
    if (este === nombre) {
      if (zip.readUInt32LE(local) !== 0x04034b50) return undefined;
      const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const datos = zip.subarray(inicio, inicio + comprimido);
      if (metodo === 0) return Buffer.from(datos);
      if (metodo === 8) return inflateRawSync(datos, { maxOutputLength: 20_000_000 });
      return undefined;
    }
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return undefined;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodificar(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTIDADES[e] ?? m;
  });
}

/** Texto plano del .docx, un párrafo por renglón; undefined si no es un Word válido. */
export function textoDeDocx(datos: Buffer): string | undefined {
  const xml = archivoDeZip(datos, "word/document.xml")?.toString("utf8");
  if (!xml) return undefined;
  const parrafos = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return parrafos
    .map((p) => {
      const nivel = p.match(/<w:ilvl w:val="(\d+)"/);
      const texto = decodificar(
        p
          .replace(/<w:tab\/>/g, " ")
          .replace(/<w:br\/>/g, " ")
          .replace(/<[^>]+>/g, ""),
      ).trim();
      if (!texto) return "";
      return nivel ? `${"    ".repeat(Number(nivel[1]))}- ${texto}` : texto;
    })
    .filter(Boolean)
    .join("\n");
}
