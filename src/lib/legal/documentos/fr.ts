// Textes juridiques en français (traduction de courtoisie de la version espagnole). PROJET à faire relire.
import type { TextosLegales } from "../tipos";

const fr: TextosLegales = {
  aviso: {
    titulo: "Avis de confidentialité",
    resumen:
      "Qui traite vos données dans iEureka-Grader, à quelles fins, avec qui elles sont partagées et comment exercer vos droits. Il s’applique aux enseignants, aux élèves et aux visiteurs du site.",
    secciones: [
      {
        id: "responsable",
        titulo: "1. Responsable du traitement",
        parrafos: [
          "{razon} (« iEureka »), domiciliée {domicilio}, est responsable du traitement des données personnelles collectées via {sitio} et l’application iEureka-Grader.",
          "Lorsqu’un établissement ou un enseignant inscrit ses élèves et envoie leurs feuilles, c’est lui qui décide quelles données sont utilisées et pourquoi. iEureka traite alors les données scolaires pour son compte et uniquement pour fournir le service.",
        ],
      },
      {
        id: "datos",
        titulo: "2. Données collectées",
        parrafos: ["Nous ne demandons que le nécessaire pour corriger des activités imprimées :"],
        lista: [
          "Enseignants : nom, e-mail, mot de passe (stocké haché, jamais en clair), langue, préférences de notation, cours et activités créés, historique des crédits et achats.",
          "Élèves : nom, matricule, e-mail, code d’accès (haché), cours auxquels ils remettent des travaux, photos ou PDF de leurs feuilles, ainsi que les notes, commentaires et rapports générés.",
          "Données techniques : l’adresse IP, consultée sur le moment pour choisir la langue et la devise et non enregistrée dans le profil, et les cookies de session et de langue.",
          "Paiements : le prestataire de paiement reçoit les données de carte. iEureka ne les voit ni ne les conserve ; nous gardons seulement le forfait et le montant achetés.",
        ],
      },
      {
        id: "sensibles",
        titulo: "3. Données sensibles et mineurs",
        parrafos: [
          "Nous ne demandons pas de données sensibles (santé, religion, origine ethnique, biométrie, etc.). Merci de ne pas les écrire sur les feuilles ni dans les commentaires. Si une feuille en contient par erreur, elles ne servent qu’à la corriger.",
          "De nombreux élèves sont mineurs. L’établissement ou l’enseignant doit donc disposer de l’autorisation des parents ou du tuteur lorsque la loi l’exige, et l’élève mineur doit créer son compte avec l’accord de son tuteur. Si un tuteur nous demande d’effacer les données de son enfant, nous le faisons.",
        ],
      },
      {
        id: "finalidades",
        titulo: "4. Finalités",
        parrafos: ["Finalités nécessaires au service (sans elles, nous ne pouvons pas le fournir) :"],
        lista: [
          "Créer et protéger votre compte, et vous permettre de vous connecter avec votre e-mail et votre mot de passe ou code.",
          "Recevoir les feuilles, les lire avec l’aide de l’intelligence artificielle et suggérer une note, des marques et des commentaires que l’enseignant vérifie et valide.",
          "Produire des rapports, des analyses de classe, le carnet de notes et les fichiers pour Canvas ou d’autres plateformes.",
          "Envoyer des e-mails de service, comme la récupération du mot de passe ou les avis de suppression.",
          "Facturer les crédits et respecter les obligations fiscales.",
          "Répondre aux questions, réclamations et demandes d’exercice des droits, et prévenir la fraude ou les abus.",
        ],
      },
      {
        id: "secundarias",
        titulo: "5. Finalités facultatives",
        parrafos: [
          "Avec votre accord, nous pouvons vous envoyer des nouveautés ou vous inviter à des enquêtes. Vous pouvez refuser à tout moment en écrivant à {correo} ; cela n’affecte pas le service.",
          "Nous pouvons produire des statistiques agrégées et anonymes pour améliorer le produit. Elles n’identifient personne.",
          "Nous ne vendons pas de données personnelles, ne les utilisons pas pour la publicité et n’utilisons pas les feuilles des élèves pour entraîner des modèles d’intelligence artificielle.",
        ],
      },
      {
        id: "ia",
        titulo: "6. Utilisation de l’intelligence artificielle",
        parrafos: [
          "Pour lire les feuilles, nous faisons appel à un prestataire d’intelligence artificielle agissant comme sous-traitant. Nous lui envoyons uniquement l’image des réponses, le barème et la solution de l’enseignant ; jamais le nom ni le matricule de l’élève.",
          "Les notes et statistiques sont calculées par le logiciel d’iEureka, pas par l’IA. L’IA suggère ; l’enseignant vérifie, corrige et décide de ce que voit l’élève.",
        ],
      },
      {
        id: "transferencias",
        titulo: "7. Destinataires des données",
        parrafos: [
          "Uniquement les prestataires qui nous aident à fournir le service et sont tenus à la confidentialité et à la sécurité : hébergement, envoi d’e-mails, paiement et intelligence artificielle. Certains sont hors du Mexique (par exemple aux États-Unis).",
          "Les données d’un élève sont vues par son enseignant, et l’élève ne voit que ses propres résultats.",
          "Nous pouvons aussi communiquer des données aux autorités lorsqu’une loi ou une décision de justice l’exige.",
          "Ces communications ne requièrent pas votre consentement car elles sont nécessaires au service ou imposées par la loi. Pour toute autre finalité, nous vous demanderions votre accord au préalable.",
        ],
      },
      {
        id: "conservacion",
        titulo: "8. Durée de conservation",
        parrafos: [],
        lista: [
          "Photos des feuilles : {dias} jours après la publication des résultats ; elles sont ensuite archivées dans le PDF corrigé puis supprimées.",
          "Activités, rapports et notes : {anio} jours après le dernier rapport. Nous prévenons l’enseignant avant la suppression.",
          "Comptes : tant qu’ils sont actifs. Sur demande, nous supprimons le compte, sauf ce que la loi nous oblige à conserver (par exemple les données fiscales des achats).",
        ],
      },
      {
        id: "derechos",
        titulo: "9. Vos droits et comment les exercer",
        parrafos: [
          "Vous pouvez demander l’accès à vos données, leur rectification, leur effacement ou vous opposer à un usage. Vous pouvez aussi retirer votre consentement ou demander la limitation du traitement.",
          "Écrivez à {correo} depuis l’e-mail de votre compte en indiquant votre nom, le droit exercé et les données concernées, avec une copie d’une pièce d’identité (ou, pour un tuteur, la sienne et un justificatif). Nous répondons dans les délais légaux de votre pays.",
          "Si vous êtes élève et que votre établissement gère votre compte, vous pouvez aussi vous adresser à votre enseignant ou à votre établissement.",
          "Si vous estimez que votre demande n’a pas été traitée correctement, vous pouvez saisir l’autorité de protection des données de votre pays.",
        ],
      },
      {
        id: "cookies",
        titulo: "10. Cookies",
        parrafos: [
          "Nous utilisons uniquement des cookies nécessaires : l’un pour maintenir votre session, l’autre pour mémoriser votre langue. Aucun cookie publicitaire ni de suivi tiers. Si vous les bloquez, vous ne pourrez pas vous connecter.",
        ],
      },
      {
        id: "seguridad",
        titulo: "11. Sécurité",
        parrafos: [
          "Connexion chiffrée (HTTPS), mots de passe hachés, sessions qui expirent, accès séparés par enseignant et sauvegardes. Aucun système n’est sûr à 100 % : en cas de violation affectant vos droits, nous vous prévenons sans délai.",
        ],
      },
      {
        id: "cambios",
        titulo: "12. Modifications",
        parrafos: [
          "Toute modification sera publiée ici avec sa nouvelle date. En cas de changement important, nous vous prévenons à la connexion ou par e-mail et, si la loi l’exige, vous demandons de l’accepter à nouveau.",
        ],
      },
    ],
  },

  politica: {
    titulo: "Politique de données personnelles",
    resumen:
      "Les principes et règles internes qu’applique iEureka-Grader pour protéger les données des enseignants et des élèves, et les conditions propres à chaque pays.",
    secciones: [
      {
        id: "alcance",
        titulo: "1. Champ d’application",
        parrafos: [
          "Cette politique s’applique à toutes les données personnelles traitées par {razon} dans le cadre d’iEureka-Grader, sur le web et dans l’application, ainsi qu’aux personnes et prestataires qui y travaillent. Elle complète l’Avis de confidentialité.",
        ],
      },
      {
        id: "principios",
        titulo: "2. Principes",
        parrafos: [],
        lista: [
          "Licéité et loyauté : uniquement avec une base légale et sans tromperie.",
          "Consentement : demandé clairement lorsque la loi l’exige, et révocable.",
          "Transparence : nous expliquons simplement ce que nous faisons des données.",
          "Exactitude : nous veillons à ce que les données soient correctes et à jour.",
          "Limitation des finalités : seulement pour ce que nous annonçons.",
          "Minimisation : le strict nécessaire. Jamais de noms ni de matricules envoyés à l’IA.",
          "Limitation de la conservation : suppression selon des délais définis.",
          "Responsabilité : nous documentons nos traitements et en répondons.",
        ],
      },
      {
        id: "roles",
        titulo: "3. Qui décide et qui traite",
        parrafos: [
          "iEureka est responsable des données de compte, des paiements et du fonctionnement du site.",
          "Pour les feuilles, notes et rapports des élèves, l’établissement ou l’enseignant décide de leur usage. iEureka les traite pour son compte en tant que sous-traitant (article 28 du RGPD ; « school official » aux États-Unis). Nous pouvons signer un accord de sous-traitance avec les établissements qui le demandent.",
          "L’enseignant s’engage à n’inscrire que ses élèves, à utiliser les données à des fins éducatives et à disposer des autorisations requises.",
        ],
      },
      {
        id: "menores",
        titulo: "4. Mineurs",
        parrafos: [
          "iEureka-Grader est un outil pour enseignants. Les élèves mineurs l’utilisent à la demande de leur enseignant et avec l’accord de leur tuteur. Pas de publicité, pas de profilage commercial, pas de vente de données de mineurs.",
          "Lorsqu’un pays fixe un âge minimum de consentement (par exemple 13 ans aux États-Unis, 14 en Espagne, en Italie, au Chili ou en Chine, 15 en Grèce et en France, 16 en Allemagne), le consentement est donné par l’établissement lorsque la loi le permet, ou par les parents ou le tuteur.",
        ],
      },
      {
        id: "proveedores",
        titulo: "5. Prestataires (sous-traitants)",
        parrafos: [
          "Nous travaillons uniquement avec des prestataires contractuellement tenus de n’utiliser les données que pour nous servir, de les protéger et de les supprimer à la fin du service : hébergement du serveur et de la messagerie, intelligence artificielle (sans entraînement sur les données envoyées) et paiement. La liste à jour est disponible sur demande à {correo}.",
        ],
      },
      {
        id: "internacional",
        titulo: "6. Transferts internationaux",
        parrafos: [
          "Certains prestataires sont hors du pays de l’utilisateur. Lorsque la loi l’exige, nous utilisons des garanties telles que les clauses contractuelles types (Europe), des contrats types ou le consentement distinct de la personne (Chine, Japon).",
        ],
      },
      {
        id: "seguridad",
        titulo: "7. Mesures de sécurité",
        parrafos: [],
        lista: [
          "Connexion chiffrée (HTTPS) et mots de passe hachés (scrypt).",
          "Données séparées par enseignant ; chaque élève ne voit que les siennes.",
          "Liens de récupération et sessions à durée limitée.",
          "Suppression automatique des photos et activités selon les délais de l’Avis de confidentialité.",
          "Accès au serveur réservé au personnel autorisé, et sauvegardes.",
        ],
      },
      {
        id: "incidentes",
        titulo: "8. Violations de données",
        parrafos: [
          "En cas de violation affectant sensiblement les droits des personnes, nous enquêtons, la circonscrivons, informons sans délai les personnes concernées et l’établissement, et l’autorité lorsque la loi l’exige (en Europe, sous 72 heures).",
        ],
      },
      {
        id: "solicitudes",
        titulo: "9. Traitement des demandes",
        parrafos: [
          "Les demandes sont traitées à {correo}. Nous vérifions l’identité, répondons dans le délai légal du pays de la personne (le plus court applicable) et gratuitement, sauf frais d’envoi ou de copie autorisés par la loi.",
        ],
      },
    ],
  },

  terminos: {
    titulo: "Conditions générales d’utilisation",
    resumen: "Les règles d’utilisation d’iEureka-Grader. En créant un compte, vous les acceptez.",
    secciones: [
      {
        id: "aceptacion",
        titulo: "1. Acceptation",
        parrafos: [
          "Ces conditions constituent un accord entre vous et {razon}. En créant un compte ou en utilisant le service, vous déclarez les avoir lues et acceptées, ainsi que l’Avis de confidentialité et la Politique de données personnelles. Si vous êtes mineur, vos parents ou votre tuteur doivent les accepter avec vous.",
        ],
      },
      {
        id: "servicio",
        titulo: "2. Le service",
        parrafos: [
          "iEureka-Grader aide les enseignants à corriger des activités faites sur papier : les élèves photographient leur feuille, l’intelligence artificielle suggère une évaluation et l’enseignant la vérifie et la valide. Les suggestions de l’IA peuvent comporter des erreurs ; la note finale relève de l’enseignant.",
        ],
      },
      {
        id: "cuentas",
        titulo: "3. Votre compte",
        parrafos: [],
        lista: [
          "Fournissez des informations exactes et gardez votre mot de passe secret. Vous êtes responsable de l’usage de votre compte.",
          "L’enseignant n’inscrit que ses élèves et n’envoie des feuilles qu’à des fins éducatives.",
          "Prévenez-nous à {correo} si vous soupçonnez une utilisation de votre compte par un tiers.",
        ],
      },
      {
        id: "uso",
        titulo: "4. Utilisation autorisée",
        parrafos: ["Il est interdit de :"],
        lista: [
          "Envoyer des contenus illicites, offensants ou de personnes qui ne sont pas vos élèves.",
          "Tenter d’accéder aux comptes ou données d’autrui, surcharger le service ou contourner sa sécurité.",
          "Copier, revendre ou utiliser le service ou ses résultats pour créer un produit concurrent ou entraîner des modèles d’IA.",
        ],
      },
      {
        id: "creditos",
        titulo: "5. Crédits et paiements",
        parrafos: [
          "Les corrections consomment des crédits selon le niveau de précision choisi. Les prix affichés incluent la TVA le cas échéant. Les crédits ne sont pas de l’argent, ne produisent pas d’intérêts et ne sont pas remboursables, sauf obligation légale ou défaillance de notre fait. Vous pouvez demander une facture à {correo}.",
        ],
      },
      {
        id: "propiedad",
        titulo: "6. Propriété intellectuelle",
        parrafos: [
          "Le logiciel, le design, la marque iEureka-Grader et son logo appartiennent à {razon}. Les activités, barèmes et solutions que vous envoyez restent les vôtres (ou ceux de votre établissement), et les feuilles appartiennent aux élèves. Vous nous autorisez uniquement à les stocker et à les traiter pour fournir le service.",
        ],
      },
      {
        id: "responsabilidad",
        titulo: "7. Limitation de responsabilité",
        parrafos: [
          "Le service est fourni « en l’état » ; nous faisons le raisonnable pour qu’il fonctionne et soit sûr, sans garantir l’absence d’interruptions ou d’erreurs. Dans la mesure permise par la loi, notre responsabilité totale est limitée à ce que vous avez payé au cours des 12 derniers mois. Rien ne limite vos droits de consommateur.",
        ],
      },
      {
        id: "baja",
        titulo: "8. Suspension et résiliation",
        parrafos: [
          "Vous pouvez cesser d’utiliser le service et demander la suppression de votre compte à tout moment. Nous pouvons suspendre un compte qui enfreint ces conditions, en vous prévenant si possible.",
        ],
      },
      {
        id: "cambios",
        titulo: "9. Modifications",
        parrafos: [
          "Nous pouvons mettre à jour ces conditions. La nouvelle version sera publiée avec sa date et, en cas de changement important, nous vous demanderons de l’accepter à nouveau.",
        ],
      },
      {
        id: "ley",
        titulo: "10. Droit applicable",
        parrafos: [
          "Ces conditions sont régies par le droit mexicain et tout litige relève des tribunaux compétents du Mexique, sauf si la loi de votre pays vous permet de saisir les tribunaux de votre domicile. La version espagnole prévaut sur les traductions.",
        ],
      },
    ],
  },

  paises: {
    titulo: "Conditions par pays",
    intro:
      "En plus de ce qui précède, ces règles s’appliquent selon le pays où vous vivez ou où se trouve votre établissement. Si deux règles s’appliquent, nous suivons la plus protectrice. Pour exercer ces droits, écrivez à {correo}.",
    lista: [
      {
        id: "mx",
        pais: "Mexique",
        leyes: "Loi fédérale sur la protection des données personnelles détenues par les particuliers (2025) et son règlement.",
        autoridad: "Secretaría Anticorrupción y Buen Gobierno.",
        puntos: [
          "Droits ARCO (accès, rectification, annulation et opposition) et retrait du consentement.",
          "Réponse sous 20 jours ouvrables ; application, le cas échéant, dans les 15 jours ouvrables suivants.",
          "Les mineurs agissent par l’intermédiaire de leurs parents ou tuteur.",
        ],
      },
      {
        id: "us",
        pais: "États-Unis",
        leyes: "FERPA, COPPA, lois des États sur la vie privée des élèves (comme SOPIPA) et CCPA/CPRA de Californie.",
        autoridad: "Département de l’Éducation (FERPA), Federal Trade Commission (COPPA) et California Privacy Protection Agency.",
        puntos: [
          "FERPA : lorsqu’un établissement nous mandate, nous agissons comme « school official » sous son contrôle ; les parents ou élèves majeurs demandent l’accès ou la rectification via l’établissement.",
          "COPPA : pour les moins de 13 ans, l’établissement peut consentir pour un usage éducatif uniquement ; sinon le consentement parental est nécessaire.",
          "Californie : droit de savoir, d’effacer et de corriger. Nous ne vendons ni ne partageons de données pour la publicité ciblée. Réponse sous 45 jours, sans discrimination.",
        ],
      },
      {
        id: "cl",
        pais: "Chili",
        leyes: "Loi 19.628, modifiée par la loi 21.719 (en vigueur à partir de décembre 2026).",
        autoridad: "Agence de protection des données personnelles.",
        puntos: [
          "Droits d’accès, de rectification, d’effacement, d’opposition, de portabilité et de blocage.",
          "Les données des moins de 14 ans requièrent le consentement des parents ou tuteurs.",
          "Réponse sous 30 jours calendaires, prorogeable une fois de 30 jours.",
        ],
      },
      {
        id: "ar",
        pais: "Argentine",
        leyes: "Loi 25.326 sur la protection des données personnelles et son décret d’application.",
        autoridad: "Agence d’accès à l’information publique (AAIP).",
        puntos: [
          "Accès gratuit tous les six mois ; réponse sous 10 jours calendaires.",
          "Rectification, mise à jour ou suppression sous 5 jours ouvrables.",
          "Possibilité de réclamation auprès de l’AAIP.",
        ],
      },
      {
        id: "es",
        pais: "Espagne",
        leyes: "Règlement général sur la protection des données (RGPD) et loi organique 3/2018 (LOPDGDD).",
        autoridad: "Agence espagnole de protection des données (AEPD).",
        puntos: [
          "Droits d’accès, de rectification, d’effacement, de limitation, de portabilité, d’opposition et de ne pas faire l’objet d’une décision entièrement automatisée : l’IA ne décide pas de la note, l’enseignant la vérifie.",
          "Les moins de 14 ans ont besoin du consentement de leurs parents ou tuteurs.",
          "Réponse sous un mois, prorogeable de deux mois pour les cas complexes.",
        ],
      },
      {
        id: "de",
        pais: "Allemagne",
        leyes: "RGPD et loi fédérale sur la protection des données (BDSG), ainsi que les lois scolaires des Länder.",
        autoridad: "Autorités de protection des données des Länder et BfDI.",
        puntos: [
          "Les mêmes droits RGPD.",
          "Les moins de 16 ans ont besoin du consentement parental.",
          "Pour l’usage scolaire, nous signons un contrat de sous-traitance (Auftragsverarbeitungsvertrag) avec l’établissement.",
        ],
      },
      {
        id: "it",
        pais: "Italie",
        leyes: "RGPD et Code de protection des données personnelles (décret législatif 196/2003, modifié par le décret 101/2018).",
        autoridad: "Garante per la protezione dei dati personali.",
        puntos: ["Les mêmes droits RGPD.", "Les moins de 14 ans ont besoin du consentement de leurs parents ou tuteurs."],
      },
      {
        id: "gr",
        pais: "Grèce",
        leyes: "RGPD et loi 4624/2019.",
        autoridad: "Autorité hellénique de protection des données (HDPA).",
        puntos: ["Les mêmes droits RGPD.", "Les moins de 15 ans ont besoin du consentement de leurs parents ou tuteurs."],
      },
      {
        id: "jp",
        pais: "Japon",
        leyes: "Loi sur la protection des informations personnelles (APPI).",
        autoridad: "Personal Information Protection Commission (PPC).",
        puntos: [
          "Droit de demander la communication, la correction, la suspension de l’utilisation ou la suppression de vos données.",
          "Avant d’envoyer des données à un prestataire étranger, nous indiquons le pays et son régime de protection et, si la loi l’exige, demandons votre consentement.",
          "Selon les lignes directrices de la PPC, le consentement parental est en général requis pour les enfants de moins de 12 à 15 ans environ.",
        ],
      },
      {
        id: "cn",
        pais: "Chine",
        leyes: "Loi sur la protection des informations personnelles (PIPL).",
        autoridad: "Administration du cyberespace de Chine (CAC).",
        puntos: [
          "Les données des moins de 14 ans sont sensibles : consentement distinct des parents ou tuteurs requis.",
          "Le transfert hors de Chine requiert votre consentement distinct et un mécanisme légal (contrat type, certification ou évaluation de sécurité).",
          "Droits de savoir, de décider, d’accéder, de copier, de corriger, d’effacer, de portabilité et d’obtenir des explications sur le traitement.",
        ],
      },
    ],
  },
};

export default fr;
