import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Aplica, em ordem, as migrações pendentes da pasta `drizzle/`. */
export async function migrar(url: string, pastaMigracoes: string) {
  const conexao = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(conexao), { migrationsFolder: pastaMigracoes });
  } finally {
    await conexao.end();
  }
}
