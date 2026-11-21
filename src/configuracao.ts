/** Configuração da Instância, lida das variáveis de ambiente. Veja o README. */
export interface Configuracao {
  urlBanco: string;
  adminUsuario: string;
  adminSenhaHash: string;
  sessaoSegredo: string;
  sessaoHoras: number;
}

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Configuração ausente: defina a variável ${nome}.`);
  return valor;
}

export function lerConfiguracao(): Configuracao {
  const sessaoSegredo = obrigatoria("SESSAO_SEGREDO");
  if (sessaoSegredo.length < 32) {
    throw new Error("SESSAO_SEGREDO precisa ter no mínimo 32 caracteres.");
  }
  const sessaoHoras = Number(process.env.SESSAO_HORAS ?? "8");
  if (!Number.isFinite(sessaoHoras) || sessaoHoras <= 0) {
    throw new Error("SESSAO_HORAS precisa ser um número de horas maior que zero.");
  }
  return {
    urlBanco: obrigatoria("DATABASE_URL"),
    adminUsuario: obrigatoria("ADMIN_USUARIO"),
    adminSenhaHash: obrigatoria("ADMIN_SENHA_HASH"),
    sessaoSegredo,
    sessaoHoras,
  };
}
