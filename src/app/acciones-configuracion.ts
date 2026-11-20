"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { modificar } from "@/lib/almacen";
import { ESCALA, ESFUERZOS_PREDETERMINADOS, validarRangos } from "@/lib/configuracion";
import { hashContrasena, verificarContrasena } from "@/lib/cuentas";
import { requerirProfesor } from "@/lib/sesion";
import type { EsfuerzoIA, MotorIA } from "@/lib/tipos";

const RUTA = "/profesor/configuracion";

/** Vuelve a la sección con el aviso; el texto es una clave de configuracion.avisos del diccionario. */
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
  if (!nombre) volver("cuenta", "error", "escribeNombre");
  if (nueva || confirmar) {
    if (nueva.length < 8) volver("cuenta", "error", "contrasenaCorta");
    if (nueva !== confirmar) volver("cuenta", "error", "noCoinciden");
  }
  const hashNueva = nueva ? hashContrasena(nueva) : undefined;
  const resultado = modificar((db) => {
    const p = db.profesores.find((x) => x.id === yo.id);
    if (!p) return "cuentaNoExiste";
    if (hashNueva) {
      if (!verificarContrasena(actual, p.contrasena)) return "actualIncorrecta";
      p.contrasena = hashNueva;
    }
    p.nombre = nombre;
    return undefined;
  });
  if (resultado) volver("cuenta", "error", resultado);
  revalidatePath("/profesor", "layout");
  volver("cuenta", "ok", hashNueva ? "nombreYContrasena" : "nombreGuardado");
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
  volver("rangos", "ok", "rangosGuardados");
}

/** Punto predeterminado de la escala de precisión para las actividades nuevas (motor y esfuerzo). */
export async function guardarPrecision(form: FormData) {
  const yo = await requerirProfesor();
  const punto = ESCALA.find((e) => e.clave === form.get("punto"));
  if (!punto) volver("precision", "error", "eligePrecision");
  const { motor } = punto.precision;
  const esfuerzos = { ...ESFUERZOS_PREDETERMINADOS, [motor]: punto.precision.esfuerzo } as Record<MotorIA, EsfuerzoIA>;
  modificar((db) => {
    const p = db.profesores.find((x) => x.id === yo.id);
    if (p) p.config = { ...p.config, motor, esfuerzos };
  });
  revalidatePath("/profesor", "layout");
  volver("precision", "ok", "precisionGuardada");
}
