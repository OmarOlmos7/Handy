"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { leer, modificar } from "@/lib/almacen";
import { adoptarSinDueno, correoValido, cuentaAlumnoPorCorreo, hashContrasena, normalizarCorreo, verificarContrasena } from "@/lib/cuentas";
import { LARGO_MINIMO_CLAVE, crearCuentaAlumno, verificarAlumno } from "@/lib/cuentas-alumno";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { urlBase } from "@/lib/qr";
import { buscarRecuperacion, crearRecuperacion, usarRecuperacion } from "@/lib/recuperacion";
import { cerrarSesionAlumno, cerrarSesionProfesor, iniciarSesionAlumno, iniciarSesionProfesor } from "@/lib/sesion";

const CREDITOS_INICIALES = Number(process.env.CREDITOS_INICIALES ?? 50);

/** Vuelve al formulario con el error: una clave de cuenta.errores (profesor) o de alumno.errores (alumno). */
function volver(ruta: string, error: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);
}

export async function registrarProfesor(form: FormData) {
  const nombre = String(form.get("nombre") ?? "").trim();
  const correo = normalizarCorreo(String(form.get("correo") ?? ""));
  const contrasena = String(form.get("contrasena") ?? "");
  const invitacion = String(form.get("invitacion") ?? "").trim();

  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) volver("/registro", "datosRegistro");
  if (contrasena.length < 8) volver("/registro", "contrasenaCorta");
  const codigoRequerido = process.env.REGISTRO_CODIGO;
  if (codigoRequerido && invitacion !== codigoRequerido) volver("/registro", "invitacion");

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
  if (!creado) volver("/registro", "yaExiste");
  await iniciarSesionProfesor(id);
  redirect("/profesor");
}

export async function ingresarProfesor(form: FormData) {
  const correo = normalizarCorreo(String(form.get("correo") ?? ""));
  const contrasena = String(form.get("contrasena") ?? "");
  const profesor = (await leer()).profesores.find((p) => p.correo === correo);
  if (!profesor || !verificarContrasena(contrasena, profesor.contrasena)) {
    volver("/ingresar", "credenciales");
  }
  await iniciarSesionProfesor(profesor.id);
  // Las vistas de trabajo usan el idioma de su configuración (inglés si nunca eligió otro).
  redirect("/profesor");
}

export async function salirProfesor() {
  await cerrarSesionProfesor();
  redirect("/");
}

/** El alumno entra con su correo y su clave de acceso para ver solo sus resultados. */
export async function ingresarAlumno(form: FormData) {
  const cuenta = verificarAlumno(await leer(), String(form.get("correo") ?? ""), String(form.get("clave") ?? ""));
  if (!cuenta) volver("/alumno", "credenciales");
  await iniciarSesionAlumno(cuenta.id);
  redirect("/alumno");
}

export async function registrarAlumno(form: FormData) {
  const clave = String(form.get("clave") ?? "");
  if (clave !== String(form.get("clave2") ?? "")) volver("/alumno?crear=1", "clavesDistintas");
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

/** Largo mínimo de la contraseña (profesor) o de la clave de acceso (alumno). */
const LARGO_MINIMO = { profesor: 8, alumno: LARGO_MINIMO_CLAVE } as const;

/** Solo se vuelve a la página de entrega de una actividad (nunca a otro sitio). */
function volverSeguro(v: FormDataEntryValue | null): string {
  const ruta = String(v ?? "");
  return /^\/entregar\/[\w-]+$/.test(ruta) ? ruta : "";
}

/**
 * Envía al correo registrado un enlace para crear una nueva contraseña (profesor) o clave de
 * acceso (alumno). La respuesta es la misma exista o no la cuenta.
 */
export async function solicitarRecuperacion(form: FormData) {
  const tipo = form.get("tipo") === "alumno" ? "alumno" : "profesor";
  const volver = volverSeguro(form.get("volver"));
  const base = `/recuperar?tipo=${tipo}${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`;
  const correo = normalizarCorreo(String(form.get("correo") ?? ""));
  if (!correoValido(correo)) redirect(`${base}&error=correo`);
  if (!correoConfigurado()) redirect(`${base}&error=sinCorreo`);

  const db = await leer();
  const cuenta = tipo === "profesor" ? db.profesores.find((p) => p.correo === correo) : cuentaAlumnoPorCorreo(db, correo);
  if (cuenta) {
    const token = modificar((d) => crearRecuperacion(d, tipo, cuenta.id));
    if (token) {
      const { t } = await textos();
      const tr = t.recuperar;
      const enlace = `${await urlBase()}/restablecer?t=${encodeURIComponent(token)}${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`;
      const nombre = cuenta.nombre.split(" ")[0] || cuenta.nombre;
      let fallo = false;
      try {
        await enviarCorreo(cuenta.correo, tr.asunto, formato(tr.cuerpo, { nombre, que: tr[tipo].que, enlace }));
      } catch (e) {
        console.error("No se pudo enviar el correo de recuperación:", e instanceof Error ? e.message : e);
        fallo = true;
      }
      if (fallo) redirect(`${base}&error=envio`);
    }
  }
  redirect(`${base}&enviado=1`);
}

/** Guarda la nueva contraseña o clave con el enlace del correo. */
export async function restablecerContrasena(form: FormData) {
  const token = String(form.get("t") ?? "");
  const volver = volverSeguro(form.get("volver"));
  const nueva = String(form.get("nueva") ?? "");
  const pagina = `/restablecer?t=${encodeURIComponent(token)}${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`;
  const r = buscarRecuperacion(await leer(), token);
  if (!r) redirect(`${pagina}&error=enlaceInvalido`);
  if (nueva.length < LARGO_MINIMO[r.tipo]) redirect(`${pagina}&error=corta`);
  if (nueva !== String(form.get("nueva2") ?? "")) redirect(`${pagina}&error=distintas`);
  const tipo = modificar((db) => usarRecuperacion(db, token, hashContrasena(nueva)));
  if (!tipo) redirect(`${pagina}&error=enlaceInvalido`);
  redirect(`/restablecer?listo=${tipo}${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`);
}
