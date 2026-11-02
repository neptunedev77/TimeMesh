export const ptPT = {
  metadata: {
    title: "TimeMesh",
    description:
      "Coordena projetos, reuniões e atividades sem conversas intermináveis.",
  },
  landing: {
    title: "Encontrem o tempo que têm em comum.",
    description:
      "Coordena projetos, reuniões e atividades sem conversas intermináveis. Partilhem a disponibilidade, descubram o tempo livre em comum e planeiem em conjunto.",
    cta: "Criar um projeto",
    login: "Entrar",
    previewLabel:
      "Exemplo ilustrativo de uma semana, com os horários mais escuros quando há mais pessoas disponíveis.",
    previewTitle: "Exemplo de uma semana",
    previewBest: "Melhor horário: quinta, 18:00–20:00",
    previewCount: "5 de 5 disponíveis",
    features: [
      {
        title: "Basta um link",
        description: "Os participantes entram sem criar conta nem instalar nada.",
      },
      {
        title: "Disponibilidade em conjunto",
        description: "Vê num só sítio quando cada pessoa está disponível.",
      },
      {
        title: "Grupos flexíveis",
        description: "Encontra boas opções, mesmo quando nem todos podem ir.",
      },
    ],
  },
  auth: {
    fields: {
      name: "Nome",
      email: "Email",
      password: "Palavra-passe",
      newPassword: "Nova palavra-passe",
    },
    login: {
      title: "Entrar",
      description: "Bem-vindo de volta ao TimeMesh.",
      submit: "Entrar",
      forgot: "Esqueceste-te da palavra-passe?",
      switchText: "Ainda não tens conta?",
      switchLink: "Criar conta",
    },
    register: {
      title: "Criar conta",
      description: "Cria projetos e encontra o tempo que têm em comum.",
      submit: "Criar conta",
      switchText: "Já tens conta?",
      switchLink: "Entrar",
    },
    forgot: {
      title: "Recuperar palavra-passe",
      description: "Enviamos-te um link para definires uma nova palavra-passe.",
      submit: "Enviar link",
      switchText: "Já te lembraste?",
      switchLink: "Entrar",
    },
    reset: {
      title: "Nova palavra-passe",
      description: "Escolhe a palavra-passe que queres passar a usar.",
      submit: "Guardar palavra-passe",
      switchText: "O link não funcionou?",
      switchLink: "Pedir outro",
    },
    logout: "Terminar sessão",
    pending: "Um momento…",
    errors: {
      name: "Indica o teu nome.",
      email: "Indica um email válido.",
      password: "Indica a tua palavra-passe.",
      passwordLength: "A palavra-passe tem de ter pelo menos 8 caracteres.",
      invalidLogin: "O email ou a palavra-passe estão incorretos.",
      registerFailed: "Não foi possível criar a conta. Verifica os dados ou inicia sessão.",
      resetFailed: "Não foi possível alterar a palavra-passe. Pede um novo link e tenta outra vez.",
      linkFailed: "O link é inválido ou expirou. Pede um novo.",
      rateLimited: "Demasiadas tentativas. Aguarda um pouco e tenta outra vez.",
      generic: "Algo correu mal. Tenta outra vez.",
    },
    success: {
      confirmEmail: "Conta criada. Confirma o teu email para entrares.",
      resetSent: "Se existir uma conta com este email, vais receber um link em breve.",
    },
  },
  weekdays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
  nav: {
    label: "Navegação principal",
    dashboard: "Painel",
    projects: "Projetos",
    availability: "Disponibilidade",
    sessions: "Sessões",
    settings: "Definições",
  },
  pages: {
    dashboard: {
      title: "Painel",
      description: "Os teus projetos e próximas sessões num só sítio.",
      emptyTitle: "Ainda não tens projetos",
      emptyDescription: "Os projetos que criares ou em que participares vão aparecer aqui.",
    },
    projects: {
      title: "Projetos",
      description: "Projetos que crias e em que participas.",
      emptyTitle: "Sem projetos por agora",
      emptyDescription: "Quando tiveres um projeto, vais poder geri-lo a partir daqui.",
    },
    availability: {
      title: "Disponibilidade",
      description: "O teu horário habitual e as tuas exceções.",
      emptyTitle: "Sem horário definido",
      emptyDescription: "O teu horário habitual vai aparecer aqui.",
    },
    sessions: {
      title: "Sessões",
      description: "Sessões propostas e confirmadas.",
      emptyTitle: "Sem sessões agendadas",
      emptyDescription: "As sessões dos teus projetos vão aparecer aqui.",
    },
    settings: {
      title: "Definições",
      description: "As preferências da tua conta.",
      emptyTitle: "Sem definições disponíveis",
      emptyDescription: "As preferências da tua conta vão aparecer aqui.",
    },
  },
};
