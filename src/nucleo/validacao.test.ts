import { verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import {
  DadosDeValidacaoInvalidos,
  ProdutoNaoEncontrado,
  type CargaValidacao,
  type DadosProduto,
  type Produto,
  type RespostaAssinada,
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

/** Confere a assinatura como um Produto faria: só com a chave pública, sobre o texto recebido. */
function autentica(carga: string, assinatura: string, produto: Produto): boolean {
  return verify(null, Buffer.from(carga, "utf8"), produto.chavePublica, Buffer.from(assinatura, "base64url"));
}

/** Confere a Resposta assinada e só então lê a carga, sem reserializar. */
function conferir(resposta: RespostaAssinada, produto: Produto): CargaValidacao {
  expect(autentica(resposta.carga, resposta.assinatura, produto)).toBe(true);
  return JSON.parse(resposta.carga) as CargaValidacao;
}

describe("Validação", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);
  let clientes = 0;

  async function cenario(regras: Partial<DadosProduto> = {}, licenca: { validaAte?: Date | null; limiteAtivacoes?: number } = {}) {
    const produto = await nucleo.cadastrarProduto({ ...regrasDoProduto, ...regras });
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: `ana${++clientes}@exemplo.com` });
    const emitida = await nucleo.emitirLicenca({ produto: produto.identificador, cliente: cliente.id, ...licenca });
    const validar = (dispositivo: string, extra: { nomeDispositivo?: string; nonce?: string; chave?: string } = {}) =>
      nucleo.validar({ produto: produto.identificador, chave: emitida.chave, dispositivo, ...extra });
    return { produto, licenca: emitida.licenca, chave: emitida.chave, validar };
  }

  it("aceita a primeira Validação num Dispositivo, cria a Ativação e assina a resposta com a chave do Produto", async () => {
    const { produto, licenca, validar } = await cenario({}, { validaAte: daquiA(30) });

    const carga = conferir(await validar("pc-01", { nomeDispositivo: "Notebook da Ana", nonce: "n-123" }), produto);

    expect(carga).toEqual({
      produto: produto.identificador,
      licenca: licenca.prefixo,
      dispositivo: "pc-01",
      resultado: "aceita",
      motivo: null,
      estado: "Ativa",
      aVencer: false,
      emCarencia: false,
      dataDeValidade: daquiA(30).toISOString(),
      emitidaEm: INICIO.toISOString(),
      validaAte: daquiA(7).toISOString(),
      nonce: "n-123",
    });
    expect((await nucleo.obterLicenca(licenca.prefixo))?.ativacoes).toEqual([
      { dispositivo: "pc-01", nomeDispositivo: "Notebook da Ana", ativadaEm: INICIO, ultimaValidacaoEm: INICIO },
    ]);
  });

  it("recusa pedido malformado com a mensagem de cada campo, sem tocar em Ativações", async () => {
    const { produto, licenca, chave } = await cenario();

    const erro = await nucleo
      .validar({ produto: produto.identificador, chave, dispositivo: "", nomeDispositivo: "x".repeat(201), nonce: "" })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(DadosDeValidacaoInvalidos);
    expect((erro as DadosDeValidacaoInvalidos).erros).toEqual({
      dispositivo: "Informe o identificador do Dispositivo, com até 200 caracteres.",
      nomeDispositivo: "O nome do Dispositivo pode ter até 200 caracteres.",
      nonce: "O nonce, quando enviado, precisa ter de 1 a 200 caracteres.",
    });
    expect((await nucleo.obterLicenca(licenca.prefixo))?.ativacoes).toEqual([]);
  });

  it("não assina nada para um identificador de Produto inexistente", async () => {
    const { chave } = await cenario();

    await expect(nucleo.validar({ produto: "prd_nao-existe", chave, dispositivo: "pc-01" })).rejects.toBeInstanceOf(
      ProdutoNaoEncontrado,
    );
  });

  it("recusa como chave inválida uma Chave inexistente e a Chave de outro Produto, sem identificar Licença", async () => {
    const { produto } = await cenario();
    const outro = await cenario({ nome: "Outro Produto" });
    const recusa = {
      produto: produto.identificador,
      dispositivo: "pc-01",
      resultado: "recusada",
      motivo: "chave_invalida",
      emitidaEm: INICIO.toISOString(),
      validaAte: INICIO.toISOString(),
      nonce: "n-1",
    };

    for (const chave of ["AAAA-BBBB-CCCC-DDDD", outro.chave, "A".repeat(500)]) {
      const resposta = await nucleo.validar({ produto: produto.identificador, chave, dispositivo: "pc-01", nonce: "n-1" });
      expect(conferir(resposta, produto)).toEqual(recusa);
    }
    expect((await nucleo.obterLicenca(outro.licenca.prefixo))?.ativacoes).toEqual([]);
  });

  it("limita a validade da resposta à data de validade mais a Carência, mesmo com Tolerância offline maior", async () => {
    // Validade em 1 dia + Carência de 5 = dia 6, antes de emitida em + Tolerância offline (dia 7).
    const { produto, validar } = await cenario({}, { validaAte: daquiA(1) });

    expect(conferir(await validar("pc-01"), produto)).toMatchObject({ resultado: "aceita", validaAte: daquiA(6).toISOString() });
  });

  it("aceita Licença Expirada dentro da Carência e a informa como em Carência", async () => {
    const { produto, validar } = await cenario({}, { validaAte: daquiA(1) });
    tempo.avancar(2 * UM_DIA);

    expect(conferir(await validar("pc-01"), produto)).toMatchObject({
      resultado: "aceita",
      motivo: null,
      estado: "Expirada",
      aVencer: false,
      emCarencia: true,
      emitidaEm: daquiA(2).toISOString(),
      validaAte: daquiA(6).toISOString(),
    });
  });

  it("recusa Licença Expirada fora da Carência com o estado, sem criar nem atualizar Ativações", async () => {
    const { produto, licenca, validar } = await cenario({}, { validaAte: daquiA(1) });
    await validar("pc-01");
    tempo.avancar(6 * UM_DIA);

    for (const dispositivo of ["pc-01", "pc-02"]) {
      expect(conferir(await validar(dispositivo, { nonce: "n" }), produto)).toEqual({
        produto: produto.identificador,
        licenca: licenca.prefixo,
        dispositivo,
        resultado: "recusada",
        motivo: "licenca_expirada",
        estado: "Expirada",
        aVencer: false,
        emCarencia: false,
        dataDeValidade: daquiA(1).toISOString(),
        emitidaEm: daquiA(6).toISOString(),
        validaAte: daquiA(6).toISOString(),
        nonce: "n",
      });
    }
    expect((await nucleo.obterLicenca(licenca.prefixo))?.ativacoes).toEqual([
      { dispositivo: "pc-01", nomeDispositivo: null, ativadaEm: INICIO, ultimaValidacaoEm: INICIO },
    ]);
  });

  it("reaproveita a Ativação do mesmo Dispositivo, atualizando a última Validação sem gastar vaga", async () => {
    const { produto, licenca, validar } = await cenario({ limiteAtivacoesPadrao: 1 });
    await validar("pc-01", { nomeDispositivo: "Notebook" });
    tempo.avancar(3 * UM_DIA);

    expect(conferir(await validar("pc-01"), produto)).toMatchObject({ resultado: "aceita", motivo: null });
    expect((await nucleo.obterLicenca(licenca.prefixo))?.ativacoes).toEqual([
      { dispositivo: "pc-01", nomeDispositivo: "Notebook", ativadaEm: INICIO, ultimaValidacaoEm: daquiA(3) },
    ]);
  });

  it("recusa um Dispositivo novo quando o Limite de ativações foi atingido", async () => {
    const { produto, licenca, validar } = await cenario({ limiteAtivacoesPadrao: 2 });
    await validar("pc-01");
    await validar("pc-02");
    tempo.avancar(UM_DIA);

    expect(conferir(await validar("pc-03"), produto)).toMatchObject({
      licenca: licenca.prefixo,
      dispositivo: "pc-03",
      resultado: "recusada",
      motivo: "limite_de_ativacoes_atingido",
      estado: "Ativa",
      emitidaEm: daquiA(1).toISOString(),
      validaAte: daquiA(1).toISOString(),
    });
    const ativacoes = (await nucleo.obterLicenca(licenca.prefixo))?.ativacoes;
    expect(ativacoes?.map((a) => [a.dispositivo, a.ultimaValidacaoEm])).toEqual([
      ["pc-01", INICIO],
      ["pc-02", INICIO],
    ]);
  });

  it("segue o Limite de ativações próprio da Licença, inclusive zero", async () => {
    const { produto, validar } = await cenario({ limiteAtivacoesPadrao: 5 }, { limiteAtivacoes: 0 });

    expect(conferir(await validar("pc-01"), produto)).toMatchObject({ motivo: "limite_de_ativacoes_atingido" });
  });

  it("numa Licença perpétua, a resposta vale pela Tolerância offline e traz o nonce nulo quando não foi enviado", async () => {
    const { produto, validar } = await cenario({ toleranciaOfflineDias: 3 });

    expect(conferir(await validar("pc-01"), produto)).toMatchObject({
      resultado: "aceita",
      dataDeValidade: null,
      validaAte: daquiA(3).toISOString(),
      nonce: null,
    });
  });

  it("uma carga adulterada não passa na conferência da assinatura", async () => {
    const { produto, validar } = await cenario();
    const resposta = await validar("pc-01", { nonce: "n-1" });

    const adulterada = resposta.carga.replace(`"validaAte":"${daquiA(7).toISOString()}"`, `"validaAte":"2099-01-01T00:00:00.000Z"`);

    expect(adulterada).not.toBe(resposta.carga);
    expect(autentica(adulterada, resposta.assinatura, produto)).toBe(false);
  });

  it("Validações simultâneas de Dispositivos diferentes numa Licença com limite 1 terminam com uma só Ativação", async () => {
    const { produto, licenca, validar } = await cenario({ limiteAtivacoesPadrao: 1 });

    const respostas = await Promise.all(["pc-01", "pc-02", "pc-03", "pc-04", "pc-05"].map((d) => validar(d)));

    const resultados = respostas.map((resposta) => conferir(resposta, produto).resultado);
    expect(resultados.filter((r) => r === "aceita")).toHaveLength(1);
    expect((await nucleo.obterLicenca(licenca.prefixo))?.ativacoes).toHaveLength(1);
  });
});
