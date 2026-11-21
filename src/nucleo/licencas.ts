import { and, asc, desc, eq, like, type SQL } from "drizzle-orm";
import { ativacoes, clientes, eventosLicenca, licencas, produtos, substituicoesAtivacao } from "../banco/esquema.ts";
import { idValido, MAIOR_INTEIRO, violouUnicidade } from "../banco/postgres.ts";
import { TAMANHO_DO_PREFIXO, emGrupos, gerarChave, lerPrefixo, normalizarChave } from "./chave-licenca.ts";
import { calcularSituacao, limiteDeAtivacoes, type EstadoLicenca } from "./estado.ts";
import type { Transacao } from "../banco/conexao.ts";
import type { DependenciasNucleo } from "./index.ts";
import { clienteNaoExcluido, estaEmUso, licencaEmUso, produtoNaoExcluido, recusarSeDonoExcluido } from "./exclusao.ts";
import { substituicoesNoPeriodo } from "./substituicoes.ts";

export { ESTADOS_LICENCA, type EstadoLicenca } from "./estado.ts";

/** O que o Administrador informa ao emitir uma Licença. */
export interface DadosEmissao {
  /** Identificador público do Produto. */
  produto: string;
  /** Id do Cliente. */
  cliente: number;
  /** Vazia = Licença perpétua. */
  validaAte?: Date | null;
  /** Vazio = segue o Limite de ativações padrão do Produto. */
  limiteAtivacoes?: number | null;
}

/** Licença como sai do núcleo: identificada pelo prefixo da Chave, nunca pela Chave. */
export interface Licenca {
  /** Primeiros caracteres da Chave de licença, como "ABCD-EFGH". */
  prefixo: string;
  produto: { identificador: string; nome: string };
  cliente: { id: number; nome: string; email: string };
  validaAte: Date | null;
  /** Limite de ativações que vale agora: o próprio da Licença ou o padrão atual do Produto. */
  limiteAtivacoes: number;
  /** Limite definido na Licença; null quando ela segue o padrão do Produto. */
  limiteProprio: number | null;
  estado: EstadoLicenca;
  aVencer: boolean;
  emCarencia: boolean;
  emitidaEm: Date;
}

export type EventoLicenca =
  | { tipo: "emissao"; ocorridoEm: Date; validaAte: Date | null; limiteAtivacoes: number | null }
  | { tipo: "ativacao_removida"; ocorridoEm: Date; dispositivo: string; nomeDispositivo: string | null }
  | { tipo: "contagem_substituicoes_zerada"; ocorridoEm: Date }
  | { tipo: "suspensao"; ocorridoEm: Date }
  | { tipo: "reativacao"; ocorridoEm: Date }
  | { tipo: "revogacao"; ocorridoEm: Date }
  | { tipo: "exclusao"; ocorridoEm: Date }
  | { tipo: "restauracao"; ocorridoEm: Date }
  | { tipo: "renovacao"; ocorridoEm: Date; validaAteAnterior: Date; validaAte: Date }
  | { tipo: "limite_alterado"; ocorridoEm: Date; limiteAnterior: number | null; limiteAtivacoes: number | null }
  | { tipo: "troca_de_chave"; ocorridoEm: Date; prefixoAnterior: string };

/** Evento como a ação o descreve; a data é a da transação. */
type NovoEvento = EventoLicenca extends infer E ? (E extends unknown ? Omit<E, "ocorridoEm"> : never) : never;

/** Ativação da Licença como o painel a mostra. */
export interface Ativacao {
  dispositivo: string;
  nomeDispositivo: string | null;
  ativadaEm: Date;
  ultimaValidacaoEm: Date;
}

/** Registro de uma Substituição de ativação. */
export interface SubstituicaoAtivacao {
  dispositivoRemovido: string;
  dispositivoNovo: string;
  feitaEm: Date;
}

