/** Usuário e banco criados por docker/criar-banco-teste.sql; DATABASE_URL_TESTE sobrescreve. */
const URL_PADRAO = "postgres://teste:teste@localhost:5432/licencas_teste";

export function urlBancoTeste(): string {
  return process.env.DATABASE_URL_TESTE || URL_PADRAO;
}
