export function urlBancoTeste(): string {
  const url = process.env.DATABASE_URL_TESTE;
  if (!url) {
    throw new Error(
      "Defina DATABASE_URL_TESTE (veja o README) e suba o Postgres com `docker compose up -d postgres`.",
    );
  }
  return url;
}
