import postgres from "postgres";
import { afterAll, beforeEach } from "vitest";
import { urlBancoTeste } from "./url-banco-teste.ts";

const conexao = postgres(urlBancoTeste(), { max: 1, onnotice: () => {} });

/** Esvazia todas as tabelas do domínio antes de cada teste. */
beforeEach(async () => {
  const tabelas = await conexao<{ nome: string }[]>`
    SELECT quote_ident(tablename) AS nome FROM pg_tables WHERE schemaname = 'public'`;
  if (tabelas.length > 0) {
    await conexao.unsafe(`TRUNCATE ${tabelas.map((t) => t.nome).join(", ")} RESTART IDENTITY CASCADE`);
  }
});

afterAll(() => conexao.end());
