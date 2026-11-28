// Detección de rostros en el navegador del profesor (face-api, MIT). Los modelos se sirven desde
// /modelos-rostro (los copia scripts/modelos-rostro.mjs al compilar). La foto no sale del
// dispositivo: de cada rostro solo se obtiene su caja y su descriptor de 128 números.
import { partesDeFoto, sinRepetidos, type Caja } from "@/lib/rostros";

type FaceApi = typeof import("@vladmandic/face-api");

const MODELOS = "/modelos-rostro";
/** La foto se reduce a este lado mayor antes de buscar rostros (más rápido y suficiente). */
const LADO_MAXIMO = 2400;
/** Lado mínimo del recorte de cada rostro para calcular su descriptor. */
const LADO_RECORTE = 220;

let cargando: Promise<FaceApi> | null = null;

/** Carga la biblioteca y los tres modelos (detector, puntos del rostro y descriptor) una sola vez. */
export function cargarMotor(): Promise<FaceApi> {
  cargando ??= (async () => {
    const faceapi = (await import("@vladmandic/face-api")) as FaceApi;
    // Los tipos de la biblioteca no incluyen estas funciones de TensorFlow.js, que sí trae.
    const tf = faceapi.tf as unknown as { setBackend(nombre: string): Promise<boolean>; ready(): Promise<void> };
    if (!(await tf.setBackend("webgl").catch(() => false))) await tf.setBackend("cpu");
    await tf.ready();
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODELOS),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELOS),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELOS),
    ]);
    return faceapi;
  })().catch((e) => {
    cargando = null;
    throw e;
  });
  return cargando;
}

export interface RostroDetectado {
  /** Caja en coordenadas de la foto reducida (ancho × alto de `FotoPreparada`). */
  caja: Caja;
  certeza: number;
  descriptor: number[];
}

export interface FotoPreparada {
  /** Foto reducida como imagen (data URL) para mostrarla con los números encima. */
  url: string;
  ancho: number;
  alto: number;
  rostros: RostroDetectado[];
}

function lienzo(ancho: number, alto: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(ancho));
  c.height = Math.max(1, Math.round(alto));
  return c;
}

async function imagenDe(archivo: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // La imagen ya decodificada se puede dibujar aunque se libere la dirección.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Busca los rostros de la foto: la revisa entera y por partes (los rostros del fondo de un salón son
 * pequeños), quita los repetidos y calcula el descriptor de cada uno sobre un recorte ampliado.
 */
export async function analizarFoto(archivo: File, avance?: (fraccion: number) => void): Promise<FotoPreparada> {
  const faceapi = await cargarMotor();
  const img = await imagenDe(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const ancho = Math.round(img.naturalWidth * escala);
  const alto = Math.round(img.naturalHeight * escala);
  const foto = lienzo(ancho, alto);
  foto.getContext("2d")!.drawImage(img, 0, 0, ancho, alto);

  const opciones = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45, maxResults: 100 });
  const partes = partesDeFoto(ancho, alto);
  const hallados: { caja: Caja; certeza: number }[] = [];
  for (const [i, p] of partes.entries()) {
    const c = lienzo(p.ancho, p.alto);
    c.getContext("2d")!.drawImage(foto, p.x, p.y, p.ancho, p.alto, 0, 0, p.ancho, p.alto);
    const dets = await faceapi.detectAllFaces(c, opciones);
    for (const d of dets) {
      const b = d.box;
      // Rostros diminutos (menos de 14 px) no dan un descriptor confiable.
      if (b.width < 14 || b.height < 14) continue;
      hallados.push({ caja: { x: p.x + b.x, y: p.y + b.y, ancho: b.width, alto: b.height }, certeza: d.score });
    }
    avance?.((i + 1) / (partes.length * 2));
  }
  const unicos = sinRepetidos(hallados);

  const rostros: RostroDetectado[] = [];
  for (const [i, r] of unicos.entries()) {
    // Recorte con margen alrededor del rostro, ampliado para que el modelo vea detalle.
    const margen = Math.max(r.caja.ancho, r.caja.alto) * 0.45;
    const x = Math.max(0, r.caja.x - margen);
    const y = Math.max(0, r.caja.y - margen);
    const w = Math.min(ancho - x, r.caja.ancho + margen * 2);
    const h = Math.min(alto - y, r.caja.alto + margen * 2);
    const factor = Math.max(1, LADO_RECORTE / Math.max(w, h));
    const c = lienzo(w * factor, h * factor);
    c.getContext("2d")!.drawImage(foto, x, y, w, h, 0, 0, c.width, c.height);
    const d = await faceapi.detectSingleFace(c, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })).withFaceLandmarks().withFaceDescriptor();
    if (d) rostros.push({ caja: r.caja, certeza: r.certeza, descriptor: Array.from(d.descriptor) });
    avance?.(0.5 + (i + 1) / (unicos.length * 2));
  }
  avance?.(1);
  return { url: foto.toDataURL("image/jpeg", 0.85), ancho, alto, rostros };
}
