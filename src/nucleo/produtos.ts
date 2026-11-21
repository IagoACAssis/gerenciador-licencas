import { and, asc, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { clientes, licencas, produtos } from "../banco/esquema.ts";
import { MAIOR_INTEIRO } from "../banco/postgres.ts";
import { cifrarChavePrivada, gerarParDeChaves } from "./chaves.ts";
import { licencaEmUso, produtoNaoExcluido as naoExcluido, recusarSeHaLicencaEmVigor } from "./exclusao.ts";
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
  /** Licenças em uso do Produto: sem as excluídas e as de Cliente excluído. */
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
    if (!Number.isInteger(valor) || valor < 0 || valor > MAIOR_INTEIRO) erros[campo] = MENSAGEM_NAO_NEGATIVO;
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

const colunasComId = { id: produtos.id, ...colunasPublicas };

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
  /** Junta a cada Produto a contagem das Licenças em uso dele. */
  async function comContagem(linhas: (LinhaPublica & { id: number })[]): Promise<Produto[]> {
    if (linhas.length === 0) return [];
    const contagens = await banco
      .select({ produtoId: licencas.produtoId, total: count() })
      .from(licencas)
      .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
      .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
      .where(and(licencaEmUso, inArray(licencas.produtoId, linhas.map((linha) => linha.id))))
      .groupBy(licencas.produtoId);
    const porProduto = new Map(contagens.map((c) => [c.produtoId, c.total]));
    return linhas.map(({ id, ...linha }) => paraProduto({ ...linha, licencas: porProduto.get(id) ?? 0 }));
  }

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

    /** Altera nome, descrição e regras. O identificador e as chaves não mudam. Produto excluído não é editado. */
    async editarProduto(identificador: string, dados: DadosProduto): Promise<Produto> {
      const valores = validar(dados);
      const [linha] = await banco
        .update(produtos)
        .set(valores)
        .where(and(eq(produtos.identificador, identificador), naoExcluido))
        .returning(colunasComId);
      if (!linha) throw new ProdutoNaoEncontrado();
      const [produto] = await comContagem([linha]);
      return produto!;
    },

    /** Os Produtos não excluídos, em ordem de nome. */
    async listarProdutos(): Promise<Produto[]> {
      const linhas = await banco
        .select(colunasComId)
        .from(produtos)
        .where(naoExcluido)
        .orderBy(asc(sql`lower(${produtos.nome})`), asc(produtos.id));
      return comContagem(linhas);
    },

    /** O Produto do identificador; null se não existir ou estiver excluído. */
    async obterProduto(identificador: string): Promise<Produto | null> {
      const linhas = await banco
        .select(colunasComId)
        .from(produtos)
        .where(and(eq(produtos.identificador, identificador), naoExcluido));
      const [produto] = await comContagem(linhas);
      return produto ?? null;
    },

    /**
     * Exclusão do Produto: ele e as Licenças dele saem das listas e das consultas,
     * e a Validação com o identificador dele responde 404 (ProdutoNaoEncontrado).
     * Nada é apagado. Recusa (ExclusaoNaoPermitida) se houver Licença em uso Ativa
     * ou Suspensa; lança ProdutoNaoEncontrado se não houver Produto não excluído.
     */
    async excluirProduto(identificador: string): Promise<void> {
      const agora = relogio.agora();
      await banco.transaction(async (tx) => {
        // Travado: Emissões e restaurações de Licença simultâneas esperam a Exclusão terminar.
        const [produto] = await tx
          .select({ id: produtos.id })
          .from(produtos)
          .where(and(eq(produtos.identificador, identificador), naoExcluido))
          .for("update");
        if (!produto) throw new ProdutoNaoEncontrado();
        await recusarSeHaLicencaEmVigor(tx, { produtoId: produto.id }, agora);
        await tx.update(produtos).set({ excluidoEm: agora }).where(eq(produtos.id, produto.id));
      });
    },

    /** Desfaz a Exclusão: o Produto volta com as Licenças dele. Lança ProdutoNaoEncontrado se não houver Produto excluído. */
    async restaurarProduto(identificador: string): Promise<void> {
      const restaurados = await banco
        .update(produtos)
        .set({ excluidoEm: null })
        .where(and(eq(produtos.identificador, identificador), isNotNull(produtos.excluidoEm)))
        .returning({ id: produtos.id });
      if (restaurados.length === 0) throw new ProdutoNaoEncontrado();
    },
  };
}
