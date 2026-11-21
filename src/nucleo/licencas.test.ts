import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { DadosDeLicencaInvalidos, type DadosProduto } from "./index.ts";

const UM_DIA = 24 * 60 * 60 * 1000;
const INICIO = new Date("2026-01-01T12:00:00Z");
const daquiA = (dias: number) => new Date(INICIO.getTime() + dias * UM_DIA);

const regrasDoProduto: DadosProduto = {
  nome: "Editor Pro",
  descricao: "",
  janelaAvisoDias: 10,
  carenciaDias: 5,
  limiteAtivacoesPadrao: 3,
  cotaSubstituicoes: { quantidade: 2, dias: 30 },
  toleranciaOfflineDias: 7,
};

const FORMATO_DA_CHAVE = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){7}$/;

describe("Licenças", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  async function cenario(regras: Partial<DadosProduto> = {}) {
    const produto = await nucleo.cadastrarProduto({ ...regrasDoProduto, ...regras });
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });
    return { produto, cliente };
  }

  async function erros(acao: () => Promise<unknown>) {
    const erro = await acao().then(() => undefined, (e: unknown) => e);
    expect(erro).toBeInstanceOf(DadosDeLicencaInvalidos);
    return (erro as DadosDeLicencaInvalidos).erros;
  }

  describe("emissão", () => {
    it("emite uma Licença com data de validade e devolve a Chave de licença uma vez", async () => {
      const { produto, cliente } = await cenario();

      const { licenca, chave } = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        validaAte: daquiA(30),
      });

      expect(chave).toMatch(FORMATO_DA_CHAVE);
      expect(licenca).toEqual({
        prefixo: chave.slice(0, 9),
        produto: { identificador: produto.identificador, nome: "Editor Pro" },
        cliente: { id: cliente.id, nome: "Ana Souza", email: "ana@exemplo.com" },
        validaAte: daquiA(30),
        limiteAtivacoes: 3,
        limiteProprio: null,
        estado: "Ativa",
        aVencer: false,
        emCarencia: false,
        emitidaEm: INICIO,
      });
    });

    it("emite uma Licença perpétua, que nunca é Expirada nem a vencer", async () => {
      const { produto, cliente } = await cenario();
      const { licenca } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });

      tempo.avancar(10 * 365 * UM_DIA);

      expect(licenca.validaAte).toBeNull();
      expect(await nucleo.obterLicenca(licenca.prefixo)).toMatchObject({
        estado: "Ativa",
        aVencer: false,
        emCarencia: false,
      });
    });

    it("sobrescreve o Limite de ativações do Produto quando informado", async () => {
      const { produto, cliente } = await cenario();

      const { licenca } = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        limiteAtivacoes: 10,
      });

      expect(licenca).toMatchObject({ limiteAtivacoes: 10, limiteProprio: 10 });
    });

    it("permite mais de uma Licença do mesmo Produto para o mesmo Cliente, cada uma com a sua Chave", async () => {
      const { produto, cliente } = await cenario();
      const dados = { produto: produto.identificador, cliente: cliente.id };

      const a = await nucleo.emitirLicenca(dados);
      const b = await nucleo.emitirLicenca(dados);

      expect(a.chave).not.toBe(b.chave);
      expect(a.licenca.prefixo).not.toBe(b.licenca.prefixo);
      expect(await nucleo.listarLicencas({ cliente: cliente.id })).toHaveLength(2);
    });

    it("recusa Produto e Cliente inexistentes, data de validade que já passou e limite inválido", async () => {
      await cenario();

      expect(
        await erros(() =>
          nucleo.emitirLicenca({ produto: "prd_nao-existe", cliente: 9999, validaAte: INICIO, limiteAtivacoes: -1 }),
        ),
      ).toEqual({
        produto: "Escolha um Produto cadastrado.",
        cliente: "Escolha um Cliente cadastrado.",
        validaAte: "A data de validade precisa estar no futuro.",
        limiteAtivacoes: "Informe um número inteiro de zero ou mais, ou deixe vazio para seguir o padrão do Produto.",
      });
      expect(await nucleo.listarLicencas()).toEqual([]);
    });

    it("recusa data de validade inválida e limite que não é inteiro", async () => {
      const { produto, cliente } = await cenario();

      expect(
        await erros(() =>
          nucleo.emitirLicenca({
            produto: produto.identificador,
            cliente: cliente.id,
            validaAte: new Date(Number.NaN),
            limiteAtivacoes: 1.5,
          }),
        ),
      ).toEqual({
        validaAte: "Informe uma data válida.",
        limiteAtivacoes: "Informe um número inteiro de zero ou mais, ou deixe vazio para seguir o padrão do Produto.",
      });
    });

    it("conta as Licenças emitidas no Produto", async () => {
      const { produto, cliente } = await cenario();
      await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });

      expect((await nucleo.obterProduto(produto.identificador))?.licencas).toBe(2);
      expect((await nucleo.listarProdutos())[0]?.licencas).toBe(2);
    });
  });

  describe("Chave de licença", () => {
    it("não é devolvida por nenhuma consulta depois da emissão", async () => {
      const { produto, cliente } = await cenario();
      const { licenca, chave } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      const semHifen = chave.replaceAll("-", "");

      const consultas = [
        await nucleo.listarLicencas(),
        await nucleo.listarLicencas({ prefixo: licenca.prefixo }),
        await nucleo.obterLicenca(licenca.prefixo),
        await nucleo.obterProduto(produto.identificador),
        await nucleo.listarProdutos(),
      ];

      for (const resultado of consultas) {
        const texto = JSON.stringify(resultado).toUpperCase();
        expect(texto).not.toContain(chave);
        expect(texto).not.toContain(semHifen);
        expect(texto).not.toContain(chave.slice(0, 14));
      }
    });
  });

  describe("estado calculado", () => {
    async function emitida(validadeEmDias: number, regras: Partial<DadosProduto> = {}) {
      const { produto, cliente } = await cenario(regras);
      const { licenca } = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        validaAte: daquiA(validadeEmDias),
      });
      return { produto, prefixo: licenca.prefixo };
    }

    const situacao = async (prefixo: string) => {
      const licenca = await nucleo.obterLicenca(prefixo);
      return { estado: licenca?.estado, aVencer: licenca?.aVencer, emCarencia: licenca?.emCarencia };
    };

    it("passa a ser a vencer ao entrar na Janela de aviso", async () => {
      const { prefixo } = await emitida(30);

      tempo.avancar(20 * UM_DIA - 1);
      expect(await situacao(prefixo)).toEqual({ estado: "Ativa", aVencer: false, emCarencia: false });

      tempo.avancar(1);
      expect(await situacao(prefixo)).toEqual({ estado: "Ativa", aVencer: true, emCarencia: false });
    });

    it("fica Expirada na data de validade, em Carência durante a Carência, e depois só Expirada", async () => {
      const { prefixo } = await emitida(30);

      tempo.avancar(30 * UM_DIA - 1);
      expect(await situacao(prefixo)).toEqual({ estado: "Ativa", aVencer: true, emCarencia: false });

      tempo.avancar(1);
      expect(await situacao(prefixo)).toEqual({ estado: "Expirada", aVencer: false, emCarencia: true });

      tempo.avancar(5 * UM_DIA - 1);
      expect(await situacao(prefixo)).toEqual({ estado: "Expirada", aVencer: false, emCarencia: true });

      tempo.avancar(1);
      expect(await situacao(prefixo)).toEqual({ estado: "Expirada", aVencer: false, emCarencia: false });
    });

    it("sem Carência no Produto, a Licença Expirada nunca fica em Carência", async () => {
      const { prefixo } = await emitida(30, { carenciaDias: null });

      tempo.avancar(30 * UM_DIA);

      expect(await situacao(prefixo)).toEqual({ estado: "Expirada", aVencer: false, emCarencia: false });
    });
  });

  describe("regras do Produto valem na hora", () => {
    it("mudar a Janela de aviso e a Carência muda as indicações das Licenças já emitidas", async () => {
      const { produto, cliente } = await cenario();
      const { licenca } = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        validaAte: daquiA(30),
      });
      tempo.avancar(15 * UM_DIA);
      expect((await nucleo.obterLicenca(licenca.prefixo))?.aVencer).toBe(false);

      await nucleo.editarProduto(produto.identificador, { ...regrasDoProduto, janelaAvisoDias: 20 });
      expect((await nucleo.obterLicenca(licenca.prefixo))?.aVencer).toBe(true);

      tempo.avancar(20 * UM_DIA);
      expect((await nucleo.obterLicenca(licenca.prefixo))?.emCarencia).toBe(false);

      await nucleo.editarProduto(produto.identificador, { ...regrasDoProduto, carenciaDias: 10 });
      expect((await nucleo.obterLicenca(licenca.prefixo))?.emCarencia).toBe(true);
    });

    it("a Licença sem limite próprio segue o Limite de ativações padrão atual; a com limite próprio, não", async () => {
      const { produto, cliente } = await cenario();
      const padrao = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      const propria = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        limiteAtivacoes: 1,
      });

      await nucleo.editarProduto(produto.identificador, { ...regrasDoProduto, limiteAtivacoesPadrao: 8 });

      expect((await nucleo.obterLicenca(padrao.licenca.prefixo))?.limiteAtivacoes).toBe(8);
      expect((await nucleo.obterLicenca(propria.licenca.prefixo))?.limiteAtivacoes).toBe(1);
    });
  });

  describe("lista e detalhe", () => {
    async function variasLicencas() {
      const editor = await nucleo.cadastrarProduto(regrasDoProduto);
      const agenda = await nucleo.cadastrarProduto({ ...regrasDoProduto, nome: "Agenda" });
      const ana = await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });
      const bruno = await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });
      const emitir = (produto: string, cliente: number, validaAte?: Date) =>
        nucleo.emitirLicenca({ produto, cliente, validaAte }).then((r) => r.licenca.prefixo);
      return {
        editor,
        agenda,
        ana,
        bruno,
        // Emitidas com um minuto de diferença, para a ordem da lista ser previsível.
        perpetua: await emitir(editor.identificador, ana.id),
        venceLogo: (tempo.avancar(60_000), await emitir(editor.identificador, bruno.id, daquiA(5))),
        venceDepois: (tempo.avancar(60_000), await emitir(agenda.identificador, ana.id, daquiA(8))),
        expira: (tempo.avancar(60_000), await emitir(agenda.identificador, bruno.id, daquiA(1))),
      };
    }

    it("lista das mais novas para as mais antigas e filtra por Produto, Cliente e estado", async () => {
      const c = await variasLicencas();
      tempo.avancar(2 * UM_DIA);
      const prefixos = async (filtro: Parameters<typeof nucleo.listarLicencas>[0]) =>
        (await nucleo.listarLicencas(filtro)).map((l) => l.prefixo);

      expect(await prefixos({})).toEqual([c.expira, c.venceDepois, c.venceLogo, c.perpetua]);
      expect(await prefixos({ produto: c.editor.identificador })).toEqual([c.venceLogo, c.perpetua]);
      expect(await prefixos({ cliente: c.ana.id })).toEqual([c.venceDepois, c.perpetua]);
      expect(await prefixos({ estado: "Expirada" })).toEqual([c.expira]);
      expect(await prefixos({ estado: "Ativa", cliente: c.bruno.id })).toEqual([c.venceLogo]);
    });

    it("mostra as Licenças a vencer da data de validade mais próxima para a mais distante", async () => {
      const c = await variasLicencas();

      expect((await nucleo.listarLicencas({ aVencer: true })).map((l) => l.prefixo)).toEqual([
        c.expira,
        c.venceLogo,
        c.venceDepois,
      ]);
      tempo.avancar(2 * UM_DIA);
      expect((await nucleo.listarLicencas({ aVencer: true })).map((l) => l.prefixo)).toEqual([
        c.venceLogo,
        c.venceDepois,
      ]);
    });

    it("busca pelo começo da Chave, sem diferenciar maiúsculas e com ou sem hífen", async () => {
      const { produto, cliente } = await cenario();
      const { licenca, chave } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
      await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });

      for (const busca of [chave.slice(0, 4).toLowerCase(), chave.slice(0, 7), chave.slice(0, 9).replace("-", "")]) {
        expect((await nucleo.listarLicencas({ prefixo: busca })).map((l) => l.prefixo)).toEqual([licenca.prefixo]);
      }
    });

    it("obtém o detalhe pelo prefixo da Chave, com o evento de emissão no histórico", async () => {
      const { produto, cliente } = await cenario();
      const { licenca } = await nucleo.emitirLicenca({
        produto: produto.identificador,
        cliente: cliente.id,
        validaAte: daquiA(30),
        limiteAtivacoes: 2,
      });

      expect(await nucleo.obterLicenca(licenca.prefixo.toLowerCase())).toEqual({
        ...licenca,
        historico: [{ tipo: "emissao", ocorridoEm: INICIO, validaAte: daquiA(30), limiteAtivacoes: 2 }],
        ativacoes: [],
        substituicoes: [],
        substituicoesNoPeriodo: 0,
        cotaSubstituicoes: { quantidade: 2, dias: 30 },
        contagemSubstituicoesZeradaEm: null,
      });
    });

    it("devolve null para um prefixo que não existe ou que não tem o tamanho de um prefixo", async () => {
      const { produto, cliente } = await cenario();
      const { licenca } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });

      expect(await nucleo.obterLicenca("ZZZZ-ZZZZ")).toBeNull();
      expect(await nucleo.obterLicenca(licenca.prefixo.slice(0, 4))).toBeNull();
    });
  });
});
