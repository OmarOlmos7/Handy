"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modificar } from "@/lib/almacen";
import { ESFUERZOS_PREDETERMINADOS, MOTORES, esEsfuerzo, esMotor, validarRangos } from "@/lib/configuracion";
import { hashContrasena, verificarContrasena } from "@/lib/cuentas";
import { requerirProfesor } from "@/lib/sesion";
import type { EsfuerzoIA, MotorIA } from "@/lib/tipos";

const RUTA = "/profesor/configuracion";

function volver(seccion: string, clave: "ok" | "error", texto: string): never {
  redirect(`${RUTA}?${clave}=${encodeURIComponent(texto)}&s=${seccion}#${seccion}`);
}

/** Cambia el nombre y, si se escribió, la contraseña (pide la actual). */
export async function guardarCuenta(form: FormData) {
  const yo = await requerirProfesor();
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 80);
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  if (!nombre) volver("cuenta", "error", "Escribe tu nombre.");
  if (nueva || confirmar) {
    if (nueva.length < 8) volver("cuenta", "error", "La nueva contraseña debe tener al menos 8 caracteres.");
    if (nueva !== confirmar) volver("cuenta", "error", "Las dos contraseñas nuevas no coinciden.");
  }
  const hashNueva = nueva ? hashContrasena(nueva) : undefined;
  const resultado = modificar((db) => {
    const p = db.profesores.find((x) => x.id === yo.id);
    if (!p) return "Tu cuenta ya no existe.";
    if (hashNueva) {
      if (!verificarContrasena(actual, p.contrasena)) return "La contraseña actual no es correcta.";
      p.contrasena = hashNueva;
    }
    p.nombre = nombre;
    return undefined;
  });
  if (resultado) volver("cuenta", "error", resultado);
  revalidatePath("/profesor", "layout");
  volver("cuenta", "ok", hashNueva ? "Guardamos tu nombre y tu nueva contraseña." : "Guardamos tu nombre.");
}

/** Límites de los niveles Bajo, Medio, Alto y Superior para los reportes. */
export async function guardarRangos(form: FormData) {
  const yo = await requerirProfesor();
  const rangos = validarRangos({
    medio: Number(form.get("medio")),
    alto: Number(form.get("alto")),
    superior: Number(form.get("superior")),
  });
  if (typeof rangos === "string") volver("rangos", "error", rangos);
  modificar((db) => {
    const p = db.profesores.find((x) => x.id === yo.id);
    if (p) p.config = { ...p.config, rangos };
  });
  revalidatePath("/profesor", "layout");
  volver("rangos", "ok", "Guardamos tus rangos de calificación.");
}

/** Motor predeterminado para las actividades nuevas y el esfuerzo de cada motor. */
export async function guardarPrecision(form: FormData) {
  const yo = await requerirProfesor();
  const motor = form.get("motor");
  if (!esMotor(motor)) volver("precision", "error", "Elige un nivel de precisión.");
  const esfuerzos = { ...ESFUERZOS_PREDETERMINADOS } as Record<MotorIA, EsfuerzoIA>;
  for (const m of MOTORES) {
    const e = form.get(`esfuerzo_${m}`);
    if (esEsfuerzo(e)) esfuerzos[m] = e;
  }
  modificar((db) => {
    const p = db.profesores.find((x) => x.id === yo.id);
    if (p) p.config = { ...p.config, motor, esfuerzos };
  });
  revalidatePath("/profesor", "layout");
  volver("precision", "ok", "Guardamos tu nivel de precisión.");
}
