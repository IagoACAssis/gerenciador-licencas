import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import {
  ClienteNaoEncontrado,
  DadosDeClienteInvalidos,
  DadosDeLicencaInvalidos,
  ExclusaoNaoPermitida,
  LicencaNaoEncontrada,
  ProdutoNaoEncontrado,
  type CargaValidacao,
  type DadosProduto,
} from "./index.ts";

const UM_DIA = 24 * 60 * 60 * 1000;
const INICIO = new Date("2026-01-01T12:00:00Z");
const daquiA = (dias: number) => new Date(INICIO.getTime() + dias * UM_DIA);

const regrasDoProduto: DadosProduto = {
  nome: "Editor Pro",
  descricao: "",
  janelaAvisoDias: 10,
  carenciaDias: 5,
  limiteAtivacoesPadrao: 2,
  cotaSubstituicoes: { quantidade: 2, dias: 30 },
  toleranciaOfflineDias: 7,
};

describe("Exclusão e restauração", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  async function cenario(licenca: { validaAte?: Date | null } = {}) {
    const produto = await nucleo.cadastrarProduto(regrasDoProduto);
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });
    const emitida = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id, ...licenca });
    const prefixo = emitida.licenca.prefixo;
    /** Validação no Dispositivo, devolvendo só o resultado e o motivo da carga. */
    const validar = async (dispositivo: string) => {
      const resposta = await nucleo.validar({ produto: produto.identificador, chave: emitida.chave, dispositivo });
      const { resultado, motivo } = JSON.parse(resposta.carga) as CargaValidacao;
      return { resultado, motivo };
    };
    return { produto, cliente, prefixo, validar };
  }

  describe("de Licença", () => {
    it("tira a Licença das listas e consultas, e a Validação passa a responder chave inválida", async () => {
      const { prefixo, validar } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");

      await nucleo.excluirLicenca(prefixo);

      expect(await nucleo.listarLicencas()).toEqual([]);
      expect(await nucleo.obterLicenca(prefixo)).toBeNull();
      expect(await validar("pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
    });

    it("restaurada, volta como estava: estado, data de validade, Ativações, histórico e Chave validando", async () => {
      const { prefixo, validar } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");
      await nucleo.suspenderLicenca(prefixo);
      const antes = (await nucleo.obterLicenca(prefixo))!;
      tempo.avancar(UM_DIA);
      await nucleo.excluirLicenca(prefixo);
      tempo.avancar(UM_DIA);

      await nucleo.restaurarLicenca(prefixo);

      const depois = (await nucleo.obterLicenca(prefixo))!;
      expect(depois).toMatchObject({ estado: "Suspensa", validaAte: daquiA(30), ativacoes: antes.ativacoes });
      expect(depois.historico).toEqual([
        ...antes.historico,
        { tipo: "exclusao", ocorridoEm: daquiA(1) },
        { tipo: "restauracao", ocorridoEm: daquiA(2) },
      ]);
      expect(await nucleo.listarLicencas()).toHaveLength(1);
      await nucleo.reativarLicenca(prefixo);
      expect(await validar("pc-01")).toEqual({ resultado: "aceita", motivo: null });
    });

    it("excluída, não aceita ações de ciclo de vida nem nova Exclusão", async () => {
      const { prefixo } = await cenario({ validaAte: daquiA(30) });
      await nucleo.excluirLicenca(prefixo);

      for (const acao of [
        () => nucleo.suspenderLicenca(prefixo),
        () => nucleo.renovarLicenca(prefixo, daquiA(60)),
        () => nucleo.excluirLicenca(prefixo),
      ]) {
        await expect(acao()).rejects.toBeInstanceOf(LicencaNaoEncontrada);
      }
    });

    it("pode ser excluída Ativa e Revogada", async () => {
      const ativa = await cenario({ validaAte: daquiA(30) });
      await nucleo.excluirLicenca(ativa.prefixo);
      const produto = await nucleo.cadastrarProduto(regrasDoProduto);
      const cliente = await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });
      const { licenca } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      await nucleo.revogarLicenca(licenca.prefixo);
      tempo.avancar(UM_DIA);

      await nucleo.excluirLicenca(licenca.prefixo);

      expect((await nucleo.listarExcluidos()).licencas.map((l) => l.prefixo)).toEqual([licenca.prefixo, ativa.prefixo]);
    });
  });

  describe("de Produto e de Cliente", () => {
    it("recusa com mensagem clara enquanto houver Licença Ativa ou Suspensa, sem mudar nada", async () => {
      const ativa = await cenario({ validaAte: daquiA(30) });
      const produtoSuspensa = await nucleo.cadastrarProduto(regrasDoProduto);
      const clienteSuspensa = await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });
      const suspensa = await nucleo.emitirLicenca({ produto: produtoSuspensa.identificador, cliente: clienteSuspensa.id });
      await nucleo.suspenderLicenca(suspensa.licenca.prefixo);

      for (const [acao, mensagem] of [
        [() => nucleo.excluirProduto(ativa.produto.identificador), "O Produto tem Licença Ativa ou Suspensa: revogue-a ou exclua-a antes."],
        [() => nucleo.excluirCliente(ativa.cliente.id), "O Cliente tem Licença Ativa ou Suspensa: revogue-a ou exclua-a antes."],
        [() => nucleo.excluirProduto(produtoSuspensa.identificador), "O Produto tem Licença Ativa ou Suspensa: revogue-a ou exclua-a antes."],
        [() => nucleo.excluirCliente(clienteSuspensa.id), "O Cliente tem Licença Ativa ou Suspensa: revogue-a ou exclua-a antes."],
      ] as const) {
        const erro = await acao().catch((e: unknown) => e);
        expect(erro).toBeInstanceOf(ExclusaoNaoPermitida);
        expect((erro as Error).message).toBe(mensagem);
      }
      expect(await nucleo.listarProdutos()).toHaveLength(2);
      expect(await nucleo.listarClientes()).toHaveLength(2);
      expect(await nucleo.listarExcluidos()).toEqual({ produtos: [], clientes: [], licencas: [] });
    });

    it("com Licenças só Expiradas ou Revogadas, tira o Produto das listas, com as Licenças dele, e a Validação responde 404", async () => {
      const { produto, cliente, prefixo, validar } = await cenario({ validaAte: daquiA(30) });
      const revogada = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      await nucleo.revogarLicenca(revogada.licenca.prefixo);
      tempo.avancar(31 * UM_DIA);

      await nucleo.excluirProduto(produto.identificador);

      expect(await nucleo.listarProdutos()).toEqual([]);
      expect(await nucleo.obterProduto(produto.identificador)).toBeNull();
      expect(await nucleo.listarLicencas()).toEqual([]);
      expect(await nucleo.obterLicenca(prefixo)).toBeNull();
      await expect(validar("pc-01")).rejects.toBeInstanceOf(ProdutoNaoEncontrado);
      expect((await nucleo.listarExcluidos()).produtos).toEqual([
        { identificador: produto.identificador, nome: "Editor Pro", excluidoEm: daquiA(31) },
      ]);
    });

    it("com Licença Expirada ainda em Carência, tira o Cliente e as Licenças dele, que deixam de ser aceitas", async () => {
      const { cliente, prefixo, validar } = await cenario({ validaAte: daquiA(30) });
      tempo.avancar(31 * UM_DIA);
      expect(await validar("pc-01")).toEqual({ resultado: "aceita", motivo: null });

      await nucleo.excluirCliente(cliente.id);

      expect(await nucleo.listarClientes()).toEqual([]);
      expect(await nucleo.obterCliente(cliente.id)).toBeNull();
      expect(await nucleo.obterLicenca(prefixo)).toBeNull();
      expect(await validar("pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
      await expect(nucleo.renovarLicenca(prefixo, daquiA(400))).rejects.toBeInstanceOf(LicencaNaoEncontrada);
    });

    it("excluídos, não recebem Licença nova nem edição", async () => {
      const { produto, cliente, prefixo } = await cenario({ validaAte: daquiA(30) });
      await nucleo.excluirLicenca(prefixo);
      await nucleo.excluirProduto(produto.identificador);
      await nucleo.excluirCliente(cliente.id);

      const erro = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id }).catch((e: unknown) => e);

      expect((erro as DadosDeLicencaInvalidos).erros).toEqual({
        produto: "Escolha um Produto cadastrado.",
        cliente: "Escolha um Cliente cadastrado.",
      });
      await expect(nucleo.editarProduto(produto.identificador, regrasDoProduto)).rejects.toBeInstanceOf(ProdutoNaoEncontrado);
      await expect(nucleo.editarCliente(cliente.id, { nome: "Ana", email: "ana@exemplo.com" })).rejects.toBeInstanceOf(
        ClienteNaoEncontrado,
      );
    });

    it("Cliente excluído continua ocupando o e-mail", async () => {
      const { cliente } = await cenario();
      await nucleo.revogarLicenca((await nucleo.listarLicencas())[0]!.prefixo);
      await nucleo.excluirCliente(cliente.id);

      const erro = await nucleo.cadastrarCliente({ nome: "Outra Ana", email: "ANA@exemplo.com" }).catch((e: unknown) => e);

      expect((erro as DadosDeClienteInvalidos).erros).toEqual({
        email: "Já existe um Cliente excluído com este e-mail: restaure-o na lista de excluídos.",
      });
    });

    it("restaurados, voltam com as Licenças como estavam", async () => {
      const { produto, cliente, prefixo, validar } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");
      tempo.avancar(31 * UM_DIA);
      await nucleo.excluirProduto(produto.identificador);
      await nucleo.excluirCliente(cliente.id);

      await nucleo.restaurarProduto(produto.identificador);
      await nucleo.restaurarCliente(cliente.id);

      expect(await nucleo.obterProduto(produto.identificador)).toMatchObject({ identificador: produto.identificador, licencas: 1 });
      expect(await nucleo.obterCliente(cliente.id)).toEqual(cliente);
      expect(await nucleo.obterLicenca(prefixo)).toMatchObject({ estado: "Expirada", emCarencia: true, validaAte: daquiA(30) });
      expect(await validar("pc-01")).toEqual({ resultado: "aceita", motivo: null });
      expect(await nucleo.listarExcluidos()).toEqual({ produtos: [], clientes: [], licencas: [] });
    });

    it("a Licença excluída não volta com o dono, e só é restaurada depois dele", async () => {
      const { produto, prefixo } = await cenario({ validaAte: daquiA(30) });
      await nucleo.excluirLicenca(prefixo);
      await nucleo.excluirProduto(produto.identificador);

      const erro = await nucleo.restaurarLicenca(prefixo).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ExclusaoNaoPermitida);
      expect((erro as Error).message).toBe("O Produto desta Licença está excluído: restaure-o antes.");
      await nucleo.restaurarProduto(produto.identificador);
      expect(await nucleo.obterLicenca(prefixo)).toBeNull();
      await nucleo.restaurarLicenca(prefixo);
      expect(await nucleo.obterLicenca(prefixo)).toMatchObject({ estado: "Ativa" });
    });

    it("Licença excluída não impede a Exclusão do dono, mesmo Ativa", async () => {
      const { produto, prefixo } = await cenario({ validaAte: daquiA(30) });
      await nucleo.excluirLicenca(prefixo);

      await nucleo.excluirProduto(produto.identificador);

      expect(await nucleo.obterProduto(produto.identificador)).toBeNull();
    });
  });
});