export interface DetalheLicenca extends Licenca {
  historico: EventoLicenca[];
  /** Da mais antiga para a mais nova. */
  ativacoes: Ativacao[];
  /** Todas as Substituições de ativação da Licença, da mais antiga para a mais nova. */
  substituicoes: SubstituicaoAtivacao[];
  /** Substituições de ativação que contam agora para a Cota de substituições. */
  substituicoesNoPeriodo: number;
  /** Cota de substituições atual do Produto. */
  cotaSubstituicoes: { quantidade: number; dias: number };
  /** Último "zerar contagem": as Substituições de ativação até esse instante não contam mais. */
  contagemSubstituicoesZeradaEm: Date | null;
}

export interface FiltroLicencas {
  /** Identificador público do Produto. */
  produto?: string;
  cliente?: number;
  estado?: EstadoLicenca;
  /** Começo da Chave de licença, com ou sem hífen, sem diferenciar maiúsculas. */
  prefixo?: string;
  /** Só as Licenças a vencer, da data de validade mais próxima para a mais distante. */
  aVencer?: boolean;
}

export type CampoLicenca = "produto" | "cliente" | "validaAte" | "limiteAtivacoes";

/** Emissão recusada, com a mensagem de cada campo inválido. */
export class DadosDeLicencaInvalidos extends Error {
  constructor(readonly erros: Partial<Record<CampoLicenca, string>>) {
    super(Object.values(erros).join(" "));
    this.name = "DadosDeLicencaInvalidos";
  }
}

export class AtivacaoNaoEncontrada extends Error {
  constructor() {
    super("A Licença não tem Ativação neste Dispositivo.");
    this.name = "AtivacaoNaoEncontrada";
  }
}

/** Ação de ciclo de vida que o estado atual da Licença não permite, com o motivo na mensagem. */
export class AcaoNaoPermitida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "AcaoNaoPermitida";
  }
}

export class LicencaNaoEncontrada extends Error {
  constructor() {
    super("Licença não encontrada.");
    this.name = "LicencaNaoEncontrada";
  }
}

// Colisão de prefixo (40 bits) é rara; se acontecer, basta gerar outra Chave.
const TENTATIVAS_DE_CHAVE = 5;

const colunas = {
  id: licencas.id,
  prefixoChave: licencas.prefixoChave,
  validaAte: licencas.validaAte,
  limiteAtivacoes: licencas.limiteAtivacoes,
  emitidaEm: licencas.emitidaEm,
  produtoIdentificador: produtos.identificador,
  produtoNome: produtos.nome,
  janelaAvisoDias: produtos.janelaAvisoDias,
  carenciaDias: produtos.carenciaDias,
  limiteAtivacoesPadrao: produtos.limiteAtivacoesPadrao,
  cotaSubstituicoesQuantidade: produtos.cotaSubstituicoesQuantidade,
  cotaSubstituicoesDias: produtos.cotaSubstituicoesDias,
  contagemSubstituicoesZeradaEm: licencas.contagemSubstituicoesZeradaEm,
  suspensaEm: licencas.suspensaEm,
  revogadaEm: licencas.revogadaEm,
  clienteId: clientes.id,
  clienteNome: clientes.nome,
  clienteEmail: clientes.email,
};

type Coluna<K extends keyof typeof colunas> = (typeof colunas)[K]["_"];
type Linha = { [K in keyof typeof colunas]: Coluna<K>["notNull"] extends true ? Coluna<K>["data"] : Coluna<K>["data"] | null };

function paraLicenca(linha: Linha, agora: Date): Licenca {
  // Regras lidas do Produto a cada cálculo: mudanças nelas valem na hora.
  const situacao = calcularSituacao(linha, linha, agora);
  return {
    prefixo: emGrupos(linha.prefixoChave),
    produto: { identificador: linha.produtoIdentificador, nome: linha.produtoNome },
    cliente: { id: linha.clienteId, nome: linha.clienteNome, email: linha.clienteEmail },
    validaAte: linha.validaAte,
    limiteAtivacoes: limiteDeAtivacoes(linha, linha),
    limiteProprio: linha.limiteAtivacoes,
    ...situacao,
    emitidaEm: linha.emitidaEm,
  };
}

