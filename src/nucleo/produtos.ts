import { asc, eq, sql } from "drizzle-orm";
import { licencas, produtos } from "../banco/esquema.ts";
import { cifrarChavePrivada, gerarParDeChaves } from "./chaves.ts";
import type { DependenciasNucleo } from "./index.ts";

export interface RegrasProduto {
  janelaAvisoDias: number;
  carenciaDias: number;
  limiteAtivacoesPadrao: number;
  cotaSubstituicoes: { quantidade: number; dias: number };
  toleranciaOfflineDias: number;
}

/** O que o Administrador informa ao cadastrar ou editar um Produto. Carência vazia vale zero. */
export interface DadosProduto extends Omit<RegrasProduto, "carenciaDias"> {
  nome: string;
  descricao: string;
  carenciaDias?: number | null;
}

/** Produto como sai do núcleo: só dados públicos, nunca a chave privada. */
export interface Produto {
  identificador: string;
  nome: string;
  descricao: string;
  regras: RegrasProduto;
  /** Chave pública Ed25519 em PEM, para embutir no Produto. */
  chavePublica: string;
  cadastradoEm: Date;
  licencas: number;
}

export type CampoProduto =
  | "nome"
  | "janelaAvisoDias"
  | "carenciaDias"
  | "limiteAtivacoesPadrao"
  | "cotaSubstituicoesQuantidade"
  | "cotaSubstituicoesDias"
  | "toleranciaOfflineDias";

/** Dados do Produto recusados, com a mensagem de cada campo inválido. */
export class DadosDeProdutoInvalidos extends Error {
  constructor(readonly erros: Partial<Record<CampoProduto, string>>) {
    super("Dados do Produto inválidos.");
    this.name = "DadosDeProdutoInvalidos";
  }
}

export class ProdutoNaoEncontrado extends Error {
  constructor() {
    super("Produto não encontrado.");
    this.name = "ProdutoNaoEncontrado";
  }
}

const MENSAGEM_NAO_NEGATIVO = "Informe um número inteiro de zero ou mais.";

function validar(dados: DadosProduto) {
  const valores = {
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    janelaAvisoDias: dados.janelaAvisoDias,
    carenciaDias: dados.carenciaDias ?? 0,
    limiteAtivacoesPadrao: dados.limiteAtivacoesPadrao,
    cotaSubstituicoesQuantidade: dados.cotaSubstituicoes.quantidade,
    cotaSubstituicoesDias: dados.cotaSubstituicoes.dias,
    toleranciaOfflineDias: dados.toleranciaOfflineDias,
  };
  const erros: Partial<Record<CampoProduto, string>> = {};
  if (!valores.nome) erros.nome = "Informe o nome do Produto.";
  for (const campo of [
    "janelaAvisoDias",
    "carenciaDias",
    "limiteAtivacoesPadrao",
    "cotaSubstituicoesQuantidade",
    "cotaSubstituicoesDias",
    "toleranciaOfflineDias",
  ] as const) {
    const valor = valores[campo];
    // Teto do integer do Postgres, para um número enorme virar mensagem e não erro do banco.
    if (!Number.isInteger(valor) || valor < 0 || valor > 2_147_483_647) erros[campo] = MENSAGEM_NAO_NEGATIVO;
  }
  if (Object.keys(erros).length > 0) throw new DadosDeProdutoInvalidos(erros);
  return valores;
}

const colunasPublicas = {
  identificador: produtos.identificador,
  nome: produtos.nome,
  descricao: produtos.descricao,
  janelaAvisoDias: produtos.janelaAvisoDias,
  carenciaDias: produtos.carenciaDias,
  limiteAtivacoesPadrao: produtos.limiteAtivacoesPadrao,
  cotaSubstituicoesQuantidade: produtos.cotaSubstituicoesQuantidade,
  cotaSubstituicoesDias: produtos.cotaSubstituicoesDias,
  toleranciaOfflineDias: produtos.toleranciaOfflineDias,
  chavePublica: produtos.chavePublica,
  cadastradoEm: produtos.cadastradoEm,
};

type LinhaPublica = { [K in keyof typeof colunasPublicas]: (typeof colunasPublicas)[K]["_"]["data"] };

const colunasComContagem = {
  ...colunasPublicas,
  // Colunas qualificadas à mão: num select de uma tabela só, o Drizzle omite o nome
  // da tabela, e "id" passaria a ser o da Licença dentro da subconsulta.
  licencas: sql<number>`(SELECT count(*) FROM ${licencas} WHERE "licencas"."produto_id" = "produtos"."id")`.mapWith(Number),
};

function paraProduto(linha: LinhaPublica & { licencas: number }): Produto {
  return {
    identificador: linha.identificador,
    nome: linha.nome,
    descricao: linha.descricao,
    regras: {
      janelaAvisoDias: linha.janelaAvisoDias,
      carenciaDias: linha.carenciaDias,
      limiteAtivacoesPadrao: linha.limiteAtivacoesPadrao,
      cotaSubstituicoes: { quantidade: linha.cotaSubstituicoesQuantidade, dias: linha.cotaSubstituicoesDias },
      toleranciaOfflineDias: linha.toleranciaOfflineDias,
    },
    chavePublica: linha.chavePublica,
    cadastradoEm: linha.cadastradoEm,
    licencas: linha.licencas,
  };
}

export function casosDeUsoDeProdutos({ banco, relogio, aleatoriedade, segredoChaves }: DependenciasNucleo) {
  return {
    /** Cadastra o Produto e gera o par de chaves Ed25519 e o identificador público dele. */
    async cadastrarProduto(dados: DadosProduto): Promise<Produto> {
      const valores = validar(dados);
      const par = gerarParDeChaves();
      const [linha] = await banco
        .insert(produtos)
        .values({
          ...valores,
          identificador: `prd_${Buffer.from(aleatoriedade.bytes(16)).toString("base64url")}`,
          chavePublica: par.publica,
          chavePrivadaCifrada: cifrarChavePrivada(par.privada, segredoChaves),
          cadastradoEm: relogio.agora(),
        })
        .returning(colunasPublicas);
      return paraProduto({ ...linha!, licencas: 0 });
    },

    /** Altera nome, descrição e regras. O identificador e as chaves não mudam. */
    async editarProduto(identificador: string, dados: DadosProduto): Promise<Produto> {
      const valores = validar(dados);
      const [linha] = await banco
        .update(produtos)
        .set(valores)
        .where(eq(produtos.identificador, identificador))
        .returning(colunasComContagem);
      if (!linha) throw new ProdutoNaoEncontrado();
      return paraProduto(linha);
    },

    async listarProdutos(): Promise<Produto[]> {
      const linhas = await banco
        .select(colunasComContagem)
        .from(produtos)
        .orderBy(asc(sql`lower(${produtos.nome})`), asc(produtos.id));
      return linhas.map(paraProduto);
    },

    async obterProduto(identificador: string): Promise<Produto | null> {
      const [linha] = await banco
        .select(colunasComContagem)
        .from(produtos)
        .where(eq(produtos.identificador, identificador));
      return linha ? paraProduto(linha) : null;
    },
  };
}
