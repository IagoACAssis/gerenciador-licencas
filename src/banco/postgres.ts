// Limites e erros do Postgres que o núcleo traduz em regras e mensagens.

/** Teto do `integer` do Postgres: acima dele, o número vira mensagem, e não erro do banco. */
export const MAIOR_INTEIRO = 2_147_483_647;

/** Id que cabe numa coluna `integer` gerada por identidade (de 1 em diante). */
export function idValido(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAIOR_INTEIRO;
}

/** O erro é a violação (23505) de um destes índices únicos. O Drizzle embrulha o erro do driver em `cause`. */
export function violouUnicidade(erro: unknown, ...restricoes: string[]): boolean {
  const causa = erro instanceof Error && erro.cause ? erro.cause : erro;
  const { code, constraint_name } = (causa ?? {}) as { code?: string; constraint_name?: string };
  return code === "23505" && !!constraint_name && restricoes.includes(constraint_name);
}
