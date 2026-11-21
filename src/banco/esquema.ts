// Esquema do banco (Drizzle). As tabelas do domínio entram aqui conforme os
// casos de uso do núcleo forem implementados. Depois de alterar este arquivo,
// gere a migração com `pnpm db:gerar` e faça commit dela.
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const produtos = pgTable("produtos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  identificador: text("identificador").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull(),
  janelaAvisoDias: integer("janela_aviso_dias").notNull(),
  carenciaDias: integer("carencia_dias").notNull(),
  limiteAtivacoesPadrao: integer("limite_ativacoes_padrao").notNull(),
  cotaSubstituicoesQuantidade: integer("cota_substituicoes_quantidade").notNull(),
  cotaSubstituicoesDias: integer("cota_substituicoes_dias").notNull(),
  toleranciaOfflineDias: integer("tolerancia_offline_dias").notNull(),
  chavePublica: text("chave_publica").notNull(),
  /** Chave privada Ed25519 cifrada com CHAVES_SEGREDO (veja src/nucleo/chaves.ts). */
  chavePrivadaCifrada: text("chave_privada_cifrada").notNull(),
  cadastradoEm: timestamp("cadastrado_em", { withTimezone: true }).notNull(),
});
