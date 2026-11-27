"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { leer, modificar } from "@/lib/almacen";
import { grupoPorCodigo } from "@/lib/cuentas";
import { textos } from "@/lib/i18n/servidor";
import { confirmarPago, crearLicencia, ErrorDeLicencia, esIdLicencia, normalizarLlave } from "@/lib/licencias";
import { crearPreferencia, mercadoPagoConfigurado, pagosDemo } from "@/lib/mercadopago";
import { urlBase } from "@/lib/qr";
import { alumnoActual } from "@/lib/sesion";
import type { Licencia } from "@/lib/tipos";

function conError(codigo: string, tipo: string, error: string): never {
  const q = new URLSearchParams({ codigo, tipo, error });
  redirect(`/alumno/licencias?${q}`);
}

/**
 * El alumno escribe el código del curso y elige la duración: se crea (o se reutiliza) su licencia
 * pendiente con su llave y se le manda a pagar a Mercado Pago. Sin token configurado solo se puede
 * simular el pago en una demostración (PAGOS_DEMO=1).
 */
export async function iniciarLicencia(form: FormData) {
  const cuenta = await alumnoActual();
  if (!cuenta) redirect("/alumno");
  const codigo = String(form.get("codigo") ?? "").slice(0, 20);
  const tipo = String(form.get("tipo") ?? "");
  if (!esIdLicencia(tipo)) conError(codigo, tipo, "tipo");
  const db = await leer();
  const grupo = grupoPorCodigo(db, codigo);
  if (!grupo) conError(codigo, tipo, "codigo");
  const demo = pagosDemo();
  if (!mercadoPagoConfigurado() && !demo) conError(codigo, tipo, "sinPagos");

  let licencia: Licencia;
  try {
    licencia = modificar((d) => {
      const c = d.cuentasAlumno.find((x) => x.id === cuenta.id)!;
      const g = d.grupos.find((x) => x.id === grupo.id)!;
      return { ...crearLicencia(d, c, g, tipo) };
    });
  } catch (e) {
    if (e instanceof ErrorDeLicencia) conError(codigo, tipo, e.codigo);
    throw e;
  }
  if (demo) redirect(`/alumno/licencias/${licencia.llave}`);

  let destino: string;
  try {
    const { t } = await textos();
    // Solo la licencia y el curso: nunca el nombre ni la matrícula del alumno.
    const titulo = `iEureka-Grader · ${t.licencias.tipos[licencia.tipo].nombre} · ${grupo.materia} ${grupo.nombre}`.slice(0, 120);
    destino = await crearPreferencia(licencia, titulo, await urlBase());
  } catch (e) {
    console.error("[pagos] no se pudo crear la preferencia de Mercado Pago", e);
    conError(codigo, tipo, "pasarela");
  }
  redirect(destino);
}

/** Solo en demostraciones (PAGOS_DEMO=1 y sin token): aprueba el pago de una licencia propia. */
export async function simularPago(form: FormData) {
  const cuenta = await alumnoActual();
  if (!cuenta || !pagosDemo()) redirect("/alumno");
  const llave = normalizarLlave(String(form.get("llave") ?? ""));
  modificar((db) => {
    const l = (db.licencias ?? []).find((x) => x.llave === llave && x.alumnoId === cuenta.id);
    if (l) confirmarPago(db, llave, { proveedor: "demo", pagoId: `demo-${Date.now()}`, monto: l.precio });
  });
  revalidatePath("/alumno", "layout");
  redirect(`/alumno/licencias/${llave}`);
}
