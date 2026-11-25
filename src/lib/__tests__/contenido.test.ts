import { describe, expect, it, vi } from "vitest";
import { deflateRawSync } from "node:zlib";
import {
  MAX_BYTES_ARCHIVO,
  claseDeArchivo,
  extensionParaGuardar,
  laIALee,
  reactivoContenido,
  renglonesInstrucciones,
  revisarArchivos,
  tamanoLegible,
  unirEnUnReactivo,
} from "../contenido";
import { esEtiquetaContenido, iconoTipoActividad } from "../iconos-tipo";
import { creditosPlataforma, contestado } from "../plataforma";
import type { Actividad, Reactivo } from "../tipos";

vi.mock("server-only", () => ({}));

describe("archivos de una actividad de contenido", () => {
  it("reconoce la clase por extensión o por tipo MIME", () => {
    expect(claseDeArchivo("Leyes de Newton.PDF")).toBe("pdf");
    expect(claseDeArchivo("tarea.docx")).toBe("word");
    expect(claseDeArchivo("datos.xlsx")).toBe("excel");
    expect(claseDeArchivo("clase.pptx")).toBe("ppt");
    expect(claseDeArchivo("podcast.m4a")).toBe("audio");
    expect(claseDeArchivo("experimento.MOV")).toBe("video");
    expect(claseDeArchivo("foto.heic", "image/heic")).toBe("imagen");
    expect(claseDeArchivo("grabacion", "audio/webm")).toBe("audio");
    expect(claseDeArchivo("programa.exe")).toBeUndefined();
    expect(claseDeArchivo("viejo.doc")).toBeUndefined();
  });

  it("guarda con su extensión o la típica de su clase", () => {
    expect(extensionParaGuardar("a.webm", "video")).toBe("webm");
    expect(extensionParaGuardar("grabacion", "audio")).toBe("mp3");
  });

  it("la IA lee documentos e imágenes, no audio ni video", () => {
    expect(["pdf", "word", "excel", "ppt", "imagen"].every((c) => laIALee(c as never))).toBe(true);
    expect(laIALee("audio") || laIALee("video")).toBe(false);
  });

  it("revisa cantidad, tipo y tamaño", () => {
    const f = (name: string, size = 1000) => ({ name, size });
    expect(revisarArchivos([f("a.pdf"), f("b.mp4")], 5)).toBeUndefined();
    expect(revisarArchivos([f("a.pdf"), f("b.pdf")], 1)).toEqual({ error: "cantidad" });
    expect(revisarArchivos([f("virus.exe")], 5)).toEqual({ error: "tipo", nombre: "virus.exe" });
    expect(revisarArchivos([f("largo.mp4", MAX_BYTES_ARCHIVO + 1)], 5)).toEqual({ error: "tamano", nombre: "largo.mp4" });
    expect(revisarArchivos([f("a.mp4", 40 * 1024 * 1024), f("b.mp4", 40 * 1024 * 1024)], 5)).toEqual({ error: "total" });
  });

  it("muestra tamaños legibles", () => {
    expect(tamanoLegible(850 * 1024)).toBe("850 KB");
    expect(tamanoLegible(12.4 * 1024 * 1024)).toBe("12.4 MB");
  });
});

describe("instrucciones y reactivo", () => {
  it("separa las instrucciones en renglones sin viñetas", () => {
    expect(renglonesInstrucciones("1. Lee el PDF\n\n- Resuelve la página 3\n• Sube tu foto  ")).toEqual(["Lee el PDF", "Resuelve la página 3", "Sube tu foto"]);
  });

  it("con solución es un desarrollo; sin solución, una producción abierta, con los puntos de la escala", () => {
    const con = reactivoContenido("Leyes de Newton", ["Ve el video", "Explica"], 100, false);
    expect(con).toMatchObject({ numero: 1, tipo: "desarrollo", puntos: 100, enunciado: "Leyes de Newton\nVe el video\nExplica" });
    expect(reactivoContenido("Ensayo", ["Escribe"], 10, true)).toMatchObject({ tipo: "abierto", puntos: 10 });
  });

  it("une la rúbrica de varios reactivos en una sola tarea con pesos por puntos", () => {
    const base = reactivoContenido("Tarea", ["Haz"], 100, false);
    const nuevos = [
      { ...base, numero: 1, puntos: 3, respuesta: "9.8 m/s²", pasos: [{ nombre: "Datos", peso: 0.5 }, { nombre: "Resultado", peso: 0.5 }] },
      { ...base, numero: 2, puntos: 1, respuesta: "V", pasos: undefined, enunciado: "¿La masa es escalar?" },
    ] as Reactivo[];
    const uno = unirEnUnReactivo(base, nuevos);
    expect(uno.puntos).toBe(100);
    expect(uno.tipo).toBe("desarrollo");
    expect(uno.respuesta).toBe("1) 9.8 m/s²\n2) V");
    expect(uno.pasos?.map((p) => p.nombre)).toEqual(["Datos", "Resultado", "¿La masa es escalar?"]);
    expect(uno.pasos?.reduce((s, p) => s + p.peso, 0)).toBeCloseTo(1);
    expect(uno.pasos?.[2].peso).toBeCloseTo(0.25);
  });
});

