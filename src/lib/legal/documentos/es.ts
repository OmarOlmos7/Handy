// Textos legales en español (versión base). Los demás idiomas tienen la misma forma.
// BORRADOR: requieren revisión de un abogado antes de publicarse como versión oficial.
// Marcadores: {razon} razón social, {correo} correo de privacidad, {domicilio} domicilio,
// {sitio} dominio, {dias} días de conservación de fotos, {anio} días de conservación de reportes.

import type { TextosLegales } from "../tipos";

const es: TextosLegales = {
  aviso: {
    titulo: "Aviso de privacidad",
    resumen:
      "Quién trata tus datos en iEureka-Grader, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos. Aplica a profesores, alumnos y visitantes del sitio.",
    secciones: [
      {
        id: "responsable",
        titulo: "1. Quién es responsable de tus datos",
        parrafos: [
          "{razon} (en adelante, “iEureka”), con domicilio en {domicilio}, es responsable del tratamiento de los datos personales que se recaban a través del sitio {sitio} y de la aplicación iEureka-Grader.",
          "Cuando una escuela o un profesor registra a sus alumnos y sube sus hojas, la escuela o el profesor decide qué datos se usan y para qué. En ese caso iEureka trata los datos académicos por cuenta de ellos y solo para darles el servicio.",
        ],
      },
      {
        id: "datos",
        titulo: "2. Qué datos recabamos",
        parrafos: ["Solo pedimos lo necesario para revisar actividades impresas:"],
        lista: [
          "Profesores: nombre, correo, contraseña (guardada cifrada, nunca en texto claro), idioma, preferencias de calificación, cursos y actividades que crea, y el historial de créditos y compras.",
          "Alumnos: nombre, matrícula, correo, clave de acceso (cifrada), los cursos en los que entrega, las fotos o PDF de sus hojas, y las calificaciones, comentarios y reportes que se generan.",
          "Datos técnicos: la dirección IP, que se consulta en el momento para elegir el idioma y la moneda y no se guarda en tu perfil, y las cookies de sesión e idioma.",
          "Pagos: el procesador de pagos recibe los datos de tu tarjeta. iEureka no los ve ni los guarda; solo guarda el plan y el monto comprado.",
        ],
      },
      {
        id: "sensibles",
        titulo: "3. Datos sensibles y de menores",
        parrafos: [
          "No pedimos datos sensibles (salud, religión, origen étnico, etc.). Te pedimos no escribirlos en las hojas ni en los comentarios. Si una hoja los contiene por accidente, solo se usan para revisarla.",
          "La única excepción es opcional: si el profesor usa la asistencia con foto, se guarda una huella numérica del rostro (dato biométrico) solo de los alumnos que den su consentimiento expreso y por escrito (firmado por su madre, padre o tutor si son menores de edad). La foto se analiza en el dispositivo del profesor y no se sube, no se guarda ni se envía a la inteligencia artificial; la huella solo sirve para la asistencia de ese curso y se borra al archivar o borrar el curso, al dar de baja al alumno o al retirar el consentimiento. Negarse no afecta al alumno: su asistencia se toma a mano.",
          "Muchos alumnos son menores de edad. Por eso la escuela o el profesor debe contar con la autorización de la madre, el padre o el tutor cuando la ley lo exija, y el alumno menor de edad debe crear su cuenta con el conocimiento de su tutor. Si un tutor nos pide borrar los datos de su hijo o hija, lo hacemos.",
        ],
      },
      {
        id: "finalidades",
        titulo: "4. Para qué usamos tus datos",
        parrafos: ["Finalidades necesarias para el servicio (sin ellas no podemos darlo):"],
        lista: [
          "Crear y proteger tu cuenta, y dejarte entrar con tu correo y contraseña o clave.",
          "Recibir las hojas, leerlas con apoyo de inteligencia artificial y sugerir calificación, marcas y comentarios que el profesor revisa y aprueba.",
          "Generar reportes, analíticas del grupo, el cuaderno de calificaciones y los archivos para Canvas u otras plataformas.",
          "Enviarte correos del servicio, como recuperar la contraseña o avisos de borrado.",
          "Cobrar los créditos, facturar y cumplir obligaciones fiscales.",
          "Atender dudas, quejas y solicitudes de derechos, y prevenir fraudes o usos indebidos.",
        ],
      },
      {
        id: "secundarias",
        titulo: "5. Finalidades opcionales",
        parrafos: [
          "Con tu permiso, podemos enviarte novedades del producto o invitarte a encuestas. Puedes negarte en cualquier momento escribiendo a {correo}; negarte no afecta el servicio.",
          "Podemos generar estadísticas agregadas y anónimas (por ejemplo, cuántas páginas se revisan al mes) para mejorar el producto. Esas estadísticas no identifican a nadie.",
          "No vendemos datos personales, no los usamos para publicidad y no usamos las hojas de los alumnos para entrenar modelos de inteligencia artificial.",
        ],
      },
      {
        id: "ia",
        titulo: "6. Cómo usamos la inteligencia artificial",
        parrafos: [
          "Para leer las hojas usamos un proveedor de inteligencia artificial que actúa como encargado. Solo le enviamos la imagen de las respuestas, la rúbrica y la solución del profesor; nunca el nombre ni la matrícula del alumno.",
          "Las calificaciones y estadísticas las calcula el programa de iEureka, no la IA. La IA sugiere; el profesor revisa, corrige y decide qué ve el alumno.",
        ],
      },
      {
        id: "transferencias",
        titulo: "7. Con quién compartimos tus datos",
        parrafos: [
          "Los compartimos solo con proveedores que nos ayudan a dar el servicio y que firman obligaciones de confidencialidad y seguridad: hospedaje del servidor, envío de correos, procesamiento de pagos y el proveedor de inteligencia artificial. Algunos están fuera de México (por ejemplo, en Estados Unidos).",
          "Los datos del alumno los ve su profesor, y el alumno solo ve sus propios resultados.",
          "También podemos entregar datos a autoridades cuando una ley o una orden judicial lo exija.",
          "Estas comunicaciones no requieren tu consentimiento porque son necesarias para el servicio o las exige la ley. Si algún día quisiéramos compartir datos para otro fin, te pediríamos tu consentimiento antes.",
        ],
      },
      {
        id: "conservacion",
        titulo: "8. Cuánto tiempo guardamos los datos",
        lista: [
          "Fotos de las hojas: {dias} días después de que se liberan los resultados; luego se archivan en el PDF corregido y se borran.",
          "Actividades, reportes y calificaciones: {anio} días después del último reporte. Avisamos al profesor antes de borrarlos.",
          "Cuentas: mientras estén activas. Si pides cancelarla, la borramos, salvo lo que la ley nos obligue a conservar (por ejemplo, datos fiscales de compras).",
        ],
        parrafos: [],
      },
      {
        id: "derechos",
        titulo: "9. Tus derechos ARCO y cómo ejercerlos",
        parrafos: [
          "Puedes pedir Acceso a tus datos, su Rectificación si están mal, su Cancelación (borrado) u Oponerte a un uso. También puedes revocar tu consentimiento o pedir que limitemos el uso de tus datos.",
          "Escribe a {correo} desde el correo de tu cuenta con: tu nombre, qué derecho quieres ejercer y sobre qué datos, y una copia de una identificación (o, si eres tutor, la tuya y un documento que lo acredite). Respondemos en un máximo de 20 días hábiles y, si procede, lo aplicamos en los 15 días hábiles siguientes.",
          "Si eres alumno y tu escuela administra tu cuenta, también puedes pedírselo a tu profesor o a tu escuela.",
          "Si crees que no atendimos bien tu solicitud, puedes acudir a la autoridad de protección de datos de tu país (en México, la Secretaría Anticorrupción y Buen Gobierno).",
        ],
      },
      {
        id: "cookies",
        titulo: "10. Cookies",
        parrafos: [
          "Usamos solo cookies necesarias: una para mantener tu sesión abierta y otra para recordar tu idioma. No usamos cookies de publicidad ni de rastreo de terceros. Si las bloqueas en tu navegador, no podrás iniciar sesión.",
        ],
      },
      {
        id: "seguridad",
        titulo: "11. Seguridad",
        parrafos: [
          "Usamos conexión cifrada (HTTPS), contraseñas cifradas, sesiones que expiran, accesos separados por profesor y copias de seguridad. Ningún sistema es 100 % seguro: si ocurre una vulneración que afecte tus derechos, te avisaremos sin demora y diremos qué hacer.",
        ],
      },
      {
        id: "cambios",
        titulo: "12. Cambios a este aviso",
        parrafos: [
          "Si cambiamos este aviso lo publicaremos aquí con su nueva fecha. Si el cambio es importante (por ejemplo, una nueva finalidad), te avisaremos al entrar o por correo y, cuando la ley lo pida, te pediremos aceptarlo de nuevo.",
        ],
      },
    ],
  },

  politica: {
    titulo: "Política de datos personales",
    resumen:
      "Los principios y reglas internas con que iEureka-Grader cuida los datos de profesores y alumnos, y las condiciones que aplican según el país.",
    secciones: [
      {
        id: "alcance",
        titulo: "1. Alcance",
        parrafos: [
          "Esta política aplica a todos los datos personales que trata {razon} al operar iEureka-Grader, en la web y en la app, y a las personas y proveedores que trabajan con ellos. Complementa el Aviso de privacidad.",
        ],
      },
      {
        id: "principios",
        titulo: "2. Principios",
        lista: [
          "Licitud y lealtad: tratamos datos solo con una base legal y sin engaños.",
          "Consentimiento: lo pedimos de forma clara cuando la ley lo exige, y se puede revocar.",
          "Información: explicamos qué hacemos con los datos en lenguaje sencillo.",
          "Calidad: procuramos que los datos estén correctos y al día.",
          "Finalidad: usamos los datos solo para lo que informamos.",
          "Minimización: pedimos lo mínimo. A la IA nunca le enviamos nombres ni matrículas.",
          "Conservación limitada: borramos lo que ya no se necesita, con plazos definidos.",
          "Responsabilidad: documentamos lo que hacemos y respondemos por ello.",
        ],
        parrafos: [],
      },
      {
        id: "roles",
        titulo: "3. Quién decide y quién trata",
        parrafos: [
          "iEureka es responsable de los datos de las cuentas, los pagos y la operación del sitio.",
          "Respecto de las hojas, calificaciones y reportes de los alumnos, la escuela o el profesor decide su uso. iEureka los trata por su cuenta, como encargado (en EE. UU., como “school official”; en Europa, como encargado del tratamiento del artículo 28 del RGPD). Podemos firmar un contrato de encargo de datos con las escuelas que lo pidan.",
          "El profesor se compromete a registrar solo a sus alumnos, a usar los datos con fines educativos y a contar con las autorizaciones que exija su escuela o la ley.",
        ],
      },
      {
        id: "menores",
        titulo: "4. Menores de edad",
        parrafos: [
          "iEureka-Grader es una herramienta para profesores. Los alumnos menores de edad la usan por indicación de su profesor y con el conocimiento de su tutor. No mostramos publicidad, no creamos perfiles comerciales y no vendemos datos de menores.",
          "Cuando la ley del país fija una edad mínima para consentir (por ejemplo, 13 años en EE. UU., 14 en España, Italia, Chile o China, 15 en Grecia y 16 en Alemania), el consentimiento lo da la escuela, cuando la ley lo permite, o la madre, el padre o el tutor.",
        ],
      },
      {
        id: "proveedores",
        titulo: "5. Proveedores (encargados)",
        parrafos: [
          "Solo trabajamos con proveedores que se obligan por contrato a usar los datos solo para servirnos, a protegerlos y a borrarlos al terminar. Hoy usamos: hospedaje del servidor y del correo, un proveedor de inteligencia artificial (sin entrenamiento con los datos enviados) y un procesador de pagos. Mantenemos una lista actualizada que entregamos a quien la pida en {correo}.",
        ],
      },
      {
        id: "internacional",
        titulo: "6. Transferencias internacionales",
        parrafos: [
          "Algunos proveedores están fuera del país del usuario. Cuando la ley lo exige, usamos garantías como cláusulas contractuales tipo (Europa), contratos estándar o el consentimiento separado del titular (China, Japón).",
        ],
      },
      {
        id: "seguridad",
        titulo: "7. Medidas de seguridad",
        lista: [
          "Conexión cifrada (HTTPS) y contraseñas guardadas con cifrado de una sola vía (scrypt).",
          "Datos separados por profesor; el alumno solo ve lo suyo.",
          "Enlaces de recuperación que vencen y sesiones con fecha de expiración.",
          "Borrado automático de fotos y actividades según los plazos del Aviso de privacidad.",
          "Acceso al servidor limitado al personal autorizado y copias de seguridad.",
        ],
        parrafos: [],
      },
      {
        id: "incidentes",
        titulo: "8. Vulneraciones de seguridad",
        parrafos: [
          "Si ocurre una vulneración que afecte de forma importante los derechos de las personas, la investigamos, la contenemos, avisamos a los afectados y a la escuela sin demora, y a la autoridad cuando la ley lo pida (en Europa, en un máximo de 72 horas).",
        ],
      },
      {
        id: "solicitudes",
        titulo: "9. Atención de derechos",
        parrafos: [
          "Atendemos las solicitudes en {correo}. Verificamos la identidad, respondemos en el plazo legal del país del titular (el más corto que aplique) y no cobramos por ello, salvo los gastos de envío o copias que permita la ley.",
        ],
      },
    ],
  },

  terminos: {
    titulo: "Términos y condiciones de uso",
    resumen: "Las reglas para usar iEureka-Grader. Al crear una cuenta las aceptas.",
    secciones: [
      {
        id: "aceptacion",
        titulo: "1. Aceptación",
        parrafos: [
          "Estos términos son un acuerdo entre tú y {razon}. Al crear una cuenta o usar el servicio declaras que los leíste y aceptas, junto con el Aviso de privacidad y la Política de datos personales. Si eres menor de edad, tu madre, padre o tutor debe aceptarlos contigo.",
        ],
      },
      {
        id: "servicio",
        titulo: "2. El servicio",
        parrafos: [
          "iEureka-Grader ayuda a profesores a revisar actividades hechas en papel: los alumnos fotografían su hoja, la inteligencia artificial sugiere una evaluación y el profesor la revisa y aprueba. Las sugerencias de la IA pueden tener errores; la calificación final es responsabilidad del profesor.",
        ],
      },
      {
        id: "cuentas",
        titulo: "3. Tu cuenta",
        lista: [
          "Da datos verdaderos y mantén tu contraseña en secreto. Lo que se haga con tu cuenta es tu responsabilidad.",
          "El profesor solo debe registrar a sus alumnos y subir hojas con fines educativos.",
          "Avísanos en {correo} si sospechas que alguien usa tu cuenta.",
        ],
        parrafos: [],
      },
      {
        id: "uso",
        titulo: "4. Uso permitido",
        parrafos: ["No está permitido:"],
        lista: [
          "Subir contenido ilegal, ofensivo o de personas que no son tus alumnos.",
          "Intentar entrar a cuentas o datos ajenos, saturar el servicio o eludir sus medidas de seguridad.",
          "Copiar, revender o usar el servicio o sus resultados para crear un producto competidor o entrenar modelos de IA.",
        ],
      },
      {
        id: "creditos",
        titulo: "5. Créditos y pagos",
        parrafos: [
          "Las revisiones consumen créditos según el nivel de precisión elegido. Los precios publicados incluyen IVA cuando aplica. Los créditos no son dinero, no generan intereses y no son reembolsables salvo cuando la ley lo exija o el servicio falle por causa nuestra. Puedes pedir tu factura en {correo}.",
        ],
      },
      {
        id: "propiedad",
        titulo: "6. Propiedad intelectual",
        parrafos: [
          "El software, el diseño, la marca iEureka-Grader y su logotipo son de {razon}. Las actividades, rúbricas y soluciones que subes siguen siendo tuyas (o de tu escuela), y las hojas son de los alumnos. Nos das permiso solo para guardarlas y procesarlas mientras te damos el servicio.",
        ],
      },
      {
        id: "responsabilidad",
        titulo: "7. Limitación de responsabilidad",
        parrafos: [
          "Damos el servicio “tal como está” y hacemos lo razonable para que funcione y sea seguro, pero no garantizamos que no tenga interrupciones o errores. En la medida que permita la ley, nuestra responsabilidad total se limita a lo que pagaste en los últimos 12 meses. Nada de esto limita tus derechos como consumidor.",
        ],
      },
      {
        id: "baja",
        titulo: "8. Suspensión y baja",
        parrafos: [
          "Puedes dejar de usar el servicio y pedir que borremos tu cuenta cuando quieras. Podemos suspender una cuenta que incumpla estos términos, avisándote cuando sea posible.",
        ],
      },
      {
        id: "cambios",
        titulo: "9. Cambios",
        parrafos: [
          "Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha y, si el cambio es importante, te pediremos aceptarla de nuevo.",
        ],
      },
      {
        id: "ley",
        titulo: "10. Ley aplicable",
        parrafos: [
          "Estos términos se rigen por las leyes de México y cualquier controversia se resolverá ante los tribunales competentes de México, salvo que la ley de tu país te dé el derecho a acudir a los tribunales de tu domicilio. Como consumidor en México también puedes acudir a la PROFECO.",
        ],
      },
    ],
  },

  paises: {
    titulo: "Condiciones por país",
    intro:
      "Además de lo anterior, estas reglas aplican según el país donde vives o donde está tu escuela. Si dos reglas aplican, seguimos la que más te protege. Para ejercer cualquiera de estos derechos escribe a {correo}.",
    lista: [
      {
        id: "mx",
        pais: "México",
        leyes: "Ley Federal de Protección de Datos Personales en Posesión de los Particulares (2025) y su reglamento.",
        autoridad: "Secretaría Anticorrupción y Buen Gobierno.",
        puntos: [
          "Derechos ARCO (acceso, rectificación, cancelación y oposición) y revocación del consentimiento.",
          "Respuesta en máximo 20 días hábiles; si procede, se aplica en los 15 días hábiles siguientes.",
          "Los menores de edad actúan a través de su madre, padre o tutor.",
          "Puedes inscribirte en el Registro Público para Evitar Publicidad (REPEP) de la PROFECO; de todos modos, no enviamos publicidad sin tu permiso.",
        ],
      },
      {
        id: "us",
        pais: "Estados Unidos",
        leyes: "FERPA, COPPA, leyes estatales de privacidad estudiantil (como SOPIPA) y la CCPA/CPRA de California.",
        autoridad: "Departamento de Educación (FERPA), Comisión Federal de Comercio (COPPA) y la agencia de privacidad de California (CPPA).",
        puntos: [
          "FERPA: cuando una escuela nos contrata, actuamos como “school official”: usamos los registros educativos solo para el servicio, bajo el control de la escuela, y los padres o alumnos mayores de 18 piden acceso o corrección a través de la escuela.",
          "COPPA: para menores de 13 años, la escuela puede dar el consentimiento solo para uso educativo; si no, se necesita el de los padres. No hay publicidad ni perfiles comerciales.",
          "California: puedes saber qué datos tenemos, pedir que los borremos o corrijamos. No vendemos ni compartimos datos para publicidad dirigida. Respondemos en 45 días y no te discriminamos por ejercer tus derechos.",
        ],
      },
      {
        id: "cl",
        pais: "Chile",
        leyes: "Ley 19.628 sobre protección de la vida privada, reformada por la Ley 21.719 (vigente desde diciembre de 2026).",
        autoridad: "Agencia de Protección de Datos Personales.",
        puntos: [
          "Derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.",
          "Los datos de menores de 14 años requieren el consentimiento de sus padres o tutores; siempre se atiende al interés superior del niño.",
          "Respuesta en un máximo de 30 días corridos, prorrogables una vez por 30 días más.",
        ],
      },
      {
        id: "ar",
        pais: "Argentina",
        leyes: "Ley 25.326 de Protección de los Datos Personales y su decreto reglamentario.",
        autoridad: "Agencia de Acceso a la Información Pública (AAIP).",
        puntos: [
          "Acceso gratuito cada seis meses; respondemos en 10 días corridos.",
          "Rectificación, actualización o supresión en 5 días hábiles.",
          "Puedes presentar un reclamo ante la AAIP si no atendemos tu solicitud.",
        ],
      },
      {
        id: "es",
        pais: "España",
        leyes: "Reglamento General de Protección de Datos (RGPD) y Ley Orgánica 3/2018 (LOPDGDD).",
        autoridad: "Agencia Española de Protección de Datos (AEPD).",
        puntos: [
          "Derechos de acceso, rectificación, supresión, limitación, portabilidad, oposición y a no ser objeto de decisiones solo automatizadas: la IA no decide la calificación, el profesor la revisa.",
          "Los menores de 14 años necesitan el consentimiento de sus padres o tutores.",
          "Respuesta en un mes, prorrogable dos meses más en casos complejos.",
          "Base legal: la ejecución del servicio y, en el entorno escolar, la misión educativa de la escuela.",
        ],
      },
      {
        id: "de",
        pais: "Alemania",
        leyes: "RGPD y Ley Federal de Protección de Datos (BDSG), más las leyes escolares de cada estado (Land).",
        autoridad: "La autoridad de protección de datos de cada estado federado y el BfDI.",
        puntos: [
          "Los mismos derechos del RGPD que en España.",
          "Los menores de 16 años necesitan el consentimiento de sus padres.",
          "Para el uso escolar firmamos un contrato de encargo (Auftragsverarbeitungsvertrag) con la escuela.",
        ],
      },
      {
        id: "it",
        pais: "Italia",
        leyes: "RGPD y Código de protección de datos personales (D. Lgs. 196/2003, modificado por el D. Lgs. 101/2018).",
        autoridad: "Garante per la protezione dei dati personali.",
        puntos: [
          "Los mismos derechos del RGPD.",
          "Los menores de 14 años necesitan el consentimiento de sus padres o tutores.",
        ],
      },
      {
        id: "gr",
        pais: "Grecia",
        leyes: "RGPD y Ley 4624/2019.",
        autoridad: "Autoridad Helénica de Protección de Datos (HDPA).",
        puntos: [
          "Los mismos derechos del RGPD.",
          "Los menores de 15 años necesitan el consentimiento de sus padres o tutores.",
        ],
      },
      {
        id: "jp",
        pais: "Japón",
        leyes: "Ley de Protección de la Información Personal (APPI).",
        autoridad: "Comisión de Protección de la Información Personal (PPC).",
        puntos: [
          "Puedes pedir la divulgación, corrección, suspensión del uso o borrado de tus datos.",
          "Antes de enviar datos a un proveedor en otro país te informamos el país y su régimen de protección y, cuando la ley lo pide, te solicitamos consentimiento.",
          "Según las guías de la PPC, en general se pide el consentimiento de los padres para menores de entre 12 y 15 años.",
        ],
      },
      {
        id: "cn",
        pais: "China",
        leyes: "Ley de Protección de la Información Personal (PIPL).",
        autoridad: "Administración del Ciberespacio de China (CAC).",
        puntos: [
          "Los datos de menores de 14 años son datos sensibles: se necesita el consentimiento separado de sus padres o tutores.",
          "Enviar datos fuera de China requiere tu consentimiento separado y un mecanismo legal (contrato estándar, certificación o evaluación de seguridad).",
          "Derechos de conocer, decidir, acceder, copiar, corregir, borrar, portabilidad y a pedir que expliquemos cómo tratamos tus datos.",
        ],
      },
    ],
  },
};

export default es;
