// Esquema do banco (Drizzle). As tabelas do domínio entram aqui conforme os
// casos de uso do núcleo forem implementados. Depois de alterar este arquivo,
// gere a migração com `pnpm db:gerar` e faça commit dela.
import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const licencas = pgTable(
  "licencas",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    produtoId: integer("produto_id").notNull().references(() => produtos.id),
    clienteId: integer("cliente_id").notNull().references(() => clientes.id),
    /** SHA-256 (hex) da Chave de licença normalizada. A Chave em si nunca é guardada (ADR-0003). */
    hashChave: text("hash_chave").notNull(),
    /** Primeiros caracteres da Chave, sem hífen, para identificar a Licença no painel. */
    prefixoChave: text("prefixo_chave").notNull(),
    /** Vazia = Licença perpétua. */
    validaAte: timestamp("valida_ate", { withTimezone: true }),
    /** Vazio = segue o Limite de ativações padrão atual do Produto. */
    limiteAtivacoes: integer("limite_ativacoes"),
    emitidaEm: timestamp("emitida_em", { withTimezone: true }).notNull(),
  },
  (tabela) => [
    uniqueIndex("licencas_hash_chave_unico").on(tabela.hashChave),
    uniqueIndex("licencas_prefixo_chave_unico").on(tabela.prefixoChave),
    index("licencas_produto").on(tabela.produtoId),
    index("licencas_cliente").on(tabela.clienteId),
  ],
);

/** Histórico da Licença: um registro por evento, com os dados do evento em JSON. */
export const eventosLicenca = pgTable(
  "eventos_licenca",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    licencaId: integer("licenca_id").notNull().references(() => licencas.id),
    tipo: text("tipo").notNull(),
    dados: jsonb("dados").notNull(),
    ocorridoEm: timestamp("ocorrido_em", { withTimezone: true }).notNull(),
  },
  (tabela) => [index("eventos_licenca_licenca").on(tabela.licencaId)],
);

/** Vínculo entre uma Licença e um Dispositivo. Um por Licença + Dispositivo. */
export const ativacoes = pgTable(
  "ativacoes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    licencaId: integer("licenca_id").notNull().references(() => licencas.id),
    /** Identificador opaco enviado pelo Produto; a Instância não o interpreta. */
    dispositivo: text("dispositivo").notNull(),
    /** Nome legível enviado pelo Produto, se houver. */
    nomeDispositivo: text("nome_dispositivo"),
    ativadaEm: timestamp("ativada_em", { withTimezone: true }).notNull(),
    ultimaValidacaoEm: timestamp("ultima_validacao_em", { withTimezone: true }).notNull(),
  },
  (tabela) => [uniqueIndex("ativacoes_licenca_dispositivo_unico").on(tabela.licencaId, tabela.dispositivo)],
);
