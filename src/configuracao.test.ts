import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lerConfiguracao } from "./configuracao.ts";

describe("limites de requisições na configuração da Instância", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://usuario:senha@localhost:5432/licencas");
    vi.stubEnv("ADMIN_USUARIO", "admin");
    vi.stubEnv("ADMIN_SENHA_HASH", "scrypt:1:1:1:sal:hash");
    vi.stubEnv("SESSAO_SEGREDO", "x".repeat(32));
    vi.stubEnv("CHAVES_SEGREDO", "y".repeat(32));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("usa valores padrão, separados para a Validação e para a entrada do Administrador", () => {
    const configuracao = lerConfiguracao();
    expect(configuracao.limiteValidacao).toEqual({ maximo: 60, janelaSegundos: 60 });
    expect(configuracao.limiteEntrada).toEqual({ maximo: 10, janelaSegundos: 900 });
  });

  it("lê os valores definidos nas variáveis de ambiente", () => {
    vi.stubEnv("LIMITE_VALIDACAO_REQUISICOES", "120");
    vi.stubEnv("LIMITE_VALIDACAO_JANELA_SEGUNDOS", "30");
    vi.stubEnv("LIMITE_ENTRADA_TENTATIVAS", "5");
    vi.stubEnv("LIMITE_ENTRADA_JANELA_SEGUNDOS", "600");
    const configuracao = lerConfiguracao();
    expect(configuracao.limiteValidacao).toEqual({ maximo: 120, janelaSegundos: 30 });
    expect(configuracao.limiteEntrada).toEqual({ maximo: 5, janelaSegundos: 600 });
  });

  it.each(["0", "-1", "1.5", "dez", ""])("recusa um limite que não é um inteiro maior que zero: %j", (valor) => {
    vi.stubEnv("LIMITE_ENTRADA_TENTATIVAS", valor);
    expect(() => lerConfiguracao()).toThrow(
      "LIMITE_ENTRADA_TENTATIVAS precisa ser um número inteiro maior que zero.",
    );
  });
});
