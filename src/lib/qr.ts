import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** URL pública de la app según la petición actual (o APP_URL si está definida). */
export async function urlBase() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function qrDataUrl(texto: string) {
  return QRCode.toDataURL(texto, { margin: 1, width: 320, errorCorrectionLevel: "M" });
}
