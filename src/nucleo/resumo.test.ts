import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import type { DadosProduto } from "./index.ts";

const UM_DIA = 24 * 60 * 60 * 1000;
const INICIO = new Date("2026-01-01T12:00:00Z");
const daquiA = (dias: number) => new Date(INICIO.getTime() + dias * UM_DIA);

/** Janela de aviso de 10 dias e Carência de 5. */
const regrasDoProduto: DadosProduto = {
  nome: "Editor Pro",
  descricao: "",
  janelaAvisoDias: 10,
  carenciaDias: 5,
  limiteAtivacoesPadrao: 2,
  cotaSubstituicoes: { quantidade: 2, dias: 30 },
  toleranciaOfflineDias: 7,
};

describe("Resumo da Instância", () => {
  const { nucleo, tempo } = nucleoDeTeste(INICIO);

  const produto = (nome: string) => nucleo.cadastrarProduto({ ...regrasDoProduto, nome });
  const cliente = (nome: string) => nucleo.cadastrarCliente({ nome, email: `${nome.toLowerCase()}@exemplo.com` });
  async function emitir(
    doProduto: { identificador: string },
    doCliente: { id: number },
    licenca: { validaAte?: Date | null } = {},
  ) {
    const emitida = await nucleo.emitirLicenca({ produto: doProduto.identificador, cliente: doCliente.id, ...licenca });
    return emitida.licenca.prefixo;
  }

  it("numa Instância vazia, devolve contagens zeradas e listas vazias", async () => {
    expect(await nucleo.resumirInstancia()).toEqual({
      contagens: { produtos: 0, clientes: 0, licencas: 0, licencasAtivas: 0 },
      porSituacao: { ativas: 0, pedemAtencao: 0, expiradas: 0, revogadas: 0 },
      pedemAtencao: [],
      atividadeRecente: [],
      porProduto: [],
    });
  });

  it("conta só o que está em uso: sem excluídos e sem Licenças de Produto ou Cliente excluído", async () => {
    const [editor, agenda, excluido, comLicencaExcluida] = [
      await produto("Editor Pro"),
      await produto("Agenda"),
      await produto("Excluído"),
      await produto("Descontinuado"),
    ];
    const [ana, bruno, carla] = [await cliente("Ana"), await cliente("Bruno"), await cliente("Carla")];
    await emitir(editor, ana, { validaAte: daquiA(60) });
    await emitir(editor, bruno);
    await nucleo.suspenderLicenca(await emitir(agenda, ana, { validaAte: daquiA(60) }));
    await nucleo.excluirLicenca(await emitir(agenda, bruno));
    await nucleo.revogarLicenca(await emitir(editor, carla));
    await nucleo.excluirCliente(carla.id);
    await nucleo.revogarLicenca(await emitir(comLicencaExcluida, ana));
    await nucleo.excluirProduto(comLicencaExcluida.identificador);
    await nucleo.excluirProduto(excluido.identificador);

    expect((await nucleo.resumirInstancia()).contagens).toEqual({
      produtos: 2,
      clientes: 2,
      licencas: 3,
      licencasAtivas: 2,
    });
  });

  /** Prefixos das Licenças que pedem atenção, na ordem do resumo. */
  const pedemAtencao = async () => (await nucleo.resumirInstancia()).pedemAtencao.map((licenca) => licenca.prefixo);

  it("a Licença passa a pedir atenção ao entrar na Janela de aviso e deixa de pedir ao ser renovada", async () => {
    const prefixo = await emitir(await produto("Editor Pro"), await cliente("Ana"), { validaAte: daquiA(30) });
    tempo.avancar(19 * UM_DIA);
    expect(await pedemAtencao()).toEqual([]);

    tempo.avancar(UM_DIA); // faltam 10 dias: entrou na Janela de aviso
    const resumo = await nucleo.resumirInstancia();
    expect(resumo.pedemAtencao).toEqual([
      expect.objectContaining({ prefixo, estado: "Ativa", aVencer: true, validaAte: daquiA(30) }),
    ]);

    await nucleo.renovarLicenca(prefixo, daquiA(90));
    expect(await pedemAtencao()).toEqual([]);
  });

  it("a Licença Expirada pede atenção como em Carência até o fim da Carência, e depois deixa de pedir", async () => {
    const prefixo = await emitir(await produto("Editor Pro"), await cliente("Ana"), { validaAte: daquiA(5) });
    tempo.avancar(5 * UM_DIA); // venceu agora
    expect((await nucleo.resumirInstancia()).pedemAtencao).toEqual([
      expect.objectContaining({ prefixo, estado: "Expirada", emCarencia: true }),
    ]);

    tempo.avancar(5 * UM_DIA - 1); // último instante da Carência de 5 dias
    expect(await pedemAtencao()).toEqual([prefixo]);

    tempo.avancar(1);
    expect(await pedemAtencao()).toEqual([]);
  });

  it("a Licença Suspensa pede atenção, e a Revogada nunca, nem a vencer", async () => {
    const editor = await produto("Editor Pro");
    const suspensa = await emitir(editor, await cliente("Ana"));
    const revogada = await emitir(editor, await cliente("Bruno"), { validaAte: daquiA(5) });
    await nucleo.suspenderLicenca(suspensa);
    await nucleo.revogarLicenca(revogada);

    expect((await nucleo.resumirInstancia()).pedemAtencao).toEqual([
      expect.objectContaining({ prefixo: suspensa, estado: "Suspensa" }),
    ]);
  });

  it("ordena: em Carência da validade mais antiga para a mais nova, depois a vencer da mais próxima para a mais distante, por fim as Suspensas", async () => {
    const editor = await produto("Editor Pro");
    const ana = await cliente("Ana");
    // Emitidas fora de ordem, para a ordem do resumo não sair da ordem de emissão.
    const aVencerEm12 = await emitir(editor, ana, { validaAte: daquiA(12) });
    const carenciaDesde9 = await emitir(editor, ana, { validaAte: daquiA(9) });
    const suspensa1 = await emitir(editor, ana, { validaAte: daquiA(60) });
    const aVencerEm18 = await emitir(editor, ana, { validaAte: daquiA(18) });
    const carenciaDesde7 = await emitir(editor, ana, { validaAte: daquiA(7) });
    const suspensa2 = await emitir(editor, ana);
    await emitir(editor, ana, { validaAte: daquiA(60) }); // Ativa fora da Janela de aviso
    await emitir(editor, ana, { validaAte: daquiA(2) }); // Expirada fora da Carência no dia 10
    await nucleo.suspenderLicenca(suspensa1);
    await nucleo.suspenderLicenca(suspensa2);
    tempo.avancar(10 * UM_DIA);

    const ordem = await pedemAtencao();

    expect(ordem.slice(0, 4)).toEqual([carenciaDesde7, carenciaDesde9, aVencerEm12, aVencerEm18]);
    expect(ordem.slice(4).toSorted()).toEqual([suspensa1, suspensa2].toSorted());
  });

  it("divide as Licenças por situação: Ativas sem indicação, que pedem atenção, Expiradas fora da Carência e Revogadas", async () => {
    const editor = await produto("Editor Pro");
    const ana = await cliente("Ana");
    await emitir(editor, ana); // perpétua: Ativa
    await emitir(editor, ana, { validaAte: daquiA(60) }); // Ativa
    await emitir(editor, ana, { validaAte: daquiA(15) }); // a vencer no dia 10
    await emitir(editor, ana, { validaAte: daquiA(8) }); // em Carência no dia 10
    await nucleo.suspenderLicenca(await emitir(editor, ana, { validaAte: daquiA(60) }));
    await emitir(editor, ana, { validaAte: daquiA(2) }); // Expirada fora da Carência no dia 10
    await nucleo.revogarLicenca(await emitir(editor, ana));
    tempo.avancar(10 * UM_DIA);

    const resumo = await nucleo.resumirInstancia();

    expect(resumo.porSituacao).toEqual({ ativas: 2, pedemAtencao: 3, expiradas: 1, revogadas: 1 });
    expect(resumo.contagens).toMatchObject({ licencas: 7, licencasAtivas: 3 });
  });

  describe("atividade recente", () => {
    it("traz os eventos de várias Licenças, do mais novo para o mais antigo, sem os de Licenças excluídas", async () => {
      const [editor, agenda] = [await produto("Editor Pro"), await produto("Agenda")];
      const [ana, bruno] = [await cliente("Ana"), await cliente("Bruno")];
      const daAna = await emitir(editor, ana);
      const doBruno = await emitir(agenda, bruno, { validaAte: daquiA(30) });
      tempo.avancar(UM_DIA);
      await nucleo.suspenderLicenca(daAna);
      tempo.avancar(UM_DIA);
      await nucleo.renovarLicenca(doBruno, daquiA(60));
      tempo.avancar(UM_DIA);
      const excluida = await emitir(editor, bruno);
      await nucleo.suspenderLicenca(excluida);
      await nucleo.excluirLicenca(excluida);
      await nucleo.reativarLicenca(daAna);

      const licencaDaAna = { prefixo: daAna, produto: { identificador: editor.identificador, nome: "Editor Pro" }, cliente: { id: ana.id, nome: "Ana" } };
      const licencaDoBruno = { prefixo: doBruno, produto: { identificador: agenda.identificador, nome: "Agenda" }, cliente: { id: bruno.id, nome: "Bruno" } };
      expect((await nucleo.resumirInstancia()).atividadeRecente).toEqual([
        { evento: { tipo: "reativacao", ocorridoEm: daquiA(3) }, licenca: licencaDaAna },
        { evento: { tipo: "renovacao", ocorridoEm: daquiA(2), validaAteAnterior: daquiA(30), validaAte: daquiA(60) }, licenca: licencaDoBruno },
        { evento: { tipo: "suspensao", ocorridoEm: daquiA(1) }, licenca: licencaDaAna },
        // Mesmo instante: a emitida depois vem antes.
        { evento: { tipo: "emissao", ocorridoEm: INICIO, validaAte: daquiA(30), limiteAtivacoes: null }, licenca: licencaDoBruno },
        { evento: { tipo: "emissao", ocorridoEm: INICIO, validaAte: null, limiteAtivacoes: null }, licenca: licencaDaAna },
      ]);
    });

    it("traz os 8 eventos mais recentes por padrão, ou quantos forem pedidos", async () => {
      const prefixo = await emitir(await produto("Editor Pro"), await cliente("Ana"));
      for (let vez = 1; vez <= 5; vez++) {
        tempo.avancar(UM_DIA);
        await nucleo.suspenderLicenca(prefixo);
        await nucleo.reativarLicenca(prefixo);
      }
      // 11 eventos: a Emissão e 5 pares de suspensão e reativação.

      const padrao = (await nucleo.resumirInstancia()).atividadeRecente;
      expect(padrao).toHaveLength(8);
      expect(padrao.at(-1)!.evento).toEqual({ tipo: "suspensao", ocorridoEm: daquiA(2) });

      const tres = (await nucleo.resumirInstancia({ limiteDaAtividade: 3 })).atividadeRecente;
      expect(tres.map((item) => item.evento)).toEqual([
        { tipo: "reativacao", ocorridoEm: daquiA(5) },
        { tipo: "suspensao", ocorridoEm: daquiA(5) },
        { tipo: "reativacao", ocorridoEm: daquiA(4) },
      ]);
    });
  });

  it("conta as Licenças em uso de cada Produto em uso, do Produto com mais para o com menos e, no empate, pelo nome", async () => {
    const [editor, planilha, banco, agenda] = [
      await produto("Editor Pro"),
      await produto("Planilha"),
      await produto("Banco"),
      await produto("Agenda"),
    ];
    const excluido = await produto("Descontinuado");
    const [ana, bruno, carla] = [await cliente("Ana"), await cliente("Bruno"), await cliente("Carla")];
    await emitir(editor, ana);
    await emitir(editor, bruno);
    await nucleo.excluirLicenca(await emitir(editor, ana));
    await emitir(banco, ana);
    await emitir(agenda, ana);
    await nucleo.revogarLicenca(await emitir(agenda, carla));
    await nucleo.excluirCliente(carla.id);
    await nucleo.revogarLicenca(await emitir(excluido, ana));
    await nucleo.excluirProduto(excluido.identificador);

    expect((await nucleo.resumirInstancia()).porProduto).toEqual([
      { identificador: editor.identificador, nome: "Editor Pro", licencas: 2 },
      { identificador: agenda.identificador, nome: "Agenda", licencas: 1 },
      { identificador: banco.identificador, nome: "Banco", licencas: 1 },
      { identificador: planilha.identificador, nome: "Planilha", licencas: 0 },
    ]);
  });
});
