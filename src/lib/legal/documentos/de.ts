// Rechtstexte auf Deutsch (Höflichkeitsübersetzung der spanischen Fassung). ENTWURF zur rechtlichen Prüfung.
import type { TextosLegales } from "../tipos";

const de: TextosLegales = {
  aviso: {
    titulo: "Datenschutzhinweis",
    resumen:
      "Wer Ihre Daten in iEureka-Grader verarbeitet, wofür, an wen sie weitergegeben werden und wie Sie Ihre Rechte ausüben. Gilt für Lehrkräfte, Schülerinnen und Schüler sowie Besucher der Website.",
    secciones: [
      {
        id: "responsable",
        titulo: "1. Verantwortlicher",
        parrafos: [
          "{razon} („iEureka“), Anschrift: {domicilio}, ist Verantwortlicher für die über {sitio} und die App iEureka-Grader erhobenen personenbezogenen Daten.",
          "Wenn eine Schule oder Lehrkraft Schülerinnen und Schüler registriert und deren Arbeitsblätter hochlädt, entscheidet sie, welche Daten wofür verwendet werden. iEureka verarbeitet die schulischen Daten dann in ihrem Auftrag und nur zur Erbringung des Dienstes.",
        ],
      },
      {
        id: "datos",
        titulo: "2. Welche Daten wir erheben",
        parrafos: ["Wir erheben nur, was für die Korrektur gedruckter Aufgaben nötig ist:"],
        lista: [
          "Lehrkräfte: Name, E-Mail, Passwort (gehasht, nie im Klartext), Sprache, Bewertungseinstellungen, angelegte Kurse und Aktivitäten sowie Guthaben- und Kaufhistorie.",
          "Schülerinnen und Schüler: Name, Schülernummer, E-Mail, Zugangscode (gehasht), Kurse, Fotos oder PDFs ihrer Arbeitsblätter sowie die erzeugten Noten, Kommentare und Berichte.",
          "Technische Daten: die IP-Adresse, die nur im Moment zur Wahl von Sprache und Währung abgefragt und nicht im Profil gespeichert wird, sowie Sitzungs- und Sprach-Cookies.",
          "Zahlungen: Der Zahlungsdienstleister erhält Ihre Kartendaten. iEureka sieht und speichert sie nicht; wir speichern nur Tarif und Betrag.",
        ],
      },
      {
        id: "sensibles",
        titulo: "3. Besondere Daten und Minderjährige",
        parrafos: [
          "Wir erfragen keine besonderen Kategorien von Daten (Gesundheit, Religion, ethnische Herkunft, usw.). Bitte schreiben Sie sie nicht auf Arbeitsblätter oder in Kommentare. Enthält ein Blatt sie versehentlich, werden sie nur zur Korrektur verwendet.",
          "Die einzige Ausnahme ist freiwillig: Nutzt die Lehrkraft die Anwesenheit per Foto, wird ein numerisches Gesichtsmerkmal (biometrische Daten) nur für Schülerinnen und Schüler gespeichert, die ausdrücklich und schriftlich eingewilligt haben (bei Minderjährigen unterschrieben von einem Elternteil oder Vormund). Das Foto wird auf dem Gerät der Lehrkraft ausgewertet und weder hochgeladen noch gespeichert noch an eine künstliche Intelligenz gesendet; das Merkmal dient nur der Anwesenheit in diesem Kurs und wird gelöscht, wenn der Kurs archiviert oder gelöscht, die Person abgemeldet oder die Einwilligung widerrufen wird. Eine Ablehnung hat keine Nachteile: Die Anwesenheit wird dann von Hand erfasst.",
          "Viele Schülerinnen und Schüler sind minderjährig. Die Schule oder Lehrkraft muss daher, wo gesetzlich vorgeschrieben, die Einwilligung der Erziehungsberechtigten haben, und Minderjährige sollen ihr Konto mit Wissen ihrer Erziehungsberechtigten anlegen. Auf Wunsch der Erziehungsberechtigten löschen wir die Daten ihres Kindes.",
        ],
      },
      {
        id: "finalidades",
        titulo: "4. Zwecke der Verarbeitung",
        parrafos: ["Für den Dienst erforderliche Zwecke (ohne sie können wir ihn nicht erbringen):"],
        lista: [
          "Konto anlegen und schützen sowie Anmeldung mit E-Mail und Passwort oder Zugangscode.",
          "Arbeitsblätter empfangen, mit Hilfe künstlicher Intelligenz lesen und eine Note, Markierungen und Kommentare vorschlagen, die die Lehrkraft prüft und freigibt.",
          "Berichte, Klassenauswertungen, Notenbuch und Dateien für Canvas oder andere Plattformen erstellen.",
          "Service-E-Mails senden, etwa zur Passwortwiederherstellung oder vor Löschungen.",
          "Guthaben abrechnen und steuerliche Pflichten erfüllen.",
          "Fragen, Beschwerden und Betroffenenanfragen bearbeiten sowie Betrug und Missbrauch verhindern.",
        ],
      },
      {
        id: "secundarias",
        titulo: "5. Freiwillige Zwecke",
        parrafos: [
          "Mit Ihrer Einwilligung senden wir Ihnen Neuigkeiten oder laden Sie zu Umfragen ein. Sie können jederzeit unter {correo} widersprechen; der Dienst bleibt davon unberührt.",
          "Wir können zusammengefasste, anonyme Statistiken zur Verbesserung des Produkts erstellen. Sie identifizieren niemanden.",
          "Wir verkaufen keine personenbezogenen Daten, nutzen sie nicht für Werbung und trainieren keine KI-Modelle mit den Arbeitsblättern der Schülerinnen und Schüler.",
        ],
      },
      {
        id: "ia",
        titulo: "6. Einsatz künstlicher Intelligenz",
        parrafos: [
          "Zum Lesen der Arbeitsblätter nutzen wir einen KI-Anbieter als Auftragsverarbeiter. Wir senden nur das Bild der Antworten, das Bewertungsraster und die Lösung der Lehrkraft, niemals Namen oder Schülernummer.",
          "Noten und Statistiken berechnet die Software von iEureka, nicht die KI. Die KI schlägt vor; die Lehrkraft prüft, korrigiert und entscheidet, was die Schülerin oder der Schüler sieht.",
        ],
      },
      {
        id: "transferencias",
        titulo: "7. Empfänger der Daten",
        parrafos: [
          "Nur Dienstleister, die uns beim Betrieb helfen und zu Vertraulichkeit und Sicherheit verpflichtet sind: Hosting, E-Mail-Versand, Zahlungsabwicklung und KI-Anbieter. Einige sitzen außerhalb Mexikos (z. B. in den USA).",
          "Die Daten einer Schülerin oder eines Schülers sieht die jeweilige Lehrkraft; Schülerinnen und Schüler sehen nur ihre eigenen Ergebnisse.",
          "Behörden erhalten Daten nur, wenn ein Gesetz oder Gerichtsbeschluss es verlangt.",
          "Für andere Zwecke würden wir vorher Ihre Einwilligung einholen.",
        ],
      },
      {
        id: "conservacion",
        titulo: "8. Speicherdauer",
        parrafos: [],
        lista: [
          "Fotos der Arbeitsblätter: {dias} Tage nach Freigabe der Ergebnisse; danach werden sie im korrigierten PDF archiviert und gelöscht.",
          "Aktivitäten, Berichte und Noten: {anio} Tage nach dem letzten Bericht. Die Lehrkraft wird vor der Löschung informiert.",
          "Konten: solange sie aktiv sind. Auf Wunsch löschen wir das Konto, außer Daten mit gesetzlicher Aufbewahrungspflicht (z. B. steuerliche Kaufbelege).",
        ],
      },
      {
        id: "derechos",
        titulo: "9. Ihre Rechte und wie Sie sie ausüben",
        parrafos: [
          "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Widerruf Ihrer Einwilligung.",
          "Schreiben Sie von der E-Mail-Adresse Ihres Kontos an {correo} mit Ihrem Namen, dem gewünschten Recht und den betroffenen Daten. Wir antworten innerhalb eines Monats.",
          "Wenn Ihre Schule Ihr Konto verwaltet, können Sie sich auch an Ihre Lehrkraft oder Schule wenden.",
          "Sie haben das Recht, sich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren.",
        ],
      },
      {
        id: "cookies",
        titulo: "10. Cookies",
        parrafos: [
          "Wir verwenden nur notwendige Cookies: eines für Ihre Sitzung und eines für Ihre Sprache. Keine Werbe- oder Tracking-Cookies Dritter. Wenn Sie sie blockieren, können Sie sich nicht anmelden.",
        ],
      },
      {
        id: "seguridad",
        titulo: "11. Sicherheit",
        parrafos: [
          "Verschlüsselte Verbindung (HTTPS), gehashte Passwörter, ablaufende Sitzungen, nach Lehrkraft getrennte Zugriffe und Sicherungskopien. Kein System ist zu 100 % sicher: Bei einer Verletzung, die Ihre Rechte betrifft, informieren wir Sie unverzüglich.",
        ],
      },
      {
        id: "cambios",
        titulo: "12. Änderungen",
        parrafos: [
          "Änderungen veröffentlichen wir hier mit neuem Datum. Bei wesentlichen Änderungen informieren wir Sie bei der Anmeldung oder per E-Mail und bitten, wo gesetzlich nötig, um erneute Zustimmung.",
        ],
      },
    ],
  },

  politica: {
    titulo: "Richtlinie zu personenbezogenen Daten",
    resumen:
      "Die Grundsätze und internen Regeln, nach denen iEureka-Grader die Daten von Lehrkräften und Schülern schützt, sowie die länderspezifischen Bestimmungen.",
    secciones: [
      {
        id: "alcance",
        titulo: "1. Geltungsbereich",
        parrafos: [
          "Diese Richtlinie gilt für alle personenbezogenen Daten, die {razon} beim Betrieb von iEureka-Grader im Web und in der App verarbeitet, sowie für alle beteiligten Personen und Dienstleister. Sie ergänzt den Datenschutzhinweis.",
        ],
      },
      {
        id: "principios",
        titulo: "2. Grundsätze",
        parrafos: [],
        lista: [
          "Rechtmäßigkeit und Fairness: nur mit Rechtsgrundlage und ohne Täuschung.",
          "Einwilligung: klar eingeholt, wo erforderlich, und jederzeit widerrufbar.",
          "Transparenz: verständliche Erklärungen.",
          "Richtigkeit: Daten werden korrekt und aktuell gehalten.",
          "Zweckbindung: nur für die angegebenen Zwecke.",
          "Datenminimierung: nur das Nötigste. Niemals Namen oder Schülernummern an die KI.",
          "Speicherbegrenzung: Löschung nach festen Fristen.",
          "Rechenschaftspflicht: Wir dokumentieren unsere Verarbeitung.",
        ],
      },
      {
        id: "roles",
        titulo: "3. Rollen",
        parrafos: [
          "iEureka ist Verantwortlicher für Kontodaten, Zahlungen und den Betrieb der Website.",
          "Für Arbeitsblätter, Noten und Berichte entscheidet die Schule oder Lehrkraft. iEureka verarbeitet sie als Auftragsverarbeiter nach Art. 28 DSGVO und schließt auf Wunsch einen Auftragsverarbeitungsvertrag ab.",
          "Lehrkräfte registrieren nur ihre eigenen Schülerinnen und Schüler, nutzen die Daten zu Bildungszwecken und holen die erforderlichen Genehmigungen ein.",
        ],
      },
      {
        id: "menores",
        titulo: "4. Minderjährige",
        parrafos: [
          "iEureka-Grader ist ein Werkzeug für Lehrkräfte. Minderjährige nutzen es auf Anweisung der Lehrkraft und mit Wissen der Erziehungsberechtigten. Keine Werbung, keine kommerziellen Profile, kein Verkauf von Daten Minderjähriger.",
          "Wo ein Land ein Mindestalter für die Einwilligung festlegt (z. B. 13 in den USA, 14 in Spanien, Italien, Chile oder China, 15 in Griechenland, 16 in Deutschland), erteilt die Schule, soweit gesetzlich zulässig, oder die Erziehungsberechtigten die Einwilligung.",
        ],
      },
      {
        id: "proveedores",
        titulo: "5. Auftragsverarbeiter",
        parrafos: [
          "Wir arbeiten nur mit Dienstleistern, die vertraglich verpflichtet sind, die Daten nur für uns zu nutzen, zu schützen und nach Ende zu löschen: Server- und E-Mail-Hosting, ein KI-Anbieter (kein Training mit den übermittelten Daten) und ein Zahlungsdienstleister. Die aktuelle Liste erhalten Sie unter {correo}.",
        ],
      },
      {
        id: "internacional",
        titulo: "6. Internationale Übermittlungen",
        parrafos: [
          "Einige Dienstleister sitzen außerhalb des Landes des Nutzers. Wo erforderlich, nutzen wir Garantien wie EU-Standardvertragsklauseln, Standardverträge oder die gesonderte Einwilligung der betroffenen Person (China, Japan).",
        ],
      },
      {
        id: "seguridad",
        titulo: "7. Sicherheitsmaßnahmen",
        parrafos: [],
        lista: [
          "Verschlüsselte Verbindung (HTTPS) und Passwörter mit Einweg-Hash (scrypt).",
          "Daten getrennt nach Lehrkraft; jede Schülerin und jeder Schüler sieht nur die eigenen.",
          "Ablaufende Wiederherstellungslinks und Sitzungen.",
          "Automatische Löschung von Fotos und Aktivitäten nach den Fristen des Datenschutzhinweises.",
          "Serverzugriff nur für befugtes Personal, Sicherungskopien.",
        ],
      },
      {
        id: "incidentes",
        titulo: "8. Datenschutzverletzungen",
        parrafos: [
          "Bei einer Verletzung, die die Rechte von Personen erheblich beeinträchtigt, untersuchen und begrenzen wir sie, informieren unverzüglich die Betroffenen und die Schule und, wo vorgeschrieben, die Aufsichtsbehörde (in Europa binnen 72 Stunden).",
        ],
      },
      {
        id: "solicitudes",
        titulo: "9. Bearbeitung von Anfragen",
        parrafos: [
          "Anfragen bearbeiten wir unter {correo}. Wir prüfen die Identität, antworten innerhalb der gesetzlichen Frist (der kürzesten geltenden) und kostenlos, außer gesetzlich zulässigen Versand- oder Kopierkosten.",
        ],
      },
    ],
  },

  terminos: {
    titulo: "Nutzungsbedingungen",
    resumen: "Die Regeln für die Nutzung von iEureka-Grader. Mit der Kontoerstellung akzeptieren Sie sie.",
    secciones: [
      {
        id: "aceptacion",
        titulo: "1. Zustimmung",
        parrafos: [
          "Diese Bedingungen sind eine Vereinbarung zwischen Ihnen und {razon}. Mit der Kontoerstellung oder Nutzung bestätigen Sie, dass Sie sie zusammen mit dem Datenschutzhinweis und der Richtlinie zu personenbezogenen Daten gelesen haben und akzeptieren. Minderjährige akzeptieren sie gemeinsam mit ihren Erziehungsberechtigten.",
        ],
      },
      {
        id: "servicio",
        titulo: "2. Der Dienst",
        parrafos: [
          "iEureka-Grader hilft Lehrkräften, Aufgaben auf Papier zu korrigieren: Schülerinnen und Schüler fotografieren ihr Blatt, die KI schlägt eine Bewertung vor und die Lehrkraft prüft und gibt sie frei. KI-Vorschläge können Fehler enthalten; die endgültige Note verantwortet die Lehrkraft.",
        ],
      },
      {
        id: "cuentas",
        titulo: "3. Ihr Konto",
        parrafos: [],
        lista: [
          "Machen Sie wahre Angaben und halten Sie Ihr Passwort geheim. Sie sind für die Nutzung Ihres Kontos verantwortlich.",
          "Lehrkräfte registrieren nur ihre eigenen Schülerinnen und Schüler und laden Blätter nur zu Bildungszwecken hoch.",
          "Melden Sie unter {correo}, wenn Sie einen Missbrauch Ihres Kontos vermuten.",
        ],
      },
      {
        id: "uso",
        titulo: "4. Zulässige Nutzung",
        parrafos: ["Nicht erlaubt ist:"],
        lista: [
          "Rechtswidrige, beleidigende Inhalte oder Inhalte von Personen hochzuladen, die nicht Ihre Schüler sind.",
          "Auf fremde Konten oder Daten zuzugreifen, den Dienst zu überlasten oder Sicherheitsmaßnahmen zu umgehen.",
          "Den Dienst oder seine Ergebnisse zu kopieren, weiterzuverkaufen oder für ein Konkurrenzprodukt oder KI-Training zu nutzen.",
        ],
      },
      {
        id: "creditos",
        titulo: "5. Guthaben und Zahlungen",
        parrafos: [
          "Korrekturen verbrauchen Guthaben je nach gewählter Genauigkeit. Angezeigte Preise enthalten ggf. die Umsatzsteuer. Guthaben ist kein Geld, wird nicht verzinst und ist nicht erstattungsfähig, außer wenn das Gesetz es verlangt oder der Dienst durch unser Verschulden ausfällt. Rechnungen unter {correo}.",
        ],
      },
      {
        id: "propiedad",
        titulo: "6. Geistiges Eigentum",
        parrafos: [
          "Software, Design, die Marke iEureka-Grader und ihr Logo gehören {razon}. Ihre Aktivitäten, Bewertungsraster und Lösungen bleiben Ihre (oder die Ihrer Schule); die Arbeitsblätter gehören den Schülerinnen und Schülern. Sie erlauben uns nur, sie zur Erbringung des Dienstes zu speichern und zu verarbeiten.",
        ],
      },
      {
        id: "responsabilidad",
        titulo: "7. Haftungsbeschränkung",
        parrafos: [
          "Wir erbringen den Dienst „wie besehen“ und bemühen uns angemessen um Verfügbarkeit und Sicherheit, ohne Unterbrechungsfreiheit zu garantieren. Soweit gesetzlich zulässig, ist unsere Haftung auf die in den letzten 12 Monaten gezahlten Beträge begrenzt. Zwingende Verbraucherrechte und die Haftung für Vorsatz und grobe Fahrlässigkeit bleiben unberührt.",
        ],
      },
      {
        id: "baja",
        titulo: "8. Sperrung und Kündigung",
        parrafos: [
          "Sie können die Nutzung jederzeit beenden und die Löschung Ihres Kontos verlangen. Wir können Konten sperren, die gegen diese Bedingungen verstoßen, und informieren Sie nach Möglichkeit.",
        ],
      },
      {
        id: "cambios",
        titulo: "9. Änderungen",
        parrafos: [
          "Wir können diese Bedingungen aktualisieren. Die neue Fassung wird mit Datum veröffentlicht; bei wesentlichen Änderungen bitten wir um erneute Zustimmung.",
        ],
      },
      {
        id: "ley",
        titulo: "10. Anwendbares Recht",
        parrafos: [
          "Es gilt mexikanisches Recht; Gerichtsstand sind die zuständigen Gerichte Mexikos, soweit Ihnen das Recht Ihres Landes nicht den Gerichtsstand an Ihrem Wohnsitz garantiert. Die spanische Fassung hat Vorrang vor Übersetzungen.",
        ],
      },
    ],
  },

  paises: {
    titulo: "Bestimmungen nach Land",
    intro:
      "Zusätzlich gelten je nach Land, in dem Sie leben oder in dem Ihre Schule liegt, diese Regeln. Gelten zwei Regeln, wenden wir die schützendere an. Zur Ausübung Ihrer Rechte schreiben Sie an {correo}.",
    lista: [
      {
        id: "mx",
        pais: "Mexiko",
        leyes: "Bundesgesetz zum Schutz personenbezogener Daten im Besitz Privater (2025) und Durchführungsverordnung.",
        autoridad: "Secretaría Anticorrupción y Buen Gobierno.",
        puntos: [
          "ARCO-Rechte (Auskunft, Berichtigung, Löschung, Widerspruch) und Widerruf der Einwilligung.",
          "Antwort binnen 20 Werktagen; Umsetzung ggf. binnen weiterer 15 Werktage.",
          "Minderjährige handeln über ihre Erziehungsberechtigten.",
        ],
      },
      {
        id: "us",
        pais: "USA",
        leyes: "FERPA, COPPA, bundesstaatliche Schülerdatenschutzgesetze (z. B. SOPIPA) und CCPA/CPRA (Kalifornien).",
        autoridad: "Bildungsministerium (FERPA), Federal Trade Commission (COPPA), California Privacy Protection Agency.",
        puntos: [
          "FERPA: Im Auftrag einer Schule handeln wir als „school official“ unter deren Kontrolle; Eltern oder volljährige Schüler wenden sich für Auskunft und Berichtigung an die Schule.",
          "COPPA: Für Kinder unter 13 kann die Schule nur für Bildungszwecke einwilligen; sonst ist die Einwilligung der Eltern nötig.",
          "Kalifornien: Recht auf Auskunft, Löschung und Berichtigung. Kein Verkauf oder Teilen für gezielte Werbung. Antwort binnen 45 Tagen, keine Benachteiligung.",
        ],
      },
      {
        id: "cl",
        pais: "Chile",
        leyes: "Gesetz 19.628, geändert durch Gesetz 21.719 (in Kraft ab Dezember 2026).",
        autoridad: "Agentur für den Schutz personenbezogener Daten.",
        puntos: [
          "Rechte auf Auskunft, Berichtigung, Löschung, Widerspruch, Übertragbarkeit und Sperrung.",
          "Daten von Kindern unter 14 erfordern die Einwilligung der Eltern oder Vormünder.",
          "Antwort binnen 30 Kalendertagen, einmal um 30 Tage verlängerbar.",
        ],
      },
      {
        id: "ar",
        pais: "Argentinien",
        leyes: "Datenschutzgesetz 25.326 und Durchführungsverordnung.",
        autoridad: "Agentur für den Zugang zu öffentlichen Informationen (AAIP).",
        puntos: [
          "Kostenlose Auskunft alle sechs Monate; Antwort binnen 10 Kalendertagen.",
          "Berichtigung, Aktualisierung oder Löschung binnen 5 Werktagen.",
          "Beschwerde bei der AAIP möglich.",
        ],
      },
      {
        id: "es",
        pais: "Spanien",
        leyes: "DSGVO und Organgesetz 3/2018 (LOPDGDD).",
        autoridad: "Spanische Datenschutzbehörde (AEPD).",
        puntos: [
          "DSGVO-Rechte einschließlich des Rechts, keiner ausschließlich automatisierten Entscheidung unterworfen zu werden: Die KI entscheidet nicht über die Note, die Lehrkraft prüft sie.",
          "Kinder unter 14 benötigen die Einwilligung der Eltern oder Vormünder.",
          "Antwort binnen eines Monats, bei komplexen Fällen um zwei Monate verlängerbar.",
        ],
      },
      {
        id: "de",
        pais: "Deutschland",
        leyes: "DSGVO und Bundesdatenschutzgesetz (BDSG) sowie die Schulgesetze der Länder.",
        autoridad: "Die Datenschutzaufsichtsbehörden der Länder und der BfDI.",
        puntos: [
          "Alle DSGVO-Rechte.",
          "Kinder unter 16 benötigen die Einwilligung der Eltern.",
          "Für den schulischen Einsatz schließen wir mit der Schule einen Auftragsverarbeitungsvertrag (AVV).",
        ],
      },
      {
        id: "it",
        pais: "Italien",
        leyes: "DSGVO und Datenschutzkodex (Gesetzesdekret 196/2003, geändert durch 101/2018).",
        autoridad: "Garante per la protezione dei dati personali.",
        puntos: ["Alle DSGVO-Rechte.", "Kinder unter 14 benötigen die Einwilligung der Eltern oder Vormünder."],
      },
      {
        id: "gr",
        pais: "Griechenland",
        leyes: "DSGVO und Gesetz 4624/2019.",
        autoridad: "Hellenische Datenschutzbehörde (HDPA).",
        puntos: ["Alle DSGVO-Rechte.", "Kinder unter 15 benötigen die Einwilligung der Eltern oder Vormünder."],
      },
      {
        id: "jp",
        pais: "Japan",
        leyes: "Gesetz zum Schutz personenbezogener Informationen (APPI).",
        autoridad: "Personal Information Protection Commission (PPC).",
        puntos: [
          "Recht auf Offenlegung, Berichtigung, Nutzungsstopp oder Löschung.",
          "Vor einer Übermittlung ins Ausland nennen wir das Land und sein Schutzniveau und holen, wo nötig, Ihre Einwilligung ein.",
          "Laut PPC-Leitlinien wird bei Kindern unter etwa 12 bis 15 Jahren in der Regel die Einwilligung der Eltern eingeholt.",
        ],
      },
      {
        id: "cn",
        pais: "China",
        leyes: "Gesetz zum Schutz personenbezogener Informationen (PIPL).",
        autoridad: "Cyberspace Administration of China (CAC).",
        puntos: [
          "Daten von Kindern unter 14 sind sensibel: gesonderte Einwilligung der Eltern oder Vormünder erforderlich.",
          "Übermittlungen ins Ausland erfordern Ihre gesonderte Einwilligung und einen rechtlichen Mechanismus (Standardvertrag, Zertifizierung oder Sicherheitsprüfung).",
          "Rechte auf Information, Entscheidung, Auskunft, Kopie, Berichtigung, Löschung, Übertragbarkeit und Erläuterung der Verarbeitung.",
        ],
      },
    ],
  },
};

export default de;
