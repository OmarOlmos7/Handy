import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "Settings",
  titulo: "Settings",
  subtitulo: "Your sign-in details and your archived classes.",
  cuentaTitulo: "My account",
  correo: "Email: {correo} · Student ID: {matricula}",
  nombre: "Name",
  claveActual: "Current access key",
  claveNueva: "New access key",
  claveConfirmar: "Confirm the new key",
  guardar: "Save",
  notaClave: "Leave the keys empty if you only change your name. The new key must have at least {n} characters.",
  notaNombre: "Your name on each class list is managed by your teacher.",
  archivadosNinguno: "You have no archived classes. Archive a class with the box icon on its card.",
  avisos: {
    nombreGuardado: "Your name was saved.",
    nombreYClave: "Your name and new access key were saved.",
    escribeNombre: "Type your name (at least 3 letters).",
    claveCorta: "The new key must have at least {n} characters.",
    noCoinciden: "The two new keys do not match.",
    actualIncorrecta: "The current access key is not correct.",
    cuentaNoExiste: "Your account no longer exists.",
  },
};

export default ajustesAlumno;