function paraEvento(linha: { tipo: string; dados: unknown; ocorridoEm: Date }): EventoLicenca {
  if (
    linha.tipo === "contagem_substituicoes_zerada" ||
    linha.tipo === "suspensao" ||
    linha.tipo === "reativacao" ||
    linha.tipo === "revogacao" ||
    linha.tipo === "exclusao" ||
    linha.tipo === "restauracao"
  ) {
    return { tipo: linha.tipo, ocorridoEm: linha.ocorridoEm };
  }
  if (linha.tipo === "ativacao_removida") {
    const dados = linha.dados as { dispositivo: string; nomeDispositivo: string | null };
    return { tipo: linha.tipo, ocorridoEm: linha.ocorridoEm, dispositivo: dados.dispositivo, nomeDispositivo: dados.nomeDispositivo };
  }
  if (linha.tipo === "limite_alterado") {
    const dados = linha.dados as { limiteAnterior: number | null; limiteAtivacoes: number | null };
    return { tipo: linha.tipo, ocorridoEm: linha.ocorridoEm, limiteAnterior: dados.limiteAnterior, limiteAtivacoes: dados.limiteAtivacoes };
  }
  if (linha.tipo === "troca_de_chave") {
    const dados = linha.dados as { prefixoAnterior: string };
    return { tipo: linha.tipo, ocorridoEm: linha.ocorridoEm, prefixoAnterior: dados.prefixoAnterior };
  }
  if (linha.tipo === "renovacao") {
    const dados = linha.dados as { validaAteAnterior: string; validaAte: string };
    return {
      tipo: linha.tipo,
      ocorridoEm: linha.ocorridoEm,
      validaAteAnterior: new Date(dados.validaAteAnterior),
      validaAte: new Date(dados.validaAte),
    };
  }
  const dados = linha.dados as { validaAte: string | null; limiteAtivacoes: number | null };
  return {
    tipo: "emissao",
    ocorridoEm: linha.ocorridoEm,
    validaAte: dados.validaAte ? new Date(dados.validaAte) : null,
    limiteAtivacoes: dados.limiteAtivacoes,
  };
}

/** Mensagem para uma data de validade inválida ou que não está no futuro; undefined se ela servir. */
function erroNaDataDeValidade(validaAte: Date, agora: Date): string | undefined {
  if (Number.isNaN(validaAte.getTime())) return "Informe uma data válida.";
  if (validaAte <= agora) return "A data de validade precisa estar no futuro.";
  return undefined;
}

/** Mensagem para um Limite de ativações próprio inválido; undefined se ele servir (null = padrão do Produto). */
function erroNoLimite(limite: number | null): string | undefined {
  if (limite === null || (Number.isInteger(limite) && limite >= 0 && limite <= MAIOR_INTEIRO)) return undefined;
  return "Informe um número inteiro de zero ou mais, ou deixe vazio para seguir o padrão do Produto.";
}

/** O que uma ação do Administrador lê da Licença travada: o que as recusas precisam. */
const colunasTravadas = {
  id: licencas.id,
  produtoId: licencas.produtoId,
  clienteId: licencas.clienteId,
  excluidaEm: licencas.excluidaEm,
  prefixoChave: licencas.prefixoChave,
  validaAte: licencas.validaAte,
  limiteAtivacoes: licencas.limiteAtivacoes,
  suspensaEm: licencas.suspensaEm,
  revogadaEm: licencas.revogadaEm,
};
type LicencaTravada = Pick<typeof licencas.$inferSelect, keyof typeof colunasTravadas>;

/** A Revogação é definitiva: nenhuma ação de ciclo de vida muda uma Licença Revogada. */
function recusarSeRevogada(licenca: LicencaTravada): void {
  if (licenca.revogadaEm) throw new AcaoNaoPermitida("A Licença foi Revogada e não pode mais ser alterada.");
}

/**
 * Gera uma Chave nova e a entrega a `gravar`, que a guarda na Licença. Se o prefixo ou
 * o hash já forem de outra Licença, gera outra e tenta de novo, até TENTATIVAS_DE_CHAVE.
 */
async function comChaveNova<T>(
  bytes: (quantidade: number) => Uint8Array,
  gravar: (gerada: ReturnType<typeof gerarChave>) => Promise<T>,
): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await gravar(gerarChave(bytes));
    } catch (erro) {
      const repetida = violouUnicidade(erro, "licencas_prefixo_chave_unico", "licencas_hash_chave_unico");
      if (!repetida || tentativa >= TENTATIVAS_DE_CHAVE) throw erro;
    }
  }
}

