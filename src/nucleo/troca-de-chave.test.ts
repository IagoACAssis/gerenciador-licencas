import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { AcaoNaoPermitida, LicencaNaoEncontrada, type CargaValidacao, type DadosProduto } from "./index.ts";

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

describe("Troca de chave", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  async function cenario(licenca: { validaAte?: Date | null } = {}) {
    const produto = await nucleo.cadastrarProduto(regrasDoProduto);
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });
    const emitida = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id, ...licenca });
    /** Validação da Chave no Dispositivo, devolvendo só o resultado e o motivo da carga. */
    const validar = async (chave: string, dispositivo: string) => {
      const resposta = await nucleo.validar({ produto: produto.identificador, chave, dispositivo });
      const { resultado, motivo } = JSON.parse(resposta.carga) as CargaValidacao;
      return { resultado, motivo };
    };
    return { prefixo: emitida.licenca.prefixo, chave: emitida.chave, validar };
  }

  it("dá à Licença Ativa uma Chave nova: a antiga deixa de valer e a nova vale no Dispositivo já ativado", async () => {
    const { prefixo, chave, validar } = await cenario({ validaAte: daquiA(30) });
    await validar(chave, "pc-01");

    const trocada = await nucleo.trocarChave(prefixo);

    expect(trocada.chave).not.toBe(chave);
    expect(trocada.chave).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
    expect(trocada.licenca.prefixo).toBe(trocada.chave.slice(0, 9));
    expect(trocada.licenca.prefixo).not.toBe(prefixo);
    expect(await validar(chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
    expect(await validar(trocada.chave, "pc-01")).toEqual({ resultado: "aceita", motivo: null });
    const detalhe = (await nucleo.obterLicenca(trocada.licenca.prefixo))!;
    expect(detalhe.ativacoes.map((a) => a.dispositivo)).toEqual(["pc-01"]);
    expect(await nucleo.obterLicenca(prefixo)).toBeNull();
  });

  it("numa Licença Expirada, mantém o estado, a data de validade e o histórico, com a troca no fim", async () => {
    const { prefixo, chave, validar } = await cenario({ validaAte: daquiA(30) });
    await validar(chave, "pc-01");
    tempo.avancar(40 * UM_DIA);

    const trocada = await nucleo.trocarChave(prefixo);

    expect(trocada.licenca).toMatchObject({ estado: "Expirada", validaAte: daquiA(30) });
    expect(await validar(chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
    expect(await validar(trocada.chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_expirada" });
    const detalhe = (await nucleo.obterLicenca(trocada.licenca.prefixo))!;
    expect(detalhe.historico).toEqual([
      { tipo: "emissao", ocorridoEm: INICIO, validaAte: daquiA(30), limiteAtivacoes: null },
      { tipo: "troca_de_chave", ocorridoEm: daquiA(40), prefixoAnterior: prefixo },
    ]);
  });

  it("numa Licença Expirada em Carência, a Chave nova continua aceita no Dispositivo já ativado", async () => {
    const { prefixo, chave, validar } = await cenario({ validaAte: daquiA(30) });
    await validar(chave, "pc-01");
    tempo.avancar(32 * UM_DIA);

    const trocada = await nucleo.trocarChave(prefixo);

    expect(trocada.licenca).toMatchObject({ estado: "Expirada", emCarencia: true });
    expect(await validar(chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
    expect(await validar(trocada.chave, "pc-01")).toEqual({ resultado: "aceita", motivo: null });
    const detalhe = (await nucleo.obterLicenca(trocada.licenca.prefixo))!;
    expect(detalhe.ativacoes.map((a) => a.dispositivo)).toEqual(["pc-01"]);
  });

  it("numa Licença Suspensa, mantém a suspensão e as Ativações", async () => {
    const { prefixo, chave, validar } = await cenario({ validaAte: daquiA(30) });
    await validar(chave, "pc-01");
    await nucleo.suspenderLicenca(prefixo);

    const trocada = await nucleo.trocarChave(prefixo);

    expect(trocada.licenca.estado).toBe("Suspensa");
    expect(await validar(chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "chave_invalida" });
    expect(await validar(trocada.chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_suspensa" });
    const detalhe = (await nucleo.obterLicenca(trocada.licenca.prefixo))!;
    expect(detalhe.ativacoes.map((a) => a.dispositivo)).toEqual(["pc-01"]);
    expect(detalhe.historico.map((e) => e.tipo)).toEqual(["emissao", "suspensao", "troca_de_chave"]);
  });

  it("recusa Licença Revogada sem mudar a Chave nem o histórico", async () => {
    const { prefixo, chave, validar } = await cenario();
    await validar(chave, "pc-01");
    await nucleo.revogarLicenca(prefixo);

    const erro = await nucleo.trocarChave(prefixo).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AcaoNaoPermitida);
    expect(await validar(chave, "pc-01")).toEqual({ resultado: "recusada", motivo: "licenca_revogada" });
    const detalhe = (await nucleo.obterLicenca(prefixo))!;
    expect(detalhe.historico.map((e) => e.tipo)).toEqual(["emissao", "revogacao"]);
  });

  it("lança LicencaNaoEncontrada para um prefixo sem Licença", async () => {
    await expect(nucleo.trocarChave("ZZZZ-ZZZZ")).rejects.toBeInstanceOf(LicencaNaoEncontrada);
  });
});
