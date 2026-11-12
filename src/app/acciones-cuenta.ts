"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { leer, modificar } from "@/lib/almacen";
import { adoptarSinDueno, hashContrasena, normalizarCorreo, verificarContrasena } from "@/lib/cuentas";
import { crearCuentaAlumno, verificarAlumno } from "@/lib/cuentas-alumno";
import { cerrarSesionAlumno, cerrarSesionProfesor, iniciarSesionAlumno, iniciarSesionProfesor } from "@/lib/sesion";

const CREDITOS_INICIALES = Number(process.env.CREDITOS_INICIALES ?? 50);

function volver(ruta: string, error: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);
}

export async function registrarProfesor(form: FormData) {
  const nombre = String(form.get("nombre") ?? "").trim();
  const correo = normalizarCorreo(String(form.get("correo") ?? ""));
  const contrasena = String(form.get("contrasena") ?? "");
  const invitacion = String(form.get("invitacion") ?? "").trim();

  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) volver("/registro", "Escribe tu nombre y un correo válido.");
  if (contrasena.length < 8) volver("/registro", "La contraseña debe tener al menos 8 caracteres.");
  const codigoRequerido = process.env.REGISTRO_CODIGO;
  if (codigoRequerido && invitacion !== codigoRequerido) volver("/registro", "El código de invitación no es correcto.");

  const id = `p-${crypto.randomBytes(6).toString("hex")}`;
  const contrasenaHash = hashContrasena(contrasena);
  const creado = modificar((db) => {
    if (db.profesores.some((p) => p.correo === correo)) return false;
    const primero = db.profesores.length === 0;
    db.profesores.push({ id, nombre, correo, contrasena: contrasenaHash, creadoEn: new Date().toISOString() });
    if (primero) adoptarSinDueno(db, id);
    if (CREDITOS_INICIALES > 0) {
      db.movimientos.unshift({
        profesorId: id,
        fecha: new Date().toISOString().slice(0, 10),
        concepto: "Créditos de bienvenida",
        cantidad: CREDITOS_INICIALES,
      });
    }
    return true;
  });
  if (!creado) volver("/registro", "Ya existe una cuenta con ese correo. Ingresa con tu contraseña.");
  await iniciarSesionProfesor(id);
  redirect("/profesor");
}

export async function ingresarProfesor(form: FormData) {
  const correo = normalizarCorreo(String(form.get("correo") ?? ""));
  const contrasena = String(form.get("contrasena") ?? "");
  const profesor = (await leer()).profesores.find((p) => p.correo === correo);
  if (!profesor || !verificarContrasena(contrasena, profesor.contrasena)) {
    volver("/ingresar", "Correo o contraseña incorrectos.");
  }
  await iniciarSesionProfesor(profesor.id);
  redirect("/profesor");
}

export async function salirProfesor() {
  await cerrarSesionProfesor();
  redirect("/");
}

/** El alumno entra con su correo y su clave de acceso para ver solo sus resultados. */
export async function ingresarAlumno(form: FormData) {
  const cuenta = verificarAlumno(await leer(), String(form.get("correo") ?? ""), String(form.get("clave") ?? ""));
  if (!cuenta) volver("/alumno", "Correo o clave de acceso incorrectos.");
  await iniciarSesionAlumno(cuenta.id);
  redirect("/alumno");
}

export async function registrarAlumno(form: FormData) {
  const clave = String(form.get("clave") ?? "");
  if (clave !== String(form.get("clave2") ?? "")) volver("/alumno?crear=1", "Las dos claves de acceso no coinciden.");
  const r = crearCuentaAlumno({
    nombre: String(form.get("nombre") ?? ""),
    matricula: String(form.get("matricula") ?? ""),
    correo: String(form.get("correo") ?? ""),
    clave,
  });
  if (!r.ok) volver("/alumno?crear=1", r.error);
  await iniciarSesionAlumno(r.cuenta.id);
  redirect("/alumno");
}

export async function salirAlumno() {
  await cerrarSesionAlumno();
  redirect("/alumno");
}
