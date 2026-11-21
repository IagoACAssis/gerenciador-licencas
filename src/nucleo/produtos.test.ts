import { createPublicKey, sign, verify } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { SEGREDO_CHAVES_TESTE, nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { urlBancoTeste } from "../../testes/url-banco-teste.ts";
import { conectarBanco } from "../banco/conexao.ts";
import { produtos } from "../banco/esquema.ts";
import { decifrarChavePrivada } from "./chaves.ts";
import { DadosDeProdutoInvalidos, type DadosProduto } from "./index.ts";

const dadosValidos: DadosProduto = {
  nome: "Editor Pro",
  descricao: "Editor de texto para equipes",
  janelaAvisoDias: 15,
  carenciaDias: 5,
  limiteAtivacoesPadrao: 3,
  cotaSubstituicoes: { quantidade: 2, dias: 30 },
  toleranciaOfflineDias: 7,
};

describe("cadastro de Produtos", () => {
  const { nucleo } = nucleoDeTeste();

  it("cadastra um Produto com as regras e um par de chaves Ed25519", async () => {
    const produto = await nucleo.cadastrarProduto(dadosValidos);

    expect(produto).toMatchObject({
      nome: "Editor Pro",
      descricao: "Editor de texto para equipes",
      regras: {
        janelaAvisoDias: 15,
        carenciaDias: 5,
        limiteAtivacoesPadrao: 3,
        cotaSubstituicoes: { quantidade: 2, dias: 30 },
        toleranciaOfflineDias: 7,
      },
      cadastradoEm: new Date("2026-01-01T12:00:00Z"),
      licencas: 0,
    });
    expect(createPublicKey(produto.chavePublica).asymmetricKeyType).toBe("ed25519");
    expect(produto.identificador).toMatch(/^prd_[A-Za-z0-9_-]{22}$/);
  });

  it("dá a cada Produto o próprio identificador público e o próprio par de chaves", async () => {
    const a = await nucleo.cadastrarProduto(dadosValidos);
    const b = await nucleo.cadastrarProduto({ ...dadosValidos, nome: "Outro" });

    expect(a.identificador).not.toBe(b.identificador);
    expect(a.chavePublica).not.toBe(b.chavePublica);
  });

  it("trata a Carência vazia como zero dias", async () => {
    const semCarencia = await nucleo.cadastrarProduto({ ...dadosValidos, carenciaDias: null });
    const omitida = await nucleo.cadastrarProduto({ ...dadosValidos, carenciaDias: undefined });

    expect(semCarencia.regras.carenciaDias).toBe(0);
    expect(omitida.regras.carenciaDias).toBe(0);
  });

  it("remove espaços nas pontas do nome e da descrição", async () => {
    const produto = await nucleo.cadastrarProduto({ ...dadosValidos, nome: "  Editor  ", descricao: " x " });
    expect(produto).toMatchObject({ nome: "Editor", descricao: "x" });
  });
});

describe("validação das regras do Produto", () => {
  const { nucleo } = nucleoDeTeste();

  async function errosDe(dados: DadosProduto) {
    try {
      await nucleo.cadastrarProduto(dados);
    } catch (erro) {
      if (erro instanceof DadosDeProdutoInvalidos) return erro.erros;
      throw erro;
    }
    throw new Error("o cadastro deveria ter sido recusado");
  }

  it("recusa dias e quantidades negativos, apontando cada campo", async () => {
    expect(
      await errosDe({
        ...dadosValidos,
        janelaAvisoDias: -1,
        carenciaDias: -1,
        limiteAtivacoesPadrao: -1,
        cotaSubstituicoes: { quantidade: -1, dias: -1 },
        toleranciaOfflineDias: -1,
      }),
    ).toEqual({
      janelaAvisoDias: "Informe um número inteiro de zero ou mais.",
      carenciaDias: "Informe um número inteiro de zero ou mais.",
      limiteAtivacoesPadrao: "Informe um número inteiro de zero ou mais.",
      cotaSubstituicoesQuantidade: "Informe um número inteiro de zero ou mais.",
      cotaSubstituicoesDias: "Informe um número inteiro de zero ou mais.",
      toleranciaOfflineDias: "Informe um número inteiro de zero ou mais.",
    });
  });

  it("recusa valores que não são números inteiros", async () => {
    expect(
      await errosDe({ ...dadosValidos, janelaAvisoDias: 1.5, toleranciaOfflineDias: Number.NaN }),
    ).toEqual({
      janelaAvisoDias: "Informe um número inteiro de zero ou mais.",
      toleranciaOfflineDias: "Informe um número inteiro de zero ou mais.",
    });
  });

  it("aceita zero em todas as regras", async () => {
    const produto = await nucleo.cadastrarProduto({
      ...dadosValidos,
      janelaAvisoDias: 0,
      carenciaDias: 0,
      limiteAtivacoesPadrao: 0,
      cotaSubstituicoes: { quantidade: 0, dias: 0 },
      toleranciaOfflineDias: 0,
    });
    expect(produto.regras.janelaAvisoDias).toBe(0);
  });

  it("exige um nome", async () => {
    expect(await errosDe({ ...dadosValidos, nome: "   " })).toEqual({ nome: "Informe o nome do Produto." });
  });

  it("não grava nada quando recusa", async () => {
    await errosDe({ ...dadosValidos, janelaAvisoDias: -1 });
    expect(await nucleo.listarProdutos()).toEqual([]);
  });
});

describe("edição de Produtos", () => {
  const { nucleo, tempo } = nucleoDeTeste();

  it("altera nome, descrição e regras, mantendo o identificador e as chaves", async () => {
    const original = await nucleo.cadastrarProduto(dadosValidos);
    tempo.avancar(60_000);

    const editado = await nucleo.editarProduto(original.identificador, {
      nome: "Editor Pro 2",
      descricao: "",
      janelaAvisoDias: 30,
      carenciaDias: null,
      limiteAtivacoesPadrao: 10,
      cotaSubstituicoes: { quantidade: 5, dias: 60 },
      toleranciaOfflineDias: 3,
    });

    expect(editado).toEqual({
      ...original,
      nome: "Editor Pro 2",
      descricao: "",
      regras: {
        janelaAvisoDias: 30,
        carenciaDias: 0,
        limiteAtivacoesPadrao: 10,
        cotaSubstituicoes: { quantidade: 5, dias: 60 },
        toleranciaOfflineDias: 3,
      },
    });
    expect(await nucleo.obterProduto(original.identificador)).toEqual(editado);
  });

  it("valida as regras como no cadastro e não altera nada quando recusa", async () => {
    const original = await nucleo.cadastrarProduto(dadosValidos);

    await expect(
      nucleo.editarProduto(original.identificador, { ...dadosValidos, limiteAtivacoesPadrao: -2 }),
    ).rejects.toBeInstanceOf(DadosDeProdutoInvalidos);
    expect(await nucleo.obterProduto(original.identificador)).toEqual(original);
  });

  it("recusa editar um Produto que não existe", async () => {
    await expect(nucleo.editarProduto("prd_inexistente", dadosValidos)).rejects.toThrow(
      "Produto não encontrado.",
    );
  });
});

describe("consulta de Produtos", () => {
  const { nucleo } = nucleoDeTeste();

  it("lista os Produtos em ordem de nome, com a quantidade de Licenças de cada um", async () => {
    await nucleo.cadastrarProduto({ ...dadosValidos, nome: "Zeta" });
    await nucleo.cadastrarProduto({ ...dadosValidos, nome: "alfa" });
    await nucleo.cadastrarProduto({ ...dadosValidos, nome: "Beta" });

    const lista = await nucleo.listarProdutos();
    expect(lista.map((p) => [p.nome, p.licencas])).toEqual([
      ["alfa", 0],
      ["Beta", 0],
      ["Zeta", 0],
    ]);
  });

  it("devolve null para um identificador que não existe", async () => {
    expect(await nucleo.obterProduto("prd_inexistente")).toBeNull();
  });
});

describe("chave privada do Produto", () => {
  const { nucleo } = nucleoDeTeste();

  it("não sai do núcleo por nenhum caso de uso", async () => {
    const cadastrado = await nucleo.cadastrarProduto(dadosValidos);
    const editado = await nucleo.editarProduto(cadastrado.identificador, dadosValidos);
    const obtido = await nucleo.obterProduto(cadastrado.identificador);
    const listados = await nucleo.listarProdutos();

    const camposPublicos = [
      "identificador", "nome", "descricao", "regras", "chavePublica", "cadastradoEm", "licencas",
    ].sort();
    for (const produto of [cadastrado, editado, obtido, ...listados]) {
      expect(Object.keys(produto ?? {}).sort()).toEqual(camposPublicos);
      expect(JSON.stringify(produto)).not.toMatch(/PRIVATE KEY/);
    }
  });

  // O critério da issue é sobre o que fica guardado, então este teste lê a coluna
  // direto do banco. Quando a Validação (#6) assinar respostas, a conferência da
  // assinatura pela interface do núcleo passa a cobrir o mesmo comportamento.
  it("fica guardada no banco só cifrada com o segredo da Instância", async () => {
    const produto = await nucleo.cadastrarProduto(dadosValidos);
    const conexao = conectarBanco(urlBancoTeste());
    afterAll(() => conexao.encerrar());
    const [linha] = await conexao.banco
      .select({ cifrada: produtos.chavePrivadaCifrada })
      .from(produtos)
      .where(eq(produtos.identificador, produto.identificador));

    expect(linha.cifrada).not.toMatch(/PRIVATE KEY/);
    const privada = decifrarChavePrivada(linha.cifrada, SEGREDO_CHAVES_TESTE);
    const assinatura = sign(null, Buffer.from("mensagem"), privada);
    expect(verify(null, Buffer.from("mensagem"), produto.chavePublica, assinatura)).toBe(true);
  });
});
