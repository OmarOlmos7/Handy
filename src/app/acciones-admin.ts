"use server";

import { redirect } from "next/navigation";
import { movimientoAjuste } from "@/lib/admin";
import { modificar } from "@/lib/almacen";
import { requerirAdmin } from "@/lib/sesion";

/** Suma o resta créditos a un profesor (cortesía, corrección o devolución). Solo administradores. */
export async function ajustarCreditos(form: FormData) {
  const admin = await requerirAdmin();
  const profesorId = String(form.get("profesor") ?? "");
  const cantidad = Math.trunc(Number(form.get("cantidad")));
  const motivo = String(form.get("motivo") ?? "");
  if (!Number.isFinite(cantidad) || cantidad === 0 || Math.abs(cantidad) > 100_000) {
    redirect(`/admin?aviso=${encodeURIComponent("Escribe una cantidad distinta de cero (usa negativo para restar).")}#creditos`);
  }
  const nombre = modificar((db) => {
    const p = db.profesores.find((x) => x.id === profesorId);
    if (!p) return undefined;
    db.movimientos.unshift(movimientoAjuste(profesorId, cantidad, `${motivo.trim() || "sin motivo"} (por ${admin.correo})`));
    return p.nombre;
  });
  const aviso = nombre ? `Se ${cantidad > 0 ? "sumaron" : "restaron"} ${Math.abs(cantidad)} créditos a ${nombre}.` : "No se encontró al profesor.";
  redirect(`/admin?aviso=${encodeURIComponent(aviso)}#creditos`);
}
