import type es from "./es";

const ajustesAlumno: typeof es = {
  meta: "Ajustes",
  titulo: "Ajustes",
  subtitulo: "Seus dados de acesso e seus cursos arquivados.",
  cuentaTitulo: "Minha conta",
  correo: "E-mail: {correo} · Matrícula: {matricula}",
  nombre: "Nome",
  claveActual: "Chave de acesso atual",
  claveNueva: "Nova chave de acesso",
  claveConfirmar: "Confirme a nova chave",
  guardar: "Salvar",
  notaClave: "Deixe as chaves vazias se só mudar seu nome. A nova chave deve ter pelo menos {n} caracteres.",
  notaNombre: "Seu nome na lista de cada curso é administrado pelo seu professor.",
  archivadosNinguno: "Você não tem cursos arquivados. Arquive um curso com o ícone de caixa do cartão.",
  avisos: {
    nombreGuardado: "Seu nome foi salvo.",
    nombreYClave: "Seu nome e sua nova chave foram salvos.",
    escribeNombre: "Digite seu nome (pelo menos 3 letras).",
    claveCorta: "A nova chave deve ter pelo menos {n} caracteres.",
    noCoinciden: "As duas novas chaves não coincidem.",
    actualIncorrecta: "A chave de acesso atual não está correta.",
    cuentaNoExiste: "Sua conta não existe mais.",
  },
};

export default ajustesAlumno;
