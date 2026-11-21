// Legal texts in English (courtesy translation of the Spanish version). DRAFT for legal review.
import type { TextosLegales } from "../tipos";

const en: TextosLegales = {
  aviso: {
    titulo: "Privacy notice",
    resumen:
      "Who processes your data in iEureka-Grader, what it is used for, who it is shared with and how to exercise your rights. It applies to teachers, students and site visitors.",
    secciones: [
      {
        id: "responsable",
        titulo: "1. Who is responsible for your data",
        parrafos: [
          "{razon} (“iEureka”), located at {domicilio}, is the controller of the personal data collected through {sitio} and the iEureka-Grader app.",
          "When a school or teacher registers students and uploads their worksheets, the school or teacher decides which data is used and why. In that case iEureka processes the academic data on their behalf and only to provide the service.",
        ],
      },
      {
        id: "datos",
        titulo: "2. What data we collect",
        parrafos: ["We only ask for what is needed to review printed activities:"],
        lista: [
          "Teachers: name, email, password (stored hashed, never in plain text), language, grading preferences, the courses and activities they create, and their credit and purchase history.",
          "Students: name, student ID, email, access code (hashed), the courses they submit to, photos or PDFs of their worksheets, and the grades, comments and reports generated.",
          "Technical data: the IP address, checked at the moment to choose language and currency and not stored in your profile, plus the session and language cookies.",
          "Payments: the payment processor receives your card details. iEureka never sees or stores them; we only keep the plan and amount purchased.",
        ],
      },
      {
        id: "sensibles",
        titulo: "3. Sensitive data and minors",
        parrafos: [
          "We do not ask for sensitive data (health, religion, ethnic origin, biometrics, etc.). Please do not write it on worksheets or comments. If a worksheet contains it by accident, it is used only to review that worksheet.",
          "Many students are minors. The school or teacher must therefore have authorization from a parent or guardian when the law requires it, and a minor student should create their account with their guardian’s knowledge. If a guardian asks us to delete their child’s data, we will.",
        ],
      },
      {
        id: "finalidades",
        titulo: "4. What we use your data for",
        parrafos: ["Purposes necessary for the service (without them we cannot provide it):"],
        lista: [
          "Creating and protecting your account and letting you sign in with your email and password or access code.",
          "Receiving worksheets, reading them with the help of artificial intelligence and suggesting a grade, marks and comments that the teacher reviews and approves.",
          "Producing reports, class analytics, the gradebook and files for Canvas or other platforms.",
          "Sending service emails, such as password recovery or deletion notices.",
          "Charging for credits, invoicing and meeting tax obligations.",
          "Handling questions, complaints and rights requests, and preventing fraud or misuse.",
        ],
      },
      {
        id: "secundarias",
        titulo: "5. Optional purposes",
        parrafos: [
          "With your permission, we may send you product news or invite you to surveys. You can say no at any time by writing to {correo}; this does not affect the service.",
          "We may produce aggregated, anonymous statistics (for example, how many pages are reviewed per month) to improve the product. They do not identify anyone.",
          "We do not sell personal data, we do not use it for advertising and we do not use students’ worksheets to train artificial intelligence models.",
        ],
      },
      {
        id: "ia",
        titulo: "6. How we use artificial intelligence",
        parrafos: [
          "To read worksheets we use an artificial intelligence provider acting as a processor. We only send it the image of the answers, the rubric and the teacher’s solution; never the student’s name or ID.",
          "Grades and statistics are calculated by iEureka’s own software, not by the AI. The AI suggests; the teacher reviews, corrects and decides what the student sees.",
        ],
      },
      {
        id: "transferencias",
        titulo: "7. Who we share your data with",
        parrafos: [
          "Only with providers that help us run the service and are bound by confidentiality and security obligations: server hosting, email delivery, payment processing and the artificial intelligence provider. Some are outside Mexico (for example, in the United States).",
          "A student’s data is seen by their teacher, and the student only sees their own results.",
          "We may also disclose data to authorities when a law or court order requires it.",
          "These disclosures do not require your consent because they are necessary for the service or required by law. If we ever wanted to share data for another purpose, we would ask for your consent first.",
        ],
      },
      {
        id: "conservacion",
        titulo: "8. How long we keep data",
        parrafos: [],
        lista: [
          "Worksheet photos: {dias} days after results are released; they are then archived in the corrected PDF and deleted.",
          "Activities, reports and grades: {anio} days after the last report. We notify the teacher before deleting them.",
          "Accounts: while active. If you ask us to close it, we delete it, except for what the law requires us to keep (for example, tax records of purchases).",
        ],
      },
      {
        id: "derechos",
        titulo: "9. Your rights and how to exercise them",
        parrafos: [
          "You can request Access to your data, its Rectification if it is wrong, its Cancellation (deletion), or Object to a use (ARCO rights under Mexican law). You can also withdraw your consent or ask us to limit the use of your data.",
          "Write to {correo} from your account email with your name, the right you want to exercise and which data, and a copy of an ID (or, if you are a guardian, yours and proof of guardianship). We reply within 20 business days and, if appropriate, apply it within the following 15 business days.",
          "If you are a student and your school manages your account, you can also ask your teacher or school.",
          "If you believe we did not handle your request properly, you can contact the data protection authority in your country (in Mexico, the Secretaría Anticorrupción y Buen Gobierno).",
        ],
      },
      {
        id: "cookies",
        titulo: "10. Cookies",
        parrafos: [
          "We only use necessary cookies: one to keep you signed in and one to remember your language. We do not use advertising or third-party tracking cookies. If you block them, you will not be able to sign in.",
        ],
      },
      {
        id: "seguridad",
        titulo: "11. Security",
        parrafos: [
          "We use encrypted connections (HTTPS), hashed passwords, sessions that expire, access separated by teacher and backups. No system is 100% secure: if a breach affects your rights, we will notify you without delay and explain what to do.",
        ],
      },
      {
        id: "cambios",
        titulo: "12. Changes to this notice",
        parrafos: [
          "If we change this notice we will publish it here with its new date. If the change is significant (for example, a new purpose), we will let you know when you sign in or by email and, when the law requires it, ask you to accept it again.",
        ],
      },
    ],
  },

  politica: {
    titulo: "Personal data policy",
    resumen:
      "The principles and internal rules iEureka-Grader follows to protect teachers’ and students’ data, and the conditions that apply in each country.",
    secciones: [
      {
        id: "alcance",
        titulo: "1. Scope",
        parrafos: [
          "This policy applies to all personal data processed by {razon} when operating iEureka-Grader, on the web and in the app, and to the people and providers working with it. It complements the Privacy notice.",
        ],
      },
      {
        id: "principios",
        titulo: "2. Principles",
        parrafos: [],
        lista: [
          "Lawfulness and fairness: we process data only with a legal basis and without deception.",
          "Consent: we ask for it clearly when the law requires it, and it can be withdrawn.",
          "Transparency: we explain what we do with data in plain language.",
          "Accuracy: we try to keep data correct and up to date.",
          "Purpose limitation: we use data only for the purposes we disclose.",
          "Data minimization: we ask for the minimum. We never send names or student IDs to the AI.",
          "Storage limitation: we delete what is no longer needed, on defined timelines.",
          "Accountability: we document what we do and answer for it.",
        ],
      },
      {
        id: "roles",
        titulo: "3. Who decides and who processes",
        parrafos: [
          "iEureka is the controller of account data, payments and site operations.",
          "For students’ worksheets, grades and reports, the school or teacher decides how they are used. iEureka processes them on their behalf as a processor (in the US, as a “school official”; in Europe, as a processor under Article 28 GDPR). We can sign a data processing agreement with schools that request one.",
          "Teachers agree to register only their own students, to use the data for educational purposes and to have the authorizations their school or the law requires.",
        ],
      },
      {
        id: "menores",
        titulo: "4. Minors",
        parrafos: [
          "iEureka-Grader is a tool for teachers. Minor students use it at their teacher’s direction and with their guardian’s knowledge. We show no advertising, build no commercial profiles and do not sell minors’ data.",
          "Where a country sets a minimum age of consent (for example, 13 in the US, 14 in Spain, Italy, Chile or China, 15 in Greece and 16 in Germany), consent is given by the school where the law allows it, or by a parent or guardian.",
        ],
      },
      {
        id: "proveedores",
        titulo: "5. Providers (processors)",
        parrafos: [
          "We only work with providers contractually bound to use the data solely to serve us, to protect it and to delete it when the service ends. Today we use: server and email hosting, an artificial intelligence provider (no training on the data sent) and a payment processor. We keep an up-to-date list available on request at {correo}.",
        ],
      },
      {
        id: "internacional",
        titulo: "6. International transfers",
        parrafos: [
          "Some providers are outside the user’s country. Where the law requires it, we use safeguards such as standard contractual clauses (Europe), standard contracts or the data subject’s separate consent (China, Japan).",
        ],
      },
      {
        id: "seguridad",
        titulo: "7. Security measures",
        parrafos: [],
        lista: [
          "Encrypted connections (HTTPS) and passwords stored with one-way hashing (scrypt).",
          "Data separated by teacher; each student only sees their own.",
          "Recovery links that expire and sessions with an expiry date.",
          "Automatic deletion of photos and activities according to the Privacy notice timelines.",
          "Server access limited to authorized staff, and backups.",
        ],
      },
      {
        id: "incidentes",
        titulo: "8. Security breaches",
        parrafos: [
          "If a breach significantly affects people’s rights, we investigate and contain it, notify those affected and the school without delay, and the authority when the law requires it (in Europe, within 72 hours).",
        ],
      },
      {
        id: "solicitudes",
        titulo: "9. Handling rights requests",
        parrafos: [
          "We handle requests at {correo}. We verify identity, reply within the legal deadline of the data subject’s country (the shortest that applies) and charge nothing, except shipping or copy costs where the law allows.",
        ],
      },
    ],
  },

  terminos: {
    titulo: "Terms and conditions of use",
    resumen: "The rules for using iEureka-Grader. By creating an account you accept them.",
    secciones: [
      {
        id: "aceptacion",
        titulo: "1. Acceptance",
        parrafos: [
          "These terms are an agreement between you and {razon}. By creating an account or using the service you confirm that you have read and accept them, together with the Privacy notice and the Personal data policy. If you are a minor, your parent or guardian must accept them with you.",
        ],
      },
      {
        id: "servicio",
        titulo: "2. The service",
        parrafos: [
          "iEureka-Grader helps teachers review activities done on paper: students photograph their worksheet, artificial intelligence suggests an evaluation and the teacher reviews and approves it. AI suggestions may contain errors; the final grade is the teacher’s responsibility.",
        ],
      },
      {
        id: "cuentas",
        titulo: "3. Your account",
        parrafos: [],
        lista: [
          "Provide accurate information and keep your password secret. You are responsible for what is done with your account.",
          "Teachers should only register their own students and upload worksheets for educational purposes.",
          "Tell us at {correo} if you suspect someone is using your account.",
        ],
      },
      {
        id: "uso",
        titulo: "4. Acceptable use",
        parrafos: ["You may not:"],
        lista: [
          "Upload illegal or offensive content, or content from people who are not your students.",
          "Try to access other people’s accounts or data, overload the service or bypass its security.",
          "Copy, resell or use the service or its results to build a competing product or train AI models.",
        ],
      },
      {
        id: "creditos",
        titulo: "5. Credits and payments",
        parrafos: [
          "Reviews use credits according to the chosen precision level. Published prices include VAT where applicable. Credits are not money, earn no interest and are non-refundable except where the law requires it or the service fails through our fault. You can request an invoice at {correo}.",
        ],
      },
      {
        id: "propiedad",
        titulo: "6. Intellectual property",
        parrafos: [
          "The software, design, the iEureka-Grader brand and its logo belong to {razon}. The activities, rubrics and solutions you upload remain yours (or your school’s), and worksheets belong to the students. You grant us permission only to store and process them while we provide the service.",
        ],
      },
      {
        id: "responsabilidad",
        titulo: "7. Limitation of liability",
        parrafos: [
          "We provide the service “as is” and make reasonable efforts to keep it working and secure, but we do not guarantee it will be free of interruptions or errors. To the extent permitted by law, our total liability is limited to what you paid in the last 12 months. Nothing here limits your consumer rights.",
        ],
      },
      {
        id: "baja",
        titulo: "8. Suspension and closing your account",
        parrafos: [
          "You can stop using the service and ask us to delete your account at any time. We may suspend an account that breaches these terms, notifying you where possible.",
        ],
      },
      {
        id: "cambios",
        titulo: "9. Changes",
        parrafos: [
          "We may update these terms. We will publish the new version with its date and, if the change is significant, ask you to accept it again.",
        ],
      },
      {
        id: "ley",
        titulo: "10. Governing law",
        parrafos: [
          "These terms are governed by the laws of Mexico and any dispute will be settled by the competent courts of Mexico, unless the law of your country gives you the right to go to the courts where you live. The Spanish version prevails over translations.",
        ],
      },
    ],
  },

  paises: {
    titulo: "Country-specific terms",
    intro:
      "In addition to the above, these rules apply depending on the country where you live or where your school is. If two rules apply, we follow the one that protects you more. To exercise any of these rights write to {correo}.",
    lista: [
      {
        id: "mx",
        pais: "Mexico",
        leyes: "Federal Law on the Protection of Personal Data Held by Private Parties (2025) and its regulations.",
        autoridad: "Secretaría Anticorrupción y Buen Gobierno.",
        puntos: [
          "ARCO rights (access, rectification, cancellation and objection) and withdrawal of consent.",
          "Reply within 20 business days; if appropriate, applied within the following 15 business days.",
          "Minors act through their parent or guardian.",
          "You can sign up for PROFECO’s do-not-advertise registry (REPEP); in any case, we do not send advertising without your permission.",
        ],
      },
      {
        id: "us",
        pais: "United States",
        leyes: "FERPA, COPPA, state student privacy laws (such as SOPIPA) and California’s CCPA/CPRA.",
        autoridad: "Department of Education (FERPA), Federal Trade Commission (COPPA) and the California Privacy Protection Agency.",
        puntos: [
          "FERPA: when a school contracts with us, we act as a “school official”: we use education records only for the service, under the school’s control, and parents or eligible students request access or correction through the school.",
          "COPPA: for children under 13, the school may consent for educational use only; otherwise parental consent is needed. No advertising or commercial profiles.",
          "California: you can know what data we hold and ask us to delete or correct it. We do not sell or share data for targeted advertising. We reply within 45 days and will not discriminate against you for exercising your rights.",
        ],
      },
      {
        id: "cl",
        pais: "Chile",
        leyes: "Law 19,628 on the protection of private life, as amended by Law 21,719 (in force from December 2026).",
        autoridad: "Personal Data Protection Agency.",
        puntos: [
          "Rights of access, rectification, erasure, objection, portability and blocking.",
          "Data of children under 14 requires consent from their parents or guardians, always in the child’s best interest.",
          "Reply within 30 calendar days, extendable once by 30 more days.",
        ],
      },
      {
        id: "ar",
        pais: "Argentina",
        leyes: "Personal Data Protection Law 25,326 and its regulatory decree.",
        autoridad: "Agency for Access to Public Information (AAIP).",
        puntos: [
          "Free access every six months; we reply within 10 calendar days.",
          "Rectification, update or erasure within 5 business days.",
          "You can file a complaint with the AAIP if we do not handle your request.",
        ],
      },
      {
        id: "es",
        pais: "Spain",
        leyes: "General Data Protection Regulation (GDPR) and Organic Law 3/2018 (LOPDGDD).",
        autoridad: "Spanish Data Protection Agency (AEPD).",
        puntos: [
          "Rights of access, rectification, erasure, restriction, portability, objection and not to be subject to solely automated decisions: the AI does not decide the grade, the teacher reviews it.",
          "Children under 14 need consent from their parents or guardians.",
          "Reply within one month, extendable by two more months in complex cases.",
          "Legal basis: performance of the service and, in schools, the school’s educational mission.",
        ],
      },
      {
        id: "de",
        pais: "Germany",
        leyes: "GDPR and the Federal Data Protection Act (BDSG), plus each state’s school laws.",
        autoridad: "The data protection authority of each federal state and the BfDI.",
        puntos: [
          "The same GDPR rights as in Spain.",
          "Children under 16 need parental consent.",
          "For school use we sign a data processing agreement (Auftragsverarbeitungsvertrag) with the school.",
        ],
      },
      {
        id: "it",
        pais: "Italy",
        leyes: "GDPR and the Personal Data Protection Code (Legislative Decree 196/2003, amended by Legislative Decree 101/2018).",
        autoridad: "Garante per la protezione dei dati personali.",
        puntos: ["The same GDPR rights.", "Children under 14 need consent from their parents or guardians."],
      },
      {
        id: "gr",
        pais: "Greece",
        leyes: "GDPR and Law 4624/2019.",
        autoridad: "Hellenic Data Protection Authority (HDPA).",
        puntos: ["The same GDPR rights.", "Children under 15 need consent from their parents or guardians."],
      },
      {
        id: "jp",
        pais: "Japan",
        leyes: "Act on the Protection of Personal Information (APPI).",
        autoridad: "Personal Information Protection Commission (PPC).",
        puntos: [
          "You can request disclosure, correction, suspension of use or deletion of your data.",
          "Before sending data to a provider in another country we tell you the country and its protection regime and, when the law requires it, ask for your consent.",
          "According to PPC guidance, parental consent is generally obtained for children aged roughly 12 to 15 and under.",
        ],
      },
      {
        id: "cn",
        pais: "China",
        leyes: "Personal Information Protection Law (PIPL).",
        autoridad: "Cyberspace Administration of China (CAC).",
        puntos: [
          "Data of children under 14 is sensitive: separate consent from parents or guardians is required.",
          "Sending data outside China requires your separate consent and a legal mechanism (standard contract, certification or security assessment).",
          "Rights to know, decide, access, copy, correct, delete, portability and to ask us to explain how we process your data.",
        ],
      },
    ],
  },
};

export default en;
