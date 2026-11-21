// Esquema do banco (Drizzle). As tabelas do domínio entram aqui conforme os
// casos de uso do núcleo forem implementados. Depois de alterar este arquivo,
// gere a migração com `pnpm db:gerar` e faça commit dela.
import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const clientes = pgTable(
  "clientes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nome: text("nome").notNull(),
    /** Guardado já normalizado (sem espaços nas pontas e em minúsculas) pelo núcleo. */
    email: text("email").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull(),
  },
  (tabela) => [
    // Dois Clientes não podem ter o mesmo e-mail na Instância, sem diferenciar maiúsculas.
    uniqueIndex("clientes_email_unico").on(sql`lower(${tabela.email})`),
  ],
);
