import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as esquema from "./esquema.ts";

export function conectarBanco(url: string) {
  const conexao = postgres(url, { onnotice: () => {} });
  return { banco: drizzle(conexao, { schema: esquema }), encerrar: () => conexao.end() };
}

export type Banco = ReturnType<typeof conectarBanco>["banco"];
