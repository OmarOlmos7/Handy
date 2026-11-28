// Licencias de alumno por curso: precios, alta con el código del curso, pago y créditos del
// profesor. Los demás idiomas tienen la misma forma.

const licencias = {
  tipos: {
    semanas5: { nombre: "5 semanas", detalle: "Un parcial o un curso corto" },
    semanas10: { nombre: "10 semanas", detalle: "Dos parciales o un bimestre largo" },
    semestre: { nombre: "1 semestre", detalle: "Todo el semestre (26 semanas)" },
    anual: { nombre: "1 año", detalle: "Todo el ciclo escolar (52 semanas)" },
  },
  provisional: "precio por confirmar",
  porAlumno: "por alumno, por curso",
  semanas: "{n} semanas de acceso",
  // Página pública de precios
  precios: {
    titulo: "Una licencia por alumno, por curso",
    texto:
      "Cada alumno activa su licencia con el código del curso que le da su profesor. Pagas solo el tiempo que dura tu curso: sin renovaciones automáticas. Precios en {divisa}.",
    masPopular: "Más elegida",
    boton: "Activar con el código de mi curso",
    incluye: "Incluye:",
    ventajas: [
      "Todas las actividades y entregas del curso desde el celular",
      "Retroalimentación con IA de cada hoja y su PDF corregido",
      "Autoestudio con IA, ruta de aprendizaje y analíticas",
      "Pago con tarjeta, efectivo en OXXO, saldo de Mercado Pago o SPEI",
    ],
    profesorTitulo: "Para profesores, la cuenta es gratis",
    profesorTexto:
      "Crea tus cursos y comparte su código. Cada licencia que pagan tus alumnos te abona {n} créditos de IA por semana para evaluar y para su autoestudio. Al registrarte recibes créditos de bienvenida para probar.",
    profesorBoton: "Crear cuenta de profesor",
    escuelaTitulo: "Escuelas e instituciones",
    escuelaTexto: "Licencias para todos los grupos de tu escuela, con facturación institucional.",
    escuelaBoton: "Contactar para un plan institucional",
    preguntas: [
      ["¿Qué es el código del curso?", "Es la clave que tu profesor ve en su curso, por ejemplo FIS-3B7K. Al escribirla eliges la duración y pagas; tu acceso queda ligado a ese curso."],
      ["¿Cómo pago?", "Con tarjeta de crédito o débito, en efectivo en OXXO y otras tiendas, con saldo de Mercado Pago o por SPEI. El pago en efectivo se confirma en unas horas."],
      ["¿Qué pasa cuando vence?", "Tus resultados no se borran, pero el curso se cierra hasta que actives otra licencia. Si la renuevas antes de que venza, el tiempo se suma al que te quedaba."],
      ["¿Puedo pedir factura (CFDI)?", "Sí. Escríbenos con la llave de tu licencia y los datos fiscales de quien pagó."],
    ],
  },
  // Alumno
  alumno: {
    titulo: "Activar un curso",
    subtitulo: "Escribe el código del curso que te dio tu profesor y elige cuánto tiempo lo necesitas.",
    codigo: "Código del curso",
    codigoEjemplo: "Ej. FIS-3B7K",
    duracion: "Duración",
    pagar: "Continuar al pago",
    seguro: "El pago se hace en Mercado Pago: tarjeta, OXXO, saldo o SPEI. iEureka-Grader nunca ve los datos de tu tarjeta.",
    misLicencias: "Mis licencias",
    sinLicencias: "Aún no tienes licencias.",
    curso: "Curso",
    licencia: "Licencia",
    estado: "Estado",
    vence: "Vence",
    llave: "Llave",
    estados: { pendiente: "Pendiente de pago", pagada: "Activa", vencida: "Vencida", cancelada: "Cancelada" },
    porActivarTitulo: "Cursos por activar",
    porActivarTexto: "Tu profesor te inscribió en estos cursos. Activa tu licencia para ver sus actividades y entregar.",
    activar: "Activar licencia",
    unirme: "Activar otro curso con su código",
    renovar: "Renovar",
    vencePronto: "Tu licencia de {curso} vence el {fecha}.",
    detalleTitulo: "Licencia {llave}",
    pendienteTexto: "Aún no recibimos la confirmación del pago. Si pagaste en efectivo puede tardar unas horas; esta página se actualiza sola al recargarla.",
    pagadaTexto: "¡Listo! Tu licencia está activa hasta el {fecha}. Ya puedes entrar al curso.",
    irAlCurso: "Ir al curso",
    volverAPagar: "Volver a la página de pago",
    simular: "Simular pago aprobado (demostración)",
    errores: {
      codigo: "No encontramos un curso con ese código. Revísalo con tu profesor.",
      tipo: "Elige la duración de la licencia.",
      matriculaOcupada: "Tu matrícula ya está registrada en este curso con otro correo. Habla con tu profesor.",
      sinPagos: "Los pagos todavía no están configurados. Intenta más tarde o avisa a tu profesor.",
      pasarela: "No pudimos abrir el pago. Intenta de nuevo en unos minutos.",
    },
  },
  // Profesor
  profesor: {
    codigoCurso: "Código del curso",
    codigoAyuda: "Compártelo con tus alumnos: con él activan su licencia y quedan inscritos en este curso.",
    copiar: "Copiar",
    copiado: "Copiado",
    creditosTitulo: "Créditos por licencias de tus alumnos",
    creditosTexto:
      "Ya no compras créditos: cada licencia que pagan tus alumnos te abona {n} créditos por semana (de {min} a {max} por licencia). Con ellos se evalúan sus entregas y su autoestudio.",
    vigentes: "Licencias activas",
    creditosAbonados: "Créditos abonados",
    sinCursos: "Aún no tienes cursos.",
  },
};

export default licencias;
