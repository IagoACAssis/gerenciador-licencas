import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { AtivacaoNaoEncontrada, LicencaNaoEncontrada, type CargaValidacao, type DadosProduto } from "./index.ts";

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

describe("Substituição de ativação", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  async function cenario(regras: Partial<DadosProduto> = {}) {
    const produto = await nucleo.cadastrarProduto({ ...regrasDoProduto, ...regras });
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });
    const { licenca, chave } = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id });
    const validar = async (dispositivo: string) =>
      JSON.parse((await nucleo.validar({ produto: produto.identificador, chave, dispositivo })).carga) as CargaValidacao;
    const detalhe = async () => (await nucleo.obterLicenca(licenca.prefixo))!;
    return { produto, prefixo: licenca.prefixo, validar, detalhe };
  }

  it("sem vaga e com Cota, substitui a Ativação com a última Validação mais antiga, registra e aceita", async () => {
    const { validar, detalhe } = await cenario();
    await validar("pc-01");
    tempo.avancar(UM_DIA);
    await validar("pc-02");
    tempo.avancar(UM_DIA);
    // pc-01 foi ativada antes, mas validou depois de pc-02: a abandonada é pc-02.
    await validar("pc-01");
    tempo.avancar(UM_DIA);

    expect(await validar("pc-03")).toMatchObject({ resultado: "aceita", motivo: null });

    const licenca = await detalhe();
    expect(licenca.ativacoes.map((a) => [a.dispositivo, a.ativadaEm, a.ultimaValidacaoEm])).toEqual([
      ["pc-01", INICIO, daquiA(2)],
      ["pc-03", daquiA(3), daquiA(3)],
    ]);
    expect(licenca.substituicoes).toEqual([{ dispositivoRemovido: "pc-02", dispositivoNovo: "pc-03", feitaEm: daquiA(3) }]);
    expect(licenca.substituicoesNoPeriodo).toBe(1);
  });

  it("sem vaga e com a Cota esgotada, recusa com limite de ativações atingido sem mexer nas Ativações", async () => {
    const { validar, detalhe } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 2, dias: 30 } });
    await validar("pc-01");
    tempo.avancar(UM_DIA);
    expect(await validar("pc-02")).toMatchObject({ resultado: "aceita" });
    tempo.avancar(UM_DIA);
    expect(await validar("pc-03")).toMatchObject({ resultado: "aceita" });
    tempo.avancar(UM_DIA);

    expect(await validar("pc-04")).toMatchObject({ resultado: "recusada", motivo: "limite_de_ativacoes_atingido" });

    const licenca = await detalhe();
    expect(licenca.ativacoes.map((a) => a.dispositivo)).toEqual(["pc-03"]);
    expect(licenca.substituicoesNoPeriodo).toBe(2);
  });

  it("conta a Cota numa janela móvel: uma Substituição de ativação de mais de N dias atrás deixa de contar", async () => {
    // Cota de 1 em 10 dias. Substituição no dia 1; no dia 11 ela ainda conta, logo depois não.
    const { validar, detalhe } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 1, dias: 10 } });
    await validar("pc-01");
    tempo.avancar(UM_DIA);
    await validar("pc-02");
    tempo.avancar(10 * UM_DIA - 1);

    expect(await validar("pc-03")).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });
    expect((await detalhe()).substituicoesNoPeriodo).toBe(1);

    tempo.avancar(1);
    expect((await detalhe()).substituicoesNoPeriodo).toBe(0);
    expect(await validar("pc-03")).toMatchObject({ resultado: "aceita" });
    expect((await detalhe()).ativacoes.map((a) => a.dispositivo)).toEqual(["pc-03"]);
  });

  it("Cota zero nunca permite Substituição de ativação", async () => {
    const { validar } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 0, dias: 30 } });
    await validar("pc-01");

    expect(await validar("pc-02")).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });
  });

  it("com o limite reduzido abaixo do uso, não cria Ativações novas mas continua fazendo Substituição de ativação", async () => {
    const { produto, validar, detalhe } = await cenario({ limiteAtivacoesPadrao: 3, cotaSubstituicoes: { quantidade: 1, dias: 30 } });
    await validar("pc-01");
    await validar("pc-02");
    await validar("pc-03");
    await nucleo.editarProduto(produto.identificador, { ...regrasDoProduto, limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 1, dias: 30 } });
    tempo.avancar(UM_DIA);

    expect(await validar("pc-04")).toMatchObject({ resultado: "aceita" });
    // Ativações a mais que o limite continuam: a Substituição troca uma, não derruba as outras.
    expect((await detalhe()).ativacoes.map((a) => a.dispositivo)).toEqual(["pc-02", "pc-03", "pc-04"]);
    expect(await validar("pc-05")).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });
  });

  it("Validações simultâneas de Dispositivos novos não passam da Cota de substituições", async () => {
    const { validar, detalhe } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 1, dias: 30 } });
    await validar("pc-01");
    tempo.avancar(UM_DIA);

    const cargas = await Promise.all(["pc-02", "pc-03", "pc-04", "pc-05"].map((d) => validar(d)));

    expect(cargas.filter((c) => c.resultado === "aceita")).toHaveLength(1);
    const licenca = await detalhe();
    expect(licenca.ativacoes).toHaveLength(1);
    expect(licenca.substituicoes).toHaveLength(1);
  });

  describe("pelo Administrador", () => {
    it("zerar a contagem libera a Cota na hora, sem apagar o registro das Substituições, e entra no histórico", async () => {
      const { prefixo, validar, detalhe } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 1, dias: 30 } });
      await validar("pc-01");
      tempo.avancar(UM_DIA);
      await validar("pc-02");
      tempo.avancar(UM_DIA);
      expect(await validar("pc-03")).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });

      await nucleo.zerarContagemDeSubstituicoes(prefixo);

      expect((await detalhe()).substituicoesNoPeriodo).toBe(0);
      tempo.avancar(UM_DIA);
      expect(await validar("pc-03")).toMatchObject({ resultado: "aceita" });
      // Depois de zerar, a nova Substituição conta e esgota a Cota de novo.
      expect(await validar("pc-04")).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });

      const licenca = await detalhe();
      expect(licenca.substituicoesNoPeriodo).toBe(1);
      expect(licenca.substituicoes.map((s) => s.dispositivoNovo)).toEqual(["pc-02", "pc-03"]);
      expect(licenca.historico.at(-1)).toEqual({ tipo: "contagem_substituicoes_zerada", ocorridoEm: daquiA(2) });
    });

    it("zerar a contagem de uma Licença inexistente lança LicencaNaoEncontrada", async () => {
      await expect(nucleo.zerarContagemDeSubstituicoes("ZZZZ-ZZZZ")).rejects.toBeInstanceOf(LicencaNaoEncontrada);
    });

    it("remover uma Ativação libera a vaga sem gastar a Cota e entra no histórico", async () => {
      const { validar, detalhe, prefixo } = await cenario({ limiteAtivacoesPadrao: 1, cotaSubstituicoes: { quantidade: 1, dias: 30 } });
      await validar("pc-01");
      tempo.avancar(UM_DIA);

      await nucleo.removerAtivacao(prefixo, "pc-01");

      expect(await validar("pc-02")).toMatchObject({ resultado: "aceita" });
      let licenca = await detalhe();
      expect(licenca.ativacoes.map((a) => a.dispositivo)).toEqual(["pc-02"]);
      expect(licenca.substituicoes).toEqual([]);
      expect(licenca.substituicoesNoPeriodo).toBe(0);
      expect(licenca.historico.at(-1)).toEqual({ tipo: "ativacao_removida", ocorridoEm: daquiA(1), dispositivo: "pc-01", nomeDispositivo: null });

      // A Cota continua inteira: a próxima troca é uma Substituição de ativação aceita.
      expect(await validar("pc-03")).toMatchObject({ resultado: "aceita" });
      licenca = await detalhe();
      expect(licenca.substituicoes).toEqual([{ dispositivoRemovido: "pc-02", dispositivoNovo: "pc-03", feitaEm: daquiA(1) }]);
    });

    it("remover uma Ativação que a Licença não tem lança AtivacaoNaoEncontrada sem registrar nada", async () => {
      const { validar, detalhe, prefixo } = await cenario();
      await validar("pc-01");

      await expect(nucleo.removerAtivacao(prefixo, "pc-99")).rejects.toBeInstanceOf(AtivacaoNaoEncontrada);
      await expect(nucleo.removerAtivacao("ZZZZ-ZZZZ", "pc-01")).rejects.toBeInstanceOf(LicencaNaoEncontrada);
      const licenca = await detalhe();
      expect(licenca.ativacoes).toHaveLength(1);
      expect(licenca.historico.map((e) => e.tipo)).toEqual(["emissao"]);
    });
  });
});
