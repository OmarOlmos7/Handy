import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "Einstellungen",
  titulo: "Einstellungen",
  subtitulo: "Deine Zugangsdaten und deine archivierten Kurse.",
  cuentaTitulo: "Mein Konto",
  correo: "E-Mail: {correo} · Matrikelnummer: {matricula}",
  nombre: "Name",
  claveActual: "Aktueller Zugangsschlüssel",
  claveNueva: "Neuer Zugangsschlüssel",
  claveConfirmar: "Neuen Schlüssel bestätigen",
  guardar: "Speichern",
  notaClave: "Lass die Schlüssel leer, wenn du nur deinen Namen änderst. Der neue Schlüssel muss mindestens {n} Zeichen haben.",
  notaNombre: "Deinen Namen in der Kursliste verwaltet deine Lehrkraft.",
  archivadosNinguno: "Du hast keine archivierten Kurse. Archiviere einen Kurs mit dem Kistensymbol auf seiner Karte.",
  avisos: {
    nombreGuardado: "Dein Name wurde gespeichert.",
    nombreYClave: "Dein Name und dein neuer Schlüssel wurden gespeichert.",
    escribeNombre: "Gib deinen Namen ein (mindestens 3 Buchstaben).",
    claveCorta: "Der neue Schlüssel muss mindestens {n} Zeichen haben.",
    noCoinciden: "Die beiden neuen Schlüssel stimmen nicht überein.",
    actualIncorrecta: "Der aktuelle Zugangsschlüssel ist falsch.",
    cuentaNoExiste: "Dein Konto existiert nicht mehr.",
  },
};

export default ajustesAlumno;
