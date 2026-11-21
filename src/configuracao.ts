import type { ConfiguracaoLimite } from "./limite/limitador.ts";

/** Configuração da Instância, lida das variáveis de ambiente. Veja o README. */
export interface Configuracao {
  urlBanco: string;
  adminUsuario: string;
  adminSenhaHash: string;
  sessaoSegredo: string;
  sessaoHoras: number;
  chavesSegredo: string;
  /** Requisições por IP aceitas pela API de Validação a cada janela. */
  limiteValidacao: ConfiguracaoLimite;
  /** Tentativas de entrada do Administrador aceitas por IP a cada janela. */
  limiteEntrada: ConfiguracaoLimite;
}

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Configuração ausente: defina a variável ${nome}.`);
  return valor;
}

function inteiroPositivo(nome: string, padrao: number): number {
  const valor = Number(process.env[nome] ?? padrao);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${nome} precisa ser um número inteiro maior que zero.`);
  }
  return valor;
}

export function lerConfiguracao(): Configuracao {
  const sessaoSegredo = obrigatoria("SESSAO_SEGREDO");
  if (sessaoSegredo.length < 32) {
    throw new Error("SESSAO_SEGREDO precisa ter no mínimo 32 caracteres.");
  }
  const chavesSegredo = obrigatoria("CHAVES_SEGREDO");
  if (chavesSegredo.length < 32) {
    throw new Error("CHAVES_SEGREDO precisa ter no mínimo 32 caracteres.");
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
    chavesSegredo,
    limiteValidacao: {
      maximo: inteiroPositivo("LIMITE_VALIDACAO_REQUISICOES", 60),
      janelaSegundos: inteiroPositivo("LIMITE_VALIDACAO_JANELA_SEGUNDOS", 60),
    },
    limiteEntrada: {
      maximo: inteiroPositivo("LIMITE_ENTRADA_TENTATIVAS", 10),
      janelaSegundos: inteiroPositivo("LIMITE_ENTRADA_JANELA_SEGUNDOS", 900),
    },
  };
}
