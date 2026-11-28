import type es from "./es";

const marco: typeof es = {
  menu: {
    abrir: "Open menu",
    cerrar: "Close menu",
    secciones: "Sections",
    plegar: "Hide the left panel",
    desplegar: "Show the left panel",
  },
  curso: {
    titulo: "This class",
    vistas: "Class views",
    crear: "Create",
    alumnos: "Student list",
    volver: "Go to class",
  },
  lineaTiempo: {
    titulo: "Class timeline",
    subtitulo: "Syllabus units spread from {inicio} to {fin}. Dark: should already be covered. Light: still in line.",
    unidad: "Unit {n}",
    cubierta: "Should be covered",
    enCurso: "In progress today",
    pendiente: "In line",
    transcurrido: "{p}% of the class elapsed",
    avance: "Group progress: {p}%",
    sinActividades: "No linked activities",
    sinFechas: "Set the class start and end dates with the gear to spread the units over time.",
    sinTemario: "This class has no syllabus yet. Create or link a subject with its units to see the timeline.",
    irAsignaturas: "Go to Subjects",
    verAvance: "See syllabus progress",
  },
  enviarCodigo: {
    titulo: "Class code and membership payment",
    texto: "Email each student, individually, the class ID code they use to pay their membership (license) and enroll.",
    todos: "Select all",
    seleccionados: "{n} of {total} selected",
    enviar: "Email the code",
    enviando: "Sending…",
    elige: "Choose at least one student with an email.",
    sinCorreo: "No email",
    enviado: "Sent on {fecha}",
    sinSmtp: "The server email is not configured: no emails will go out until it is (SMTP).",
    resultado: "Emails sent: {e}.",
    fallidos: "Could not be sent: {n}.",
    sinCorreoN: "Without an email on file: {n}.",
    noConfigurado: "Nothing was sent because the server email is not configured.",
    error: "Could not send. Try again.",
    asunto: "Your code for the class {curso}",
    cuerpo:
      "Hi {nombre},\n\nYour teacher {profesor} enrolled you in the class {curso}.\n\nClass ID code: {codigo}\n\nUse this code to pay your membership (license) and enroll:\n1. Go to {url}\n2. Create your account or sign in with this email.\n3. Enter the code, choose the length and pay.\n\nIf you have questions, ask your teacher.\n\niEureka-Grader",
  },
};

export default marco;
