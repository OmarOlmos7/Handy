import { modificar } from "@/lib/almacen";
import { confirmarPago, ErrorDeLicencia } from "@/lib/licencias";
import { consultarPago, ErrorMercadoPago, firmaValida } from "@/lib/mercadopago";
import { confirmarCompra, esLlaveCompra } from "@/lib/perfil/bolsa";

// Webhook de Mercado Pago. Solo confía en lo que devuelve la API: con el id del aviso se consulta el
// pago con el token del servidor y se activa la licencia si está aprobado, en pesos, por el monto
// correcto y con una llave que existe. Repetir el aviso no duplica nada.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let cuerpo: { type?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  try {
    cuerpo = await req.json();
  } catch {
    // Algunos avisos llegan solo con parámetros en la URL.
  }
  const tipo = String(cuerpo.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const dataId = String(cuerpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  // Otros avisos (órdenes, contracargos) se reciben sin hacer nada.
  if (tipo !== "payment" || !dataId) return Response.json({ ok: true });
  if (!firmaValida(req.headers.get("x-signature"), req.headers.get("x-request-id"), dataId, process.env.MP_WEBHOOK_SECRET)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const pago = await consultarPago(dataId);
    if (pago.status !== "approved" || pago.currency_id !== "MXN" || !pago.external_reference) return Response.json({ ok: true });
    // Paquete de créditos del alumno (CRE-…): se abona a su bolsa.
    if (esLlaveCompra(pago.external_reference)) {
      const r = modificar((db) => confirmarCompra(db, pago.external_reference!, { proveedor: "mercadopago", pagoId: String(pago.id), monto: pago.transaction_amount }));
      if ("error" in r) console.error(`[pagos] aviso de Mercado Pago ${dataId} rechazado: ${r.error}`);
      return Response.json({ ok: !("error" in r) });
    }
    modificar((db) =>
      confirmarPago(db, pago.external_reference!, { proveedor: "mercadopago", pagoId: String(pago.id), monto: pago.transaction_amount }),
    );
    return Response.json({ ok: true });
  } catch (e) {
    // Llave o monto que no cuadran: se responde 200 para que no reintente; queda en el registro.
    if (e instanceof ErrorDeLicencia) {
      console.error(`[pagos] aviso de Mercado Pago ${dataId} rechazado: ${e.codigo}`);
      return Response.json({ ok: false });
    }
    // Falla de red con Mercado Pago: 500 para que reintente más tarde.
    if (e instanceof ErrorMercadoPago) return Response.json({ ok: false }, { status: 500 });
    throw e;
  }
}
