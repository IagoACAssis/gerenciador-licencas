import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { AcaoNaoPermitida, DadosDeLicencaInvalidos, type CargaValidacao, type DadosProduto } from "./index.ts";

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

describe("Ciclo de vida da Licença", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  async function cenario(licenca: { validaAte?: Date | null; limiteAtivacoes?: number | null } = {}) {
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
    const detalhe = async () => (await nucleo.obterLicenca(prefixo))!;
    const dispositivos = async () => (await detalhe()).ativacoes.map((a) => a.dispositivo);
    return { prefixo, chave: emitida.chave, validar, detalhe, dispositivos };
  }

  describe("Suspensão", () => {
    it("torna a Licença Suspensa e mantém as Ativações, que deixam de ser aceitas", async () => {
      const { prefixo, validar, detalhe, dispositivos } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");

      await nucleo.suspenderLicenca(prefixo);

      expect((await detalhe()).estado).toBe("Suspensa");
      expect(await dispositivos()).toEqual(["pc-01"]);
      expect(await validar("pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_suspensa" });
    });
  });

  describe("Renovação", () => {
    it("muda só a data de validade de uma Licença Expirada, que volta a ser Ativa com a mesma Chave e as mesmas Ativações", async () => {
      const { prefixo, validar, detalhe, dispositivos } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");
      tempo.avancar(40 * UM_DIA);
      expect(await validar("pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_expirada" });

      await nucleo.renovarLicenca(prefixo, daquiA(400));

      expect(await detalhe()).toMatchObject({ estado: "Ativa", validaAte: daquiA(400), prefixo });
      expect(await dispositivos()).toEqual(["pc-01"]);
      expect(await validar("pc-01")).toEqual({ resultado: "aceita", motivo: null });
      expect((await detalhe()).historico.at(-1)).toEqual({
        tipo: "renovacao",
        ocorridoEm: daquiA(40),
        validaAteAnterior: daquiA(30),
        validaAte: daquiA(400),
      });
    });

    it("recusa data inválida, que não está no futuro ou que não é posterior à atual, sem mudar a Licença", async () => {
      const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30) });
      const recusa = (data: Date) => nucleo.renovarLicenca(prefixo, data).catch((e: unknown) => e);

      for (const [data, mensagem] of [
        [new Date(Number.NaN), "Informe uma data válida."],
        [INICIO, "A data de validade precisa estar no futuro."],
        [daquiA(20), "A nova data de validade precisa ser posterior à atual."],
        [daquiA(30), "A nova data de validade precisa ser posterior à atual."],
      ] as const) {
        const erro = await recusa(data);
        expect(erro).toBeInstanceOf(DadosDeLicencaInvalidos);
        expect((erro as DadosDeLicencaInvalidos).erros).toEqual({ validaAte: mensagem });
      }
      expect(await detalhe()).toMatchObject({ validaAte: daquiA(30) });
      expect((await detalhe()).historico.map((e) => e.tipo)).toEqual(["emissao"]);
    });

    it("não converte Licença perpétua em Licença com validade", async () => {
      const { prefixo, detalhe } = await cenario();

      const erro = await nucleo.renovarLicenca(prefixo, daquiA(30)).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(DadosDeLicencaInvalidos);
      expect((erro as DadosDeLicencaInvalidos).erros).toEqual({
        validaAte: "Licença perpétua não tem data de validade para renovar.",
      });
      expect((await detalhe()).validaAte).toBeNull();
    });

    it("renova uma Licença Suspensa sem desfazer a suspensão", async () => {
      const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30) });
      await nucleo.suspenderLicenca(prefixo);

      await nucleo.renovarLicenca(prefixo, daquiA(60));

      expect(await detalhe()).toMatchObject({ estado: "Suspensa", validaAte: daquiA(60) });
    });
  });

  describe("alteração do Limite de ativações", () => {
    it("abaixo das Ativações existentes não remove nenhuma, e elas continuam aceitas", async () => {
      const { prefixo, validar, detalhe, dispositivos } = await cenario({ limiteAtivacoes: 3 });
      for (const dispositivo of ["pc-01", "pc-02", "pc-03"]) await validar(dispositivo);

      await nucleo.alterarLimiteDeAtivacoes(prefixo, 1);

      expect(await detalhe()).toMatchObject({ limiteAtivacoes: 1, limiteProprio: 1 });
      expect(await dispositivos()).toEqual(["pc-01", "pc-02", "pc-03"]);
      expect(await validar("pc-01")).toEqual({ resultado: "aceita", motivo: null });
      expect((await detalhe()).historico.at(-1)).toEqual({
        tipo: "limite_alterado",
        ocorridoEm: INICIO,
        limiteAnterior: 3,
        limiteAtivacoes: 1,
      });
    });

    it("sem valor, volta a seguir o Limite de ativações padrão do Produto", async () => {
      const { prefixo, detalhe } = await cenario({ limiteAtivacoes: 5 });

      await nucleo.alterarLimiteDeAtivacoes(prefixo, null);

      expect(await detalhe()).toMatchObject({ limiteAtivacoes: 2, limiteProprio: null });
      expect((await detalhe()).historico.at(-1)).toMatchObject({ limiteAnterior: 5, limiteAtivacoes: null });
    });

    it("recusa limite que não é inteiro de zero ou mais", async () => {
      const { prefixo, detalhe } = await cenario();

      for (const limite of [-1, 1.5]) {
        const erro = await nucleo.alterarLimiteDeAtivacoes(prefixo, limite).catch((e: unknown) => e);
        expect(erro).toBeInstanceOf(DadosDeLicencaInvalidos);
        expect((erro as DadosDeLicencaInvalidos).erros).toEqual({
          limiteAtivacoes: "Informe um número inteiro de zero ou mais, ou deixe vazio para seguir o padrão do Produto.",
        });
      }
      expect((await detalhe()).limiteProprio).toBeNull();
    });
  });

  describe("Revogação", () => {
    it("torna a Licença Revogada em definitivo e a Validação passa a recusá-la", async () => {
      const { prefixo, validar, detalhe } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");

      await nucleo.revogarLicenca(prefixo);

      expect((await detalhe()).estado).toBe("Revogada");
      expect(await validar("pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_revogada" });
    });

    it("numa Licença Revogada, recusa Renovação, suspensão, reativação, alteração do limite e nova Revogação", async () => {
      const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30), limiteAtivacoes: 3 });
      await nucleo.revogarLicenca(prefixo);
      const antes = await detalhe();

      for (const acao of [
        () => nucleo.renovarLicenca(prefixo, daquiA(60)),
        () => nucleo.suspenderLicenca(prefixo),
        () => nucleo.reativarLicenca(prefixo),
        () => nucleo.alterarLimiteDeAtivacoes(prefixo, 1),
        () => nucleo.revogarLicenca(prefixo),
      ]) {
        const erro = await acao().catch((e: unknown) => e);
        expect(erro).toBeInstanceOf(AcaoNaoPermitida);
        expect((erro as AcaoNaoPermitida).message).toBe("A Licença foi Revogada e não pode mais ser alterada.");
      }
      expect(await detalhe()).toEqual(antes);
    });

    it("também recusa reativar uma Licença Revogada que estava Suspensa", async () => {
      const { prefixo, detalhe } = await cenario();
      await nucleo.suspenderLicenca(prefixo);
      await nucleo.revogarLicenca(prefixo);

      expect(await nucleo.reativarLicenca(prefixo).catch((e: unknown) => e)).toBeInstanceOf(AcaoNaoPermitida);
      expect((await detalhe()).estado).toBe("Revogada");
    });
  });

  describe("transições recusadas", () => {
    it("recusa suspender uma Licença já Suspensa e reativar uma que não está Suspensa", async () => {
      const { prefixo, detalhe } = await cenario();
      const mensagem = async (acao: () => Promise<void>) => {
        const erro = await acao().catch((e: unknown) => e);
        expect(erro).toBeInstanceOf(AcaoNaoPermitida);
        return (erro as AcaoNaoPermitida).message;
      };

      expect(await mensagem(() => nucleo.reativarLicenca(prefixo))).toBe("A Licença não está Suspensa.");
      await nucleo.suspenderLicenca(prefixo);
      expect(await mensagem(() => nucleo.suspenderLicenca(prefixo))).toBe("A Licença já está Suspensa.");
      expect((await detalhe()).historico.map((e) => e.tipo)).toEqual(["emissao", "suspensao"]);
    });
  });

  describe("prioridade dos estados", () => {
    it("Revogada > Suspensa > Expirada > Ativa", async () => {
      const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30) });
      expect((await detalhe()).estado).toBe("Ativa");

      tempo.avancar(31 * UM_DIA);
      expect((await detalhe()).estado).toBe("Expirada");

      await nucleo.suspenderLicenca(prefixo);
      expect((await detalhe()).estado).toBe("Suspensa");

      await nucleo.revogarLicenca(prefixo);
      expect((await detalhe()).estado).toBe("Revogada");
    });
  });

  it("registra cada ação no histórico da Licença, com a data", async () => {
    const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30) });
    tempo.avancar(UM_DIA);
    await nucleo.suspenderLicenca(prefixo);
    tempo.avancar(UM_DIA);
    await nucleo.reativarLicenca(prefixo);
    tempo.avancar(UM_DIA);
    await nucleo.renovarLicenca(prefixo, daquiA(60));
    tempo.avancar(UM_DIA);
    await nucleo.alterarLimiteDeAtivacoes(prefixo, 4);
    tempo.avancar(UM_DIA);
    await nucleo.revogarLicenca(prefixo);

    expect((await detalhe()).historico).toEqual([
      { tipo: "emissao", ocorridoEm: INICIO, validaAte: daquiA(30), limiteAtivacoes: null },
      { tipo: "suspensao", ocorridoEm: daquiA(1) },
      { tipo: "reativacao", ocorridoEm: daquiA(2) },
      { tipo: "renovacao", ocorridoEm: daquiA(3), validaAteAnterior: daquiA(30), validaAte: daquiA(60) },
      { tipo: "limite_alterado", ocorridoEm: daquiA(4), limiteAnterior: null, limiteAtivacoes: 4 },
      { tipo: "revogacao", ocorridoEm: daquiA(5) },
    ]);
  });

  describe("Reativação", () => {
    it("desfaz a suspensão e as Ativações voltam a valer", async () => {
      const { prefixo, validar, detalhe, dispositivos } = await cenario({ validaAte: daquiA(30) });
      await validar("pc-01");
      await validar("pc-02");
      await nucleo.suspenderLicenca(prefixo);

      await nucleo.reativarLicenca(prefixo);

      expect((await detalhe()).estado).toBe("Ativa");
      expect(await dispositivos()).toEqual(["pc-01", "pc-02"]);
      expect(await validar("pc-02")).toEqual({ resultado: "aceita", motivo: null });
    });

    it("resulta em Expirada quando a data de validade passou durante a suspensão", async () => {
      const { prefixo, detalhe } = await cenario({ validaAte: daquiA(30) });
      await nucleo.suspenderLicenca(prefixo);
      tempo.avancar(40 * UM_DIA);
      expect((await detalhe()).estado).toBe("Suspensa");

      await nucleo.reativarLicenca(prefixo);

      expect((await detalhe()).estado).toBe("Expirada");
    });
  });
});
