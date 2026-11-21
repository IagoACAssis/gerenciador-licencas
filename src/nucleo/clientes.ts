import { and, asc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { clientes } from "../banco/esquema.ts";
import { idValido, violouUnicidade } from "../banco/postgres.ts";
import { clienteNaoExcluido as naoExcluido, recusarSeHaLicencaEmVigor } from "./exclusao.ts";
import type { DependenciasNucleo } from "./index.ts";

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** O que o Administrador informa ao cadastrar ou editar um Cliente. */
export interface DadosDoCliente {
  nome: string;
  email: string;
}

export type ErrosDoCliente = Partial<Record<keyof DadosDoCliente, string>>;

/** Cadastro ou edição recusado. `erros` traz a mensagem de cada campo com problema. */
export class DadosDeClienteInvalidos extends Error {
  constructor(readonly erros: ErrosDoCliente) {
    super(Object.values(erros).join(" "));
    this.name = "DadosDeClienteInvalidos";
  }
}

export class ClienteNaoEncontrado extends Error {
  constructor(readonly id: number) {
    super("Cliente não encontrado.");
    this.name = "ClienteNaoEncontrado";
  }
}

const EMAIL_JA_USADO = "Já existe um Cliente com este e-mail.";
const EMAIL_DE_EXCLUIDO = "Já existe um Cliente excluído com este e-mail: restaure-o na lista de excluídos.";
const TAMANHO_MAXIMO_NOME = 200;
const TAMANHO_MAXIMO_EMAIL = 254;
// Só confere o formato geral (algo@dominio.tld); quem garante que o e-mail existe é o Administrador.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(dados: DadosDoCliente): DadosDoCliente {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const erros: ErrosDoCliente = {};

  if (!nome) erros.nome = "Informe o nome do Cliente.";
  else if (nome.length > TAMANHO_MAXIMO_NOME) erros.nome = `Use no máximo ${TAMANHO_MAXIMO_NOME} caracteres no nome.`;

  if (!email) erros.email = "Informe o e-mail do Cliente.";
  else if (email.length > TAMANHO_MAXIMO_EMAIL || !FORMATO_EMAIL.test(email)) erros.email = "Informe um e-mail válido.";

  if (Object.keys(erros).length > 0) throw new DadosDeClienteInvalidos(erros);
  return { nome, email };
}

/** O Cliente como sai do núcleo, sem a data de exclusão. */
const colunas = {
  id: clientes.id,
  nome: clientes.nome,
  email: clientes.email,
  criadoEm: clientes.criadoEm,
  atualizadoEm: clientes.atualizadoEm,
};

/** `%`, `_` e `\` têm significado no ILIKE; escapados, a busca os trata como texto comum. */
function padraoDeTrecho(trecho: string): string {
  return `%${trecho.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function casosDeUsoDeClientes({ banco, relogio }: DependenciasNucleo) {
  /**
   * Troca a violação do índice único de e-mail pela recusa com mensagem clara. Um
   * Cliente excluído continua ocupando o e-mail, para que a restauração nunca conflite.
   */
  async function traduzirEmailRepetido(erro: unknown, email: string): Promise<never> {
    if (!violouUnicidade(erro, "clientes_email_unico")) throw erro;
    const [excluido] = await banco
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.email, email), isNotNull(clientes.excluidoEm)));
    throw new DadosDeClienteInvalidos({ email: excluido ? EMAIL_DE_EXCLUIDO : EMAIL_JA_USADO });
  }

  return {
    /** Cadastra um Cliente. Recusa (DadosDeClienteInvalidos) dados inválidos ou e-mail já usado. */
    async cadastrarCliente(dados: DadosDoCliente): Promise<Cliente> {
      const { nome, email } = validar(dados);
      const agora = relogio.agora();
      const [cliente] = await banco
        .insert(clientes)
        .values({ nome, email, criadoEm: agora, atualizadoEm: agora })
        .returning(colunas)
        .catch((erro: unknown) => traduzirEmailRepetido(erro, email));
      return cliente!;
    },

    /**
     * Troca o nome e o e-mail de um Cliente. Recusa (DadosDeClienteInvalidos) dados
     * inválidos ou e-mail de outro Cliente, e lança ClienteNaoEncontrado se o id não
     * existir ou for de Cliente excluído.
     */
    async editarCliente(id: number, dados: DadosDoCliente): Promise<Cliente> {
      const { nome, email } = validar(dados);
      if (!idValido(id)) throw new ClienteNaoEncontrado(id);
      const [cliente] = await banco
        .update(clientes)
        .set({ nome, email, atualizadoEm: relogio.agora() })
        .where(and(eq(clientes.id, id), naoExcluido))
        .returning(colunas)
        .catch((erro: unknown) => traduzirEmailRepetido(erro, email));
      if (!cliente) throw new ClienteNaoEncontrado(id);
      return cliente;
    },

    /** O Cliente do id; null se não existir ou estiver excluído. */
    async obterCliente(id: number): Promise<Cliente | null> {
      if (!idValido(id)) return null;
      const [cliente] = await banco.select(colunas).from(clientes).where(and(eq(clientes.id, id), naoExcluido));
      return cliente ?? null;
    },

    /**
     * Lista os Clientes não excluídos em ordem de nome. Com `busca`, só os que têm o trecho no nome
     * ou no e-mail, sem diferenciar maiúsculas.
     */
    async listarClientes({ busca = "" }: { busca?: string } = {}): Promise<Cliente[]> {
      const trecho = busca.trim();
      const filtro = trecho
        ? or(ilike(clientes.nome, padraoDeTrecho(trecho)), ilike(clientes.email, padraoDeTrecho(trecho)))
        : undefined;
      return banco.select(colunas).from(clientes).where(and(naoExcluido, filtro)).orderBy(asc(clientes.nome), asc(clientes.id));
    },

    /**
     * Exclusão do Cliente: ele e as Licenças dele saem das listas e das consultas,
     * e as Licenças deixam de valer na Validação. Nada é apagado, e o e-mail continua
     * ocupado. Recusa (ExclusaoNaoPermitida) se houver Licença em uso Ativa ou
     * Suspensa; lança ClienteNaoEncontrado se não houver Cliente não excluído.
     */
    async excluirCliente(id: number): Promise<void> {
      if (!idValido(id)) throw new ClienteNaoEncontrado(id);
      const agora = relogio.agora();
      await banco.transaction(async (tx) => {
        // Travado: Emissões e restaurações de Licença simultâneas esperam a Exclusão terminar.
        const [cliente] = await tx
          .select({ id: clientes.id })
          .from(clientes)
          .where(and(eq(clientes.id, id), naoExcluido))
          .for("update");
        if (!cliente) throw new ClienteNaoEncontrado(id);
        await recusarSeHaLicencaEmVigor(tx, { clienteId: id }, agora);
        await tx.update(clientes).set({ excluidoEm: agora }).where(eq(clientes.id, id));
      });
    },

    /** Desfaz a Exclusão: o Cliente volta com as Licenças dele. Lança ClienteNaoEncontrado se não houver Cliente excluído. */
    async restaurarCliente(id: number): Promise<void> {
      if (!idValido(id)) throw new ClienteNaoEncontrado(id);
      const restaurados = await banco
        .update(clientes)
        .set({ excluidoEm: null })
        .where(and(eq(clientes.id, id), isNotNull(clientes.excluidoEm)))
        .returning({ id: clientes.id });
      if (restaurados.length === 0) throw new ClienteNaoEncontrado(id);
    },
  };
}
