import { and, asc, desc, eq, like, type SQL } from "drizzle-orm";
import { ativacoes, clientes, eventosLicenca, licencas, produtos } from "../banco/esquema.ts";
import { TAMANHO_DO_PREFIXO, emGrupos, gerarChave, normalizarChave } from "./chave-licenca.ts";
import { calcularSituacao, limiteDeAtivacoes, type EstadoLicenca } from "./estado.ts";
import type { DependenciasNucleo } from "./index.ts";

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

export type EventoLicenca = {
  tipo: "emissao";
  ocorridoEm: Date;
  validaAte: Date | null;
  limiteAtivacoes: number | null;
};

/** Ativação da Licença como o painel a mostra. */
export interface Ativacao {
  dispositivo: string;
  nomeDispositivo: string | null;
  ativadaEm: Date;
  ultimaValidacaoEm: Date;
}

export interface DetalheLicenca extends Licenca {
  historico: EventoLicenca[];
  /** Da mais antiga para a mais nova. */
  ativacoes: Ativacao[];
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

// Faixa do `integer` do Postgres.
const MAIOR_INTEIRO = 2_147_483_647;
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
  const dados = linha.dados as { validaAte: string | null; limiteAtivacoes: number | null };
  return {
    tipo: "emissao",
    ocorridoEm: linha.ocorridoEm,
    validaAte: dados.validaAte ? new Date(dados.validaAte) : null,
    limiteAtivacoes: dados.limiteAtivacoes,
  };
}

function violouUnicidade(erro: unknown, restricoes: string[]): boolean {
  const causa = erro instanceof Error && erro.cause ? erro.cause : erro;
  const { code, constraint_name } = (causa ?? {}) as { code?: string; constraint_name?: string };
  return code === "23505" && !!constraint_name && restricoes.includes(constraint_name);
}

export function casosDeUsoDeLicencas({ banco, relogio, aleatoriedade }: DependenciasNucleo) {
  function consulta() {
    return banco
      .select(colunas)
      .from(licencas)
      .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
      .innerJoin(clientes, eq(licencas.clienteId, clientes.id));
  }

  async function validar(dados: DadosEmissao, agora: Date) {
    const erros: Partial<Record<CampoLicenca, string>> = {};
    const [produto] = await banco
      .select({ id: produtos.id })
      .from(produtos)
      .where(eq(produtos.identificador, dados.produto));
    if (!produto) erros.produto = "Escolha um Produto cadastrado.";

    const idCliente = dados.cliente;
    const [cliente] =
      Number.isInteger(idCliente) && idCliente >= 1 && idCliente <= MAIOR_INTEIRO
        ? await banco.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, idCliente))
        : [];
    if (!cliente) erros.cliente = "Escolha um Cliente cadastrado.";

    const validaAte = dados.validaAte ?? null;
    if (validaAte && Number.isNaN(validaAte.getTime())) erros.validaAte = "Informe uma data válida.";
    else if (validaAte && validaAte <= agora) erros.validaAte = "A data de validade precisa estar no futuro.";

    const limite = dados.limiteAtivacoes ?? null;
    if (limite !== null && (!Number.isInteger(limite) || limite < 0 || limite > MAIOR_INTEIRO)) {
      erros.limiteAtivacoes = "Informe um número inteiro de zero ou mais, ou deixe vazio para seguir o padrão do Produto.";
    }

    if (!produto || !cliente || Object.keys(erros).length > 0) throw new DadosDeLicencaInvalidos(erros);
    return { produtoId: produto.id, clienteId: cliente.id, validaAte, limiteAtivacoes: limite };
  }

  async function obterPorId(id: number, agora: Date): Promise<Licenca> {
    const [linha] = await consulta().where(eq(licencas.id, id));
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
      const valores = await validar(dados, agora);
      for (let tentativa = 1; ; tentativa++) {
        const { chave, hash, prefixo } = gerarChave((quantidade) => aleatoriedade.bytes(quantidade));
        try {
          const id = await banco.transaction(async (tx) => {
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
        } catch (erro) {
          const repetida = violouUnicidade(erro, ["licencas_prefixo_chave_unico", "licencas_hash_chave_unico"]);
          if (!repetida || tentativa >= TENTATIVAS_DE_CHAVE) throw erro;
        }
      }
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

      const linhas = await consulta()
        .where(and(...condicoes))
        .orderBy(filtro.aVencer ? asc(licencas.validaAte) : desc(licencas.emitidaEm), desc(licencas.id));
      // O estado depende das regras atuais e do momento: o filtro por ele é feito depois do cálculo.
      return linhas
        .map((linha) => paraLicenca(linha, agora))
        .filter((licenca) => !filtro.estado || licenca.estado === filtro.estado)
        .filter((licenca) => !filtro.aVencer || licenca.aVencer);
    },

    /** Detalhe da Licença pelo prefixo da Chave (com ou sem hífen), com o histórico e as Ativações em ordem. */
    async obterLicenca(prefixo: string): Promise<DetalheLicenca | null> {
      const normalizado = normalizarChave(prefixo);
      if (normalizado.length !== TAMANHO_DO_PREFIXO) return null;
      const [linha] = await consulta().where(eq(licencas.prefixoChave, normalizado));
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
      return {
        ...paraLicenca(linha, relogio.agora()),
        historico: eventos.map(paraEvento),
        ativacoes: ativacoesDaLicenca,
      };
    },
  };
}
