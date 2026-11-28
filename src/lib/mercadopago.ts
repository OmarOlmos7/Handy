// Cobro con Mercado Pago Checkout Pro: se crea una preferencia con la llave de la licencia como
// referencia externa, el alumno paga en la página de Mercado Pago (tarjeta, OXXO, saldo o SPEI) y
// el webhook confirma consultando el pago a la API con el token del servidor.
// Variables: MP_ACCESS_TOKEN (obligatoria para cobrar) y MP_WEBHOOK_SECRET (firma del webhook).
import "server-only";
import crypto from "node:crypto";
import type { Licencia, CompraCreditos } from "./tipos";

const API = "https://api.mercadopago.com";

export function mercadoPagoConfigurado(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.MP_ACCESS_TOKEN);
}

/** Pago simulado para demostraciones (PAGOS_DEMO=1): nunca en un servidor con token real. */
export function pagosDemo(env: Record<string, string | undefined> = process.env): boolean {
  return env.PAGOS_DEMO === "1" && !env.MP_ACCESS_TOKEN;
}

export class ErrorMercadoPago extends Error {}

async function llamar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new ErrorMercadoPago("sinToken");
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new ErrorMercadoPago(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

/**
 * Crea la preferencia de pago y devuelve la URL a la que se manda al alumno. El título solo
 * nombra la licencia y la llave: nunca el nombre ni la matrícula del alumno.
 */
export async function crearPreferencia(licencia: Licencia, titulo: string, urlBase: string): Promise<string> {
  const volver = `${urlBase}/alumno/licencias/${encodeURIComponent(licencia.llave)}`;
  const r = await llamar<{ init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `pref-${licencia.llave}` },
    body: JSON.stringify({
      items: [{ id: licencia.tipo, title: titulo, quantity: 1, currency_id: "MXN", unit_price: licencia.precio }],
      external_reference: licencia.llave,
      notification_url: `${urlBase}/api/pagos/mercadopago`,
      back_urls: { success: volver, pending: volver, failure: volver },
      auto_return: "approved",
      statement_descriptor: "IEUREKA GRADER",
      // Una referencia de OXXO vence en 3 días; después se genera otra desde la plataforma.
      date_of_expiration: new Date(Date.now() + 3 * 864e5).toISOString(),
    }),
  });
  return r.init_point;
}

/** Preferencia de pago de un paquete de créditos del alumno (perfil CREAR). */
export async function crearPreferenciaCompra(compra: CompraCreditos, titulo: string, urlBase: string): Promise<string> {
  const volver = `${urlBase}/alumno/creditos/${encodeURIComponent(compra.llave)}`;
  const r = await llamar<{ init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `pref-${compra.llave}` },
    body: JSON.stringify({
      items: [{ id: `creditos-${compra.creditos}`, title: titulo, quantity: 1, currency_id: "MXN", unit_price: compra.precio }],
      external_reference: compra.llave,
      notification_url: `${urlBase}/api/pagos/mercadopago`,
      back_urls: { success: volver, pending: volver, failure: volver },
      auto_return: "approved",
      statement_descriptor: "IEUREKA GRADER",
      date_of_expiration: new Date(Date.now() + 3 * 864e5).toISOString(),
    }),
  });
  return r.init_point;
}

export interface PagoMP {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export function consultarPago(id: string): Promise<PagoMP> {
  if (!/^\d{1,20}$/.test(id)) throw new ErrorMercadoPago("idInvalido");
  return llamar<PagoMP>(`/v1/payments/${id}`);
}

/**
 * Revisa la firma x-signature del webhook ("ts=...,v1=..."): HMAC-SHA256 de
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con la clave secreta. Sin clave configurada
 * se acepta, porque el pago siempre se vuelve a consultar a la API antes de activar nada.
 */
export function firmaValida(firma: string | null, requestId: string | null, dataId: string, secreto: string | undefined): boolean {
  if (!secreto) return true;
  if (!firma) return false;
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  let plantilla = `id:${dataId.toLowerCase()};`;
  if (requestId) plantilla += `request-id:${requestId};`;
  plantilla += `ts:${partes.ts};`;
  const esperada = crypto.createHmac("sha256", secreto).update(plantilla).digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