describe("evidencia digital", () => {
  const act = { reactivos: [reactivoContenido("Ensayo", ["Escribe"], 100, true)], precision: undefined } as unknown as Actividad;
  it("una producción abierta con archivos cuenta como contestada", () => {
    expect(contestado(act.reactivos[0], { numero: 1, archivos: ["a.docx"] })).toBe(true);
    expect(contestado(act.reactivos[0], { numero: 1 })).toBe(false);
  });
  it("cobra las páginas que lee la IA (el audio y el video no cuentan)", () => {
    const soloVideo = creditosPlataforma(act, [{ numero: 1, archivos: ["v.mp4"], paginas: 0 }]);
    const pdf = creditosPlataforma(act, [{ numero: 1, archivos: ["a.pdf", "v.mp4"], paginas: 3 }]);
    const uno = creditosPlataforma(act, [{ numero: 1, archivos: ["a.docx"], paginas: 1 }]);
    expect(soloVideo).toBe(0);
    expect(pdf).toBeCloseTo(uno * 3);
  });
});

describe("íconos del tipo de actividad", () => {
  it("elige un ícono por palabra clave, también en tipos escritos por el profesor", () => {
    expect(iconoTipoActividad("Examen")).toBe("📝");
    expect(iconoTipoActividad("Examen Módulo")).toBe("🗂️");
    expect(iconoTipoActividad("Quiz")).toBe("❓");
    expect(iconoTipoActividad("Reto")).toBe("🏆");
    expect(iconoTipoActividad("Tarea")).toBe("🏠");
    expect(iconoTipoActividad("Video Actividad")).toBe("🎬");
    expect(iconoTipoActividad("Actividad")).toBe("✏️");
    expect(iconoTipoActividad("Ensayo")).toBe("🖋️");
    expect(iconoTipoActividad("Contenido")).toBe("📎");
    expect(iconoTipoActividad("Homework")).toBe("🏠");
    expect(iconoTipoActividad("Bitácora")).toBe("🏷️");
  });
  it("reconoce el tipo Contenido en los idiomas de la app", () => {
    expect(["Contenido", "content", "Contenu", "Conteúdo", "Inhalt", "コンテンツ", "内容"].every(esEtiquetaContenido)).toBe(true);
    expect(esEtiquetaContenido("Contenido extra")).toBe(false);
  });
});

/** ZIP mínimo (sin comprimir no; con deflate) con los archivos dados, como un .pptx. */
function zip(archivos: Record<string, string>): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const [nombre, texto] of Object.entries(archivos)) {
    const datos = deflateRawSync(Buffer.from(texto, "utf8"));
    const n = Buffer.from(nombre, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(Buffer.byteLength(texto), 22);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt32LE(Buffer.byteLength(texto), 24);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    locales.push(local, n, datos);
    centrales.push(central, n);
    desplazamiento += 30 + n.length + datos.length;
  }
  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(dir.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, dir, fin]);
}

describe("previsualización de documentos de Office", () => {
  it("lee las diapositivas de un PowerPoint", async () => {
    const { diapositivasDePptx, vistaComoTexto } = await import("../vista-archivo");
    const slide = (t: string[]) => `<p:sld><p:cSld><p:spTree>${t.map((x) => `<a:p><a:r><a:t>${x}</a:t></a:r></a:p>`).join("")}</p:spTree></p:cSld></p:sld>`;
    const pptx = zip({ "ppt/slides/slide1.xml": slide(["Leyes de Newton", "Inercia &amp; masa"]), "ppt/slides/slide2.xml": slide(["F = m·a"]) });
    const d = diapositivasDePptx(pptx);
    expect(d).toEqual([["Leyes de Newton", "Inercia & masa"], ["F = m·a"]]);
    expect(vistaComoTexto({ tipo: "diapositivas", diapositivas: d! })).toBe("Diapositiva 1:\nLeyes de Newton\nInercia & masa\n\nDiapositiva 2:\nF = m·a");
  });

  it("lee las hojas de un Excel con los resultados de las fórmulas", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const libro = new ExcelJS.Workbook();
    const h = libro.addWorksheet("Datos");
    h.addRow(["t (s)", "v (m/s)"]);
    h.addRow([1, 9.8]);
    h.getCell("C2").value = { formula: "B2*2", result: 19.6 };
    const datos = Buffer.from(await libro.xlsx.writeBuffer());
    const { vistaDeArchivo } = await import("../vista-archivo");
    const vista = await vistaDeArchivo(datos, "excel");
    expect(vista).toEqual({ tipo: "tabla", hojas: [{ nombre: "Datos", filas: [["t (s)", "v (m/s)", ""], ["1", "9.8", "19.6"]] }] });
  });

  it("no truena con un archivo dañado", async () => {
    const { vistaDeArchivo } = await import("../vista-archivo");
    expect(await vistaDeArchivo(Buffer.from("hola"), "ppt")).toBeUndefined();
    expect(await vistaDeArchivo(Buffer.from("hola"), "word")).toBeUndefined();
  });
});