export function casosDeUsoDeLicencas({ banco, relogio, aleatoriedade }: DependenciasNucleo) {
  /** Só as Licenças em uso: as excluídas e as de Produto ou Cliente excluído ficam de fora. */
  function consulta(condicao?: SQL) {
    return banco
      .select(colunas)
      .from(licencas)
      .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
      .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
      .where(and(licencaEmUso, condicao));
  }

  /**
   * Confere os dados da Emissão dentro da transação dela. Produto e Cliente
   * excluídos contam como inexistentes, e ficam travados (FOR SHARE) até o fim,
   * para que uma Exclusão simultânea espere e então encontre a Licença nova.
   */
  async function validar(tx: Transacao, dados: DadosEmissao, agora: Date) {
    const erros: Partial<Record<CampoLicenca, string>> = {};
    const [produto] = await tx
      .select({ id: produtos.id })
      .from(produtos)
      .where(and(eq(produtos.identificador, dados.produto), produtoNaoExcluido))
      .for("share");
    if (!produto) erros.produto = "Escolha um Produto cadastrado.";

    const idCliente = dados.cliente;
    const [cliente] =
      idValido(idCliente)
        ? await tx
            .select({ id: clientes.id })
            .from(clientes)
            .where(and(eq(clientes.id, idCliente), clienteNaoExcluido))
            .for("share")
        : [];
    if (!cliente) erros.cliente = "Escolha um Cliente cadastrado.";

    const validaAte = dados.validaAte ?? null;
    const erroNaData = validaAte && erroNaDataDeValidade(validaAte, agora);
    if (erroNaData) erros.validaAte = erroNaData;

    const limite = dados.limiteAtivacoes ?? null;
    const erroNoLimiteInformado = erroNoLimite(limite);
    if (erroNoLimiteInformado) erros.limiteAtivacoes = erroNoLimiteInformado;

    if (!produto || !cliente || Object.keys(erros).length > 0) throw new DadosDeLicencaInvalidos(erros);
    return { produtoId: produto.id, clienteId: cliente.id, validaAte, limiteAtivacoes: limite };
  }

  /**
   * Roda uma ação do Administrador sobre a Licença do prefixo, com ela travada,
   * como na Validação, e registra o evento no histórico na mesma transação.
   * `alcance` diz qual Licença a ação encontra: só a em uso (o normal) ou só a
   * excluída (para a restauração); qualquer outra conta como LicencaNaoEncontrada.
   * Devolve o id da Licença e o instante da ação.
   */
  async function emTransacaoNaLicenca(
    prefixo: string,
    acao: (tx: Transacao, licenca: LicencaTravada, agora: Date) => Promise<NovoEvento>,
    alcance: "em uso" | "excluida" = "em uso",
  ): Promise<{ id: number; agora: Date }> {
    const normalizado = lerPrefixo(prefixo);
    const agora = relogio.agora();
    return banco.transaction(async (tx) => {
      const [licenca] =
        normalizado
          ? await tx
              .select(colunasTravadas)
              .from(licencas)
              .where(eq(licencas.prefixoChave, normalizado))
              .for("update")
          : [];
      // "Em uso" é conferido depois da trava: uma Exclusão do Produto ou do Cliente que acabou de terminar já aparece.
      const encontrada =
        !!licenca && (alcance === "excluida" ? licenca.excluidaEm !== null : await estaEmUso(tx, licenca.id));
      if (!encontrada) throw new LicencaNaoEncontrada();
      const { tipo, ...dados } = await acao(tx, licenca, agora);
      await tx.insert(eventosLicenca).values({ licencaId: licenca.id, tipo, dados, ocorridoEm: agora });
      return { id: licenca.id, agora };
    });
  }

  const bytesAleatorios = (quantidade: number) => aleatoriedade.bytes(quantidade);

  async function obterPorId(id: number, agora: Date): Promise<Licenca> {
    const [linha] = await consulta(eq(licencas.id, id));
    return paraLicenca(linha!, agora);
  }

  return {
    /**
     * Emite uma Licença e devolve a Chave de licença. É a única vez que a Chave sai
     * do núcleo (ADR-0003). Recusa (DadosDeLicencaInvalidos) Produto ou Cliente
     * inexistente, data de validade que não está no futuro e limite inválido.
     */
    async emitirLicenca(dados: DadosEmissao): Promise<{ licenca: Licenca; chave: string }> {
      const agora = relogio.agora();
      return comChaveNova(bytesAleatorios, async ({ chave, hash, prefixo }) => {
        const id = await banco.transaction(async (tx) => {
          const valores = await validar(tx, dados, agora);
          const [licenca] = await tx
            .insert(licencas)
            .values({ ...valores, hashChave: hash, prefixoChave: prefixo, emitidaEm: agora })
            .returning({ id: licencas.id });
          await tx.insert(eventosLicenca).values({
            licencaId: licenca!.id,
            tipo: "emissao",
            dados: { validaAte: valores.validaAte?.toISOString() ?? null, limiteAtivacoes: valores.limiteAtivacoes },
            ocorridoEm: agora,
          });
          return licenca!.id;
        });
        return { licenca: await obterPorId(id, agora), chave };
      });
    },

    /**
     * Troca de chave: dá à Licença uma Chave de licença nova e a devolve. Além da
     * emissão, é o único caso de uso que devolve a Chave (ADR-0003). A antiga deixa de
     * valer na hora; Ativações, data de validade, estado e histórico continuam os
     * mesmos, e a troca entra no histórico. A Licença passa a ser encontrada pelo
     * prefixo novo. Lança LicencaNaoEncontrada para um prefixo sem Licença e
     * AcaoNaoPermitida para Licença Revogada.
     */
    async trocarChave(prefixo: string): Promise<{ licenca: Licenca; chave: string }> {
      return comChaveNova(bytesAleatorios, async (nova) => {
        const { id, agora } = await emTransacaoNaLicenca(prefixo, async (tx, licenca) => {
          recusarSeRevogada(licenca);
          await tx
            .update(licencas)
            .set({ hashChave: nova.hash, prefixoChave: nova.prefixo })
            .where(eq(licencas.id, licenca.id));
          return { tipo: "troca_de_chave", prefixoAnterior: emGrupos(licenca.prefixoChave) };
        });
        return { licenca: await obterPorId(id, agora), chave: nova.chave };
      });
    },

    /** Lista as Licenças com estado e indicações, das mais novas para as mais antigas. */
    async listarLicencas(filtro: FiltroLicencas = {}): Promise<Licenca[]> {
      const agora = relogio.agora();
      const condicoes: SQL[] = [];
      if (filtro.produto) condicoes.push(eq(produtos.identificador, filtro.produto));
      if (filtro.cliente !== undefined) condicoes.push(eq(clientes.id, filtro.cliente));
      const prefixo = normalizarChave(filtro.prefixo ?? "").slice(0, TAMANHO_DO_PREFIXO);
      // Depois de normalizado, o prefixo só tem letras e números: nada a escapar no LIKE.
      if (prefixo) condicoes.push(like(licencas.prefixoChave, `${prefixo}%`));

      const linhas = await consulta(and(...condicoes))
        .orderBy(filtro.aVencer ? asc(licencas.validaAte) : desc(licencas.emitidaEm), desc(licencas.id));
      // O estado depende das regras atuais e do momento: o filtro por ele é feito depois do cálculo.
      return linhas
        .map((linha) => paraLicenca(linha, agora))
        .filter((licenca) => !filtro.estado || licenca.estado === filtro.estado)
        .filter((licenca) => !filtro.aVencer || licenca.aVencer);
    },

    /**
     * Remove a Ativação do Dispositivo, liberando a vaga sem gastar a Cota de
     * substituições. Lança LicencaNaoEncontrada para um prefixo sem Licença e
     * AtivacaoNaoEncontrada se a Licença não tiver Ativação nesse Dispositivo.
     */
    async removerAtivacao(prefixo: string, dispositivo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca) => {
        const [removida] = await tx
          .delete(ativacoes)
          .where(and(eq(ativacoes.licencaId, licenca.id), eq(ativacoes.dispositivo, dispositivo)))
          .returning({ nomeDispositivo: ativacoes.nomeDispositivo });
        if (!removida) throw new AtivacaoNaoEncontrada();
        return { tipo: "ativacao_removida", dispositivo, nomeDispositivo: removida.nomeDispositivo };
      });
    },

    /**
     * Zera a contagem de Substituições de ativação: as feitas até agora deixam de
     * contar para a Cota de substituições, mas continuam registradas. Lança
     * LicencaNaoEncontrada para um prefixo sem Licença.
     */
    async zerarContagemDeSubstituicoes(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca, agora) => {
        await tx.update(licencas).set({ contagemSubstituicoesZeradaEm: agora }).where(eq(licencas.id, licenca.id));
        return { tipo: "contagem_substituicoes_zerada" };
      });
    },

    /**
     * Renovação: muda só a data de validade, inclusive de Licença Expirada, que volta
     * a ser Ativa. A nova data precisa estar no futuro e ser posterior à atual. Licença
     * perpétua não é renovada. Recusa com DadosDeLicencaInvalidos, e Licença Revogada
     * com AcaoNaoPermitida.
     */
    async renovarLicenca(prefixo: string, validaAte: Date): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca, agora) => {
        recusarSeRevogada(licenca);
        const anterior = licenca.validaAte;
        if (!anterior) {
          throw new DadosDeLicencaInvalidos({ validaAte: "Licença perpétua não tem data de validade para renovar." });
        }
        const erro = erroNaDataDeValidade(validaAte, agora) ??
          (validaAte <= anterior ? "A nova data de validade precisa ser posterior à atual." : undefined);
        if (erro) throw new DadosDeLicencaInvalidos({ validaAte: erro });
        await tx.update(licencas).set({ validaAte }).where(eq(licencas.id, licenca.id));
        return { tipo: "renovacao", validaAteAnterior: anterior, validaAte };
      });
    },

    /**
     * Muda o Limite de ativações próprio da Licença; null volta ao padrão do Produto.
     * Um limite abaixo das Ativações existentes não remove nenhuma. Recusa limite
     * inválido com DadosDeLicencaInvalidos e Licença Revogada com AcaoNaoPermitida.
     */
    async alterarLimiteDeAtivacoes(prefixo: string, limiteAtivacoes: number | null): Promise<void> {
      const erro = erroNoLimite(limiteAtivacoes);
      if (erro) throw new DadosDeLicencaInvalidos({ limiteAtivacoes: erro });
      await emTransacaoNaLicenca(prefixo, async (tx, licenca) => {
        recusarSeRevogada(licenca);
        await tx.update(licencas).set({ limiteAtivacoes }).where(eq(licencas.id, licenca.id));
        return { tipo: "limite_alterado", limiteAnterior: licenca.limiteAtivacoes, limiteAtivacoes };
      });
    },

    /**
     * Suspende a Licença: as Ativações são mantidas, mas a Validação passa a recusá-las.
     * Recusa (AcaoNaoPermitida) Licença Revogada ou já Suspensa.
     */
    async suspenderLicenca(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca, agora) => {
        recusarSeRevogada(licenca);
        if (licenca.suspensaEm) throw new AcaoNaoPermitida("A Licença já está Suspensa.");
        await tx.update(licencas).set({ suspensaEm: agora }).where(eq(licencas.id, licenca.id));
        return { tipo: "suspensao" };
      });
    },

    /**
     * Desfaz a suspensão. O estado volta a ser o calculado (pode ser Expirada se a
     * data de validade passou durante a suspensão) e as Ativações voltam a valer.
     * Recusa (AcaoNaoPermitida) Licença Revogada ou que não está Suspensa.
     */
    async reativarLicenca(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca) => {
        recusarSeRevogada(licenca);
        if (!licenca.suspensaEm) throw new AcaoNaoPermitida("A Licença não está Suspensa.");
        await tx.update(licencas).set({ suspensaEm: null }).where(eq(licencas.id, licenca.id));
        return { tipo: "reativacao" };
      });
    },

    /**
     * Revogação: encerra a Licença em definitivo. Depois dela, a Validação recusa a
     * Licença e nenhuma ação de ciclo de vida a altera (AcaoNaoPermitida).
     */
    async revogarLicenca(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca, agora) => {
        recusarSeRevogada(licenca);
        await tx.update(licencas).set({ revogadaEm: agora }).where(eq(licencas.id, licenca.id));
        return { tipo: "revogacao" };
      });
    },

    /**
     * Exclusão de uma Licença criada por engano, em qualquer estado: ela sai das
     * listas e das consultas e a Validação responde "chave_invalida", mas nada é
     * apagado. Lança LicencaNaoEncontrada para um prefixo sem Licença em uso.
     */
    async excluirLicenca(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(prefixo, async (tx, licenca, agora) => {
        await tx.update(licencas).set({ excluidaEm: agora }).where(eq(licencas.id, licenca.id));
        return { tipo: "exclusao" };
      });
    },

    /**
     * Desfaz a Exclusão: a Licença volta como estava, com estado, data de validade,
     * Ativações, histórico e Chave de licença. Lança LicencaNaoEncontrada para um
     * prefixo sem Licença excluída e recusa (ExclusaoNaoPermitida) se o Produto ou
     * o Cliente dela estiver excluído.
     */
    async restaurarLicenca(prefixo: string): Promise<void> {
      await emTransacaoNaLicenca(
        prefixo,
        async (tx, licenca) => {
          await recusarSeDonoExcluido(tx, licenca);
          await tx.update(licencas).set({ excluidaEm: null }).where(eq(licencas.id, licenca.id));
          return { tipo: "restauracao" };
        },
        "excluida",
      );
    },

    /** Detalhe da Licença pelo prefixo da Chave (com ou sem hífen), com o histórico e as Ativações em ordem. */
    async obterLicenca(prefixo: string): Promise<DetalheLicenca | null> {
      const normalizado = lerPrefixo(prefixo);
      if (!normalizado) return null;
      const [linha] = await consulta(eq(licencas.prefixoChave, normalizado));
      if (!linha) return null;
      const eventos = await banco
        .select({ tipo: eventosLicenca.tipo, dados: eventosLicenca.dados, ocorridoEm: eventosLicenca.ocorridoEm })
        .from(eventosLicenca)
        .where(eq(eventosLicenca.licencaId, linha.id))
        .orderBy(asc(eventosLicenca.ocorridoEm), asc(eventosLicenca.id));
      const ativacoesDaLicenca = await banco
        .select({
          dispositivo: ativacoes.dispositivo,
          nomeDispositivo: ativacoes.nomeDispositivo,
          ativadaEm: ativacoes.ativadaEm,
          ultimaValidacaoEm: ativacoes.ultimaValidacaoEm,
        })
        .from(ativacoes)
        .where(eq(ativacoes.licencaId, linha.id))
        .orderBy(asc(ativacoes.ativadaEm), asc(ativacoes.id));
      const substituicoes = await banco
        .select({
          dispositivoRemovido: substituicoesAtivacao.dispositivoRemovido,
          dispositivoNovo: substituicoesAtivacao.dispositivoNovo,
          feitaEm: substituicoesAtivacao.feitaEm,
        })
        .from(substituicoesAtivacao)
        .where(eq(substituicoesAtivacao.licencaId, linha.id))
        .orderBy(asc(substituicoesAtivacao.feitaEm), asc(substituicoesAtivacao.id));
      const agora = relogio.agora();
      return {
        ...paraLicenca(linha, agora),
        historico: eventos.map(paraEvento),
        ativacoes: ativacoesDaLicenca,
        substituicoes,
        substituicoesNoPeriodo: await substituicoesNoPeriodo(banco, linha, linha, agora),
        cotaSubstituicoes: { quantidade: linha.cotaSubstituicoesQuantidade, dias: linha.cotaSubstituicoesDias },
        contagemSubstituicoesZeradaEm: linha.contagemSubstituicoesZeradaEm,
      };
    },
  };
}
