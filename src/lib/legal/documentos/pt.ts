// Textos jurídicos em português (tradução de cortesia da versão em espanhol). RASCUNHO para revisão jurídica.
import type { TextosLegales } from "../tipos";

const pt: TextosLegales = {
  aviso: {
    titulo: "Aviso de privacidade",
    resumen:
      "Quem trata seus dados no iEureka-Grader, para quê, com quem são compartilhados e como exercer seus direitos. Aplica-se a professores, alunos e visitantes do site.",
    secciones: [
      {
        id: "responsable",
        titulo: "1. Quem é o controlador dos seus dados",
        parrafos: [
          "{razon} (“iEureka”), com endereço em {domicilio}, é o controlador dos dados pessoais coletados por meio de {sitio} e do aplicativo iEureka-Grader.",
          "Quando uma escola ou professor cadastra alunos e envia suas folhas, é a escola ou o professor que decide quais dados são usados e para quê. Nesse caso, a iEureka trata os dados acadêmicos em nome deles e apenas para prestar o serviço.",
        ],
      },
      {
        id: "datos",
        titulo: "2. Quais dados coletamos",
        parrafos: ["Pedimos apenas o necessário para corrigir atividades impressas:"],
        lista: [
          "Professores: nome, e-mail, senha (armazenada com hash, nunca em texto puro), idioma, preferências de avaliação, cursos e atividades criados e histórico de créditos e compras.",
          "Alunos: nome, matrícula, e-mail, código de acesso (com hash), cursos, fotos ou PDFs das folhas e as notas, comentários e relatórios gerados.",
          "Dados técnicos: o endereço IP, consultado na hora para escolher idioma e moeda e não guardado no perfil, e os cookies de sessão e idioma.",
          "Pagamentos: o processador de pagamentos recebe os dados do cartão. A iEureka não os vê nem os guarda; guardamos apenas o plano e o valor.",
        ],
      },
      {
        id: "sensibles",
        titulo: "3. Dados sensíveis e de menores",
        parrafos: [
          "Não pedimos dados sensíveis (saúde, religião, origem étnica, biometria etc.). Pedimos que não sejam escritos nas folhas nem nos comentários. Se uma folha os contiver por acidente, serão usados só para corrigi-la.",
          "Muitos alunos são menores de idade. Por isso, a escola ou o professor deve ter a autorização dos pais ou responsáveis quando a lei exigir, e o aluno menor deve criar sua conta com o conhecimento do responsável. Se um responsável pedir a exclusão dos dados do filho, nós a fazemos.",
        ],
      },
      {
        id: "finalidades",
        titulo: "4. Para que usamos seus dados",
        parrafos: ["Finalidades necessárias para o serviço (sem elas não podemos prestá-lo):"],
        lista: [
          "Criar e proteger sua conta e permitir o acesso com e-mail e senha ou código.",
          "Receber as folhas, lê-las com apoio de inteligência artificial e sugerir nota, marcas e comentários que o professor revisa e aprova.",
          "Gerar relatórios, análises da turma, o diário de notas e arquivos para o Canvas ou outras plataformas.",
          "Enviar e-mails do serviço, como recuperação de senha ou avisos de exclusão.",
          "Cobrar os créditos, emitir notas fiscais e cumprir obrigações fiscais.",
          "Atender dúvidas, reclamações e solicitações de direitos, e prevenir fraudes ou usos indevidos.",
        ],
      },
      {
        id: "secundarias",
        titulo: "5. Finalidades opcionais",
        parrafos: [
          "Com sua permissão, podemos enviar novidades ou convites para pesquisas. Você pode recusar a qualquer momento escrevendo para {correo}; isso não afeta o serviço.",
          "Podemos gerar estatísticas agregadas e anônimas para melhorar o produto. Elas não identificam ninguém.",
          "Não vendemos dados pessoais, não os usamos para publicidade e não usamos as folhas dos alunos para treinar modelos de inteligência artificial.",
        ],
      },
      {
        id: "ia",
        titulo: "6. Como usamos a inteligência artificial",
        parrafos: [
          "Para ler as folhas usamos um fornecedor de inteligência artificial que atua como operador. Enviamos só a imagem das respostas, a rubrica e a solução do professor; nunca o nome nem a matrícula do aluno.",
          "As notas e estatísticas são calculadas pelo software da iEureka, não pela IA. A IA sugere; o professor revisa, corrige e decide o que o aluno vê.",
        ],
      },
      {
        id: "transferencias",
        titulo: "7. Com quem compartilhamos seus dados",
        parrafos: [
          "Apenas com fornecedores que nos ajudam a prestar o serviço e estão obrigados à confidencialidade e segurança: hospedagem, envio de e-mails, pagamentos e inteligência artificial. Alguns ficam fora do México (por exemplo, nos Estados Unidos).",
          "Os dados do aluno são vistos pelo seu professor, e o aluno vê apenas seus próprios resultados.",
          "Também podemos fornecer dados a autoridades quando uma lei ou ordem judicial exigir.",
          "Para qualquer outra finalidade, pediríamos seu consentimento antes.",
        ],
      },
      {
        id: "conservacion",
        titulo: "8. Por quanto tempo guardamos os dados",
        parrafos: [],
        lista: [
          "Fotos das folhas: {dias} dias após a liberação dos resultados; depois são arquivadas no PDF corrigido e apagadas.",
          "Atividades, relatórios e notas: {anio} dias após o último relatório. Avisamos o professor antes de apagar.",
          "Contas: enquanto estiverem ativas. A pedido, apagamos a conta, exceto o que a lei nos obriga a guardar (por exemplo, dados fiscais de compras).",
        ],
      },
      {
        id: "derechos",
        titulo: "9. Seus direitos e como exercê-los",
        parrafos: [
          "Você pode pedir acesso, correção, exclusão ou se opor a um uso dos seus dados, além de revogar o consentimento ou pedir a limitação do tratamento.",
          "Escreva para {correo} a partir do e-mail da sua conta com seu nome, o direito que deseja exercer e quais dados, e uma cópia de um documento de identidade (ou, se for responsável, o seu e um comprovante). Respondemos no prazo legal do seu país.",
          "Se você é aluno e sua escola administra sua conta, também pode pedir ao professor ou à escola.",
          "Se achar que não atendemos bem sua solicitação, pode recorrer à autoridade de proteção de dados do seu país (no Brasil, a ANPD).",
        ],
      },
      {
        id: "cookies",
        titulo: "10. Cookies",
        parrafos: [
          "Usamos só cookies necessários: um para manter sua sessão e outro para lembrar seu idioma. Não usamos cookies de publicidade nem de rastreamento de terceiros. Se bloqueá-los, não poderá entrar.",
        ],
      },
      {
        id: "seguridad",
        titulo: "11. Segurança",
        parrafos: [
          "Conexão criptografada (HTTPS), senhas com hash, sessões que expiram, acessos separados por professor e cópias de segurança. Nenhum sistema é 100% seguro: se ocorrer um incidente que afete seus direitos, avisaremos sem demora.",
        ],
      },
      {
        id: "cambios",
        titulo: "12. Alterações",
        parrafos: [
          "Publicaremos aqui qualquer alteração com a nova data. Se for importante, avisaremos ao entrar ou por e-mail e, quando a lei exigir, pediremos que aceite de novo.",
        ],
      },
    ],
  },

  politica: {
    titulo: "Política de dados pessoais",
    resumen:
      "Os princípios e regras internas com que o iEureka-Grader cuida dos dados de professores e alunos, e as condições que se aplicam em cada país.",
    secciones: [
      {
        id: "alcance",
        titulo: "1. Abrangência",
        parrafos: [
          "Esta política se aplica a todos os dados pessoais tratados por {razon} ao operar o iEureka-Grader, na web e no aplicativo, e às pessoas e fornecedores que trabalham com eles. Complementa o Aviso de privacidade.",
        ],
      },
      {
        id: "principios",
        titulo: "2. Princípios",
        parrafos: [],
        lista: [
          "Licitude e boa-fé: só com base legal e sem enganos.",
          "Consentimento: pedido de forma clara quando a lei exigir, e revogável.",
          "Transparência: explicamos em linguagem simples.",
          "Qualidade: mantemos os dados corretos e atualizados.",
          "Finalidade: usamos os dados só para o que informamos.",
          "Minimização: o mínimo necessário. Nunca enviamos nomes ou matrículas à IA.",
          "Retenção limitada: apagamos o que não é mais necessário, com prazos definidos.",
          "Responsabilização: documentamos o que fazemos e respondemos por isso.",
        ],
      },
      {
        id: "roles",
        titulo: "3. Quem decide e quem trata",
        parrafos: [
          "A iEureka é controladora dos dados de contas, pagamentos e operação do site.",
          "Para folhas, notas e relatórios dos alunos, a escola ou o professor decide o uso. A iEureka os trata em nome deles como operadora (no Brasil, nos termos da LGPD; na Europa, art. 28 do RGPD). Podemos assinar um contrato de tratamento de dados com as escolas que pedirem.",
          "O professor se compromete a cadastrar só seus alunos, usar os dados com fins educacionais e ter as autorizações exigidas.",
        ],
      },
      {
        id: "menores",
        titulo: "4. Menores de idade",
        parrafos: [
          "O iEureka-Grader é uma ferramenta para professores. Alunos menores o usam por indicação do professor e com o conhecimento do responsável. Sem publicidade, sem perfis comerciais e sem venda de dados de menores; sempre no melhor interesse da criança e do adolescente.",
          "Quando um país fixa uma idade mínima para consentir (por exemplo, 13 nos EUA, 14 na Espanha, Itália, Chile ou China, 15 na Grécia e 16 na Alemanha; no Brasil, crianças até 12 anos exigem consentimento específico de um dos pais), o consentimento é dado pela escola, quando a lei permitir, ou pelos pais ou responsáveis.",
        ],
      },
      {
        id: "proveedores",
        titulo: "5. Fornecedores (operadores)",
        parrafos: [
          "Trabalhamos só com fornecedores obrigados por contrato a usar os dados apenas para nos atender, protegê-los e apagá-los ao final: hospedagem do servidor e do e-mail, um fornecedor de inteligência artificial (sem treinamento com os dados enviados) e um processador de pagamentos. A lista atualizada está disponível em {correo}.",
        ],
      },
      {
        id: "internacional",
        titulo: "6. Transferências internacionais",
        parrafos: [
          "Alguns fornecedores ficam fora do país do usuário. Quando a lei exigir, usamos garantias como cláusulas contratuais padrão (Europa e Brasil), contratos padrão ou o consentimento específico do titular (China, Japão).",
        ],
      },
      {
        id: "seguridad",
        titulo: "7. Medidas de segurança",
        parrafos: [],
        lista: [
          "Conexão criptografada (HTTPS) e senhas com hash de via única (scrypt).",
          "Dados separados por professor; cada aluno vê só os seus.",
          "Links de recuperação e sessões com validade.",
          "Exclusão automática de fotos e atividades conforme os prazos do Aviso de privacidade.",
          "Acesso ao servidor restrito a pessoal autorizado, e cópias de segurança.",
        ],
      },
      {
        id: "incidentes",
        titulo: "8. Incidentes de segurança",
        parrafos: [
          "Se um incidente afetar significativamente os direitos das pessoas, investigamos, contemos, avisamos sem demora os afetados e a escola, e a autoridade quando a lei exigir (na Europa, em até 72 horas).",
        ],
      },
      {
        id: "solicitudes",
        titulo: "9. Atendimento de direitos",
        parrafos: [
          "Atendemos as solicitações em {correo}. Verificamos a identidade, respondemos no prazo legal do país do titular (o mais curto aplicável) e sem custo, salvo despesas de envio ou cópia permitidas por lei.",
        ],
      },
    ],
  },

  terminos: {
    titulo: "Termos e condições de uso",
    resumen: "As regras para usar o iEureka-Grader. Ao criar uma conta, você as aceita.",
    secciones: [
      {
        id: "aceptacion",
        titulo: "1. Aceitação",
        parrafos: [
          "Estes termos são um acordo entre você e {razon}. Ao criar uma conta ou usar o serviço, você declara que os leu e aceita, junto com o Aviso de privacidade e a Política de dados pessoais. Se for menor de idade, seus pais ou responsável devem aceitá-los com você.",
        ],
      },
      {
        id: "servicio",
        titulo: "2. O serviço",
        parrafos: [
          "O iEureka-Grader ajuda professores a corrigir atividades feitas em papel: os alunos fotografam a folha, a inteligência artificial sugere uma avaliação e o professor a revisa e aprova. As sugestões da IA podem ter erros; a nota final é responsabilidade do professor.",
        ],
      },
      {
        id: "cuentas",
        titulo: "3. Sua conta",
        parrafos: [],
        lista: [
          "Forneça dados verdadeiros e mantenha sua senha em segredo. O que for feito com sua conta é sua responsabilidade.",
          "O professor só deve cadastrar seus alunos e enviar folhas com fins educacionais.",
          "Avise-nos em {correo} se suspeitar que alguém usa sua conta.",
        ],
      },
      {
        id: "uso",
        titulo: "4. Uso permitido",
        parrafos: ["Não é permitido:"],
        lista: [
          "Enviar conteúdo ilegal, ofensivo ou de pessoas que não são seus alunos.",
          "Tentar acessar contas ou dados alheios, sobrecarregar o serviço ou burlar sua segurança.",
          "Copiar, revender ou usar o serviço ou seus resultados para criar um produto concorrente ou treinar modelos de IA.",
        ],
      },
      {
        id: "creditos",
        titulo: "5. Créditos e pagamentos",
        parrafos: [
          "As correções consomem créditos conforme o nível de precisão escolhido. Os preços publicados incluem impostos quando aplicável. Créditos não são dinheiro, não rendem juros e não são reembolsáveis, salvo quando a lei exigir ou o serviço falhar por nossa culpa. Peça sua nota fiscal em {correo}.",
        ],
      },
      {
        id: "propiedad",
        titulo: "6. Propriedade intelectual",
        parrafos: [
          "O software, o design, a marca iEureka-Grader e seu logotipo pertencem a {razon}. As atividades, rubricas e soluções que você envia continuam suas (ou da sua escola), e as folhas são dos alunos. Você nos autoriza apenas a guardá-las e processá-las enquanto prestamos o serviço.",
        ],
      },
      {
        id: "responsabilidad",
        titulo: "7. Limitação de responsabilidade",
        parrafos: [
          "Prestamos o serviço “no estado em que se encontra” e fazemos o razoável para que funcione e seja seguro, sem garantir que não haja interrupções ou erros. Na medida permitida por lei, nossa responsabilidade total se limita ao que você pagou nos últimos 12 meses. Nada aqui limita seus direitos de consumidor.",
        ],
      },
      {
        id: "baja",
        titulo: "8. Suspensão e encerramento",
        parrafos: [
          "Você pode deixar de usar o serviço e pedir a exclusão da conta quando quiser. Podemos suspender uma conta que descumpra estes termos, avisando quando possível.",
        ],
      },
      {
        id: "cambios",
        titulo: "9. Alterações",
        parrafos: [
          "Podemos atualizar estes termos. Publicaremos a nova versão com data e, se a mudança for importante, pediremos que a aceite de novo.",
        ],
      },
      {
        id: "ley",
        titulo: "10. Lei aplicável",
        parrafos: [
          "Estes termos são regidos pelas leis do México e qualquer controvérsia será resolvida pelos tribunais competentes do México, salvo se a lei do seu país lhe der o direito de recorrer aos tribunais do seu domicílio. A versão em espanhol prevalece sobre as traduções.",
        ],
      },
    ],
  },

  paises: {
    titulo: "Condições por país",
    intro:
      "Além do anterior, estas regras se aplicam conforme o país onde você mora ou onde fica sua escola. Se duas regras se aplicarem, seguimos a que mais protege você. Para exercer qualquer desses direitos, escreva para {correo}.",
    lista: [
      {
        id: "mx",
        pais: "México",
        leyes: "Lei Federal de Proteção de Dados Pessoais em Posse de Particulares (2025) e seu regulamento.",
        autoridad: "Secretaría Anticorrupción y Buen Gobierno.",
        puntos: [
          "Direitos ARCO (acesso, retificação, cancelamento e oposição) e revogação do consentimento.",
          "Resposta em até 20 dias úteis; se procedente, aplicada nos 15 dias úteis seguintes.",
          "Menores agem por meio dos pais ou responsáveis.",
        ],
      },
      {
        id: "us",
        pais: "Estados Unidos",
        leyes: "FERPA, COPPA, leis estaduais de privacidade estudantil (como a SOPIPA) e CCPA/CPRA da Califórnia.",
        autoridad: "Departamento de Educação (FERPA), Federal Trade Commission (COPPA) e California Privacy Protection Agency.",
        puntos: [
          "FERPA: quando uma escola nos contrata, atuamos como “school official” sob seu controle; pais ou alunos maiores pedem acesso ou correção por meio da escola.",
          "COPPA: para menores de 13 anos, a escola pode consentir só para uso educacional; caso contrário, é necessário o consentimento dos pais.",
          "Califórnia: direito de saber, apagar e corrigir. Não vendemos nem compartilhamos dados para publicidade direcionada. Resposta em 45 dias, sem discriminação.",
        ],
      },
      {
        id: "cl",
        pais: "Chile",
        leyes: "Lei 19.628, reformada pela Lei 21.719 (em vigor a partir de dezembro de 2026).",
        autoridad: "Agência de Proteção de Dados Pessoais.",
        puntos: [
          "Direitos de acesso, retificação, supressão, oposição, portabilidade e bloqueio.",
          "Dados de menores de 14 anos exigem consentimento dos pais ou responsáveis.",
          "Resposta em até 30 dias corridos, prorrogáveis uma vez por mais 30.",
        ],
      },
      {
        id: "ar",
        pais: "Argentina",
        leyes: "Lei 25.326 de Proteção de Dados Pessoais e seu decreto regulamentar.",
        autoridad: "Agência de Acesso à Informação Pública (AAIP).",
        puntos: [
          "Acesso gratuito a cada seis meses; resposta em 10 dias corridos.",
          "Retificação, atualização ou supressão em 5 dias úteis.",
          "É possível reclamar à AAIP.",
        ],
      },
      {
        id: "es",
        pais: "Espanha",
        leyes: "Regulamento Geral sobre a Proteção de Dados (RGPD) e Lei Orgânica 3/2018 (LOPDGDD).",
        autoridad: "Agência Espanhola de Proteção de Dados (AEPD).",
        puntos: [
          "Direitos do RGPD, incluindo não ser sujeito a decisões exclusivamente automatizadas: a IA não decide a nota, o professor a revisa.",
          "Menores de 14 anos precisam do consentimento dos pais ou responsáveis.",
          "Resposta em um mês, prorrogável por mais dois em casos complexos.",
        ],
      },
      {
        id: "de",
        pais: "Alemanha",
        leyes: "RGPD e Lei Federal de Proteção de Dados (BDSG), além das leis escolares de cada estado.",
        autoridad: "Autoridades de proteção de dados de cada estado e o BfDI.",
        puntos: [
          "Os mesmos direitos do RGPD.",
          "Menores de 16 anos precisam do consentimento dos pais.",
          "Para uso escolar, assinamos um contrato de tratamento de dados (Auftragsverarbeitungsvertrag) com a escola.",
        ],
      },
      {
        id: "it",
        pais: "Itália",
        leyes: "RGPD e Código de Proteção de Dados Pessoais (D. Lgs. 196/2003, alterado pelo D. Lgs. 101/2018).",
        autoridad: "Garante per la protezione dei dati personali.",
        puntos: ["Os mesmos direitos do RGPD.", "Menores de 14 anos precisam do consentimento dos pais ou responsáveis."],
      },
      {
        id: "gr",
        pais: "Grécia",
        leyes: "RGPD e Lei 4624/2019.",
        autoridad: "Autoridade Helênica de Proteção de Dados (HDPA).",
        puntos: ["Os mesmos direitos do RGPD.", "Menores de 15 anos precisam do consentimento dos pais ou responsáveis."],
      },
      {
        id: "jp",
        pais: "Japão",
        leyes: "Lei de Proteção de Informações Pessoais (APPI).",
        autoridad: "Personal Information Protection Commission (PPC).",
        puntos: [
          "Direito de pedir divulgação, correção, suspensão do uso ou exclusão dos dados.",
          "Antes de enviar dados a um fornecedor em outro país, informamos o país e seu regime de proteção e, quando a lei exigir, pedimos consentimento.",
          "Segundo as diretrizes da PPC, em geral pede-se o consentimento dos pais para menores de cerca de 12 a 15 anos.",
        ],
      },
      {
        id: "cn",
        pais: "China",
        leyes: "Lei de Proteção de Informações Pessoais (PIPL).",
        autoridad: "Administração do Ciberespaço da China (CAC).",
        puntos: [
          "Dados de menores de 14 anos são sensíveis: exigem consentimento específico dos pais ou responsáveis.",
          "Enviar dados para fora da China exige seu consentimento específico e um mecanismo legal (contrato padrão, certificação ou avaliação de segurança).",
          "Direitos de saber, decidir, acessar, copiar, corrigir, apagar, portabilidade e pedir explicações sobre o tratamento.",
        ],
      },
    ],
  },
};

export default pt;
