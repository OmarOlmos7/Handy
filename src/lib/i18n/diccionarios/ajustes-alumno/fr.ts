import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "Réglages",
  titulo: "Réglages",
  subtitulo: "Vos identifiants et vos cours archivés.",
  cuentaTitulo: "Mon compte",
  correo: "E-mail : {correo} · Matricule : {matricula}",
  nombre: "Nom",
  claveActual: "Clé d’accès actuelle",
  claveNueva: "Nouvelle clé d’accès",
  claveConfirmar: "Confirmez la nouvelle clé",
  guardar: "Enregistrer",
  notaClave: "Laissez les clés vides si vous ne changez que votre nom. La nouvelle clé doit comporter au moins {n} caractères.",
  notaNombre: "Votre nom dans la liste de chaque cours est géré par votre professeur.",
  archivadosNinguno: "Vous n’avez aucun cours archivé. Archivez un cours avec l’icône de boîte de sa carte.",
  avisos: {
    nombreGuardado: "Votre nom a été enregistré.",
    nombreYClave: "Votre nom et votre nouvelle clé ont été enregistrés.",
    escribeNombre: "Saisissez votre nom (au moins 3 lettres).",
    claveCorta: "La nouvelle clé doit comporter au moins {n} caractères.",
    noCoinciden: "Les deux nouvelles clés ne correspondent pas.",
    actualIncorrecta: "La clé d’accès actuelle est incorrecte.",
    cuentaNoExiste: "Votre compte n’existe plus.",
  },
};

export default ajustesAlumno;
