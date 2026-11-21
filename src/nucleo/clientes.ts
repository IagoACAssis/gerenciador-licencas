import { asc, eq, ilike, or } from "drizzle-orm";
import { clientes } from "../banco/esquema.ts";
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
const TAMANHO_MAXIMO_NOME = 200;
const TAMANHO_MAXIMO_EMAIL = 254;
// Só confere o formato geral (algo@dominio.tld); quem garante que o e-mail existe é o Administrador.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Faixa do `integer` do Postgres, onde ficam os ids.
const MAIOR_ID = 2_147_483_647;

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

function idValido(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAIOR_ID;
}

/** Troca a violação do índice único de e-mail pela recusa com mensagem clara. */
function traduzirEmailRepetido(erro: unknown): never {
  const causa = erro instanceof Error && erro.cause ? erro.cause : erro;
  const { code, constraint_name } = (causa ?? {}) as { code?: string; constraint_name?: string };
  if (code === "23505" && constraint_name === "clientes_email_unico") {
    throw new DadosDeClienteInvalidos({ email: EMAIL_JA_USADO });
  }
  throw erro;
}

/** `%`, `_` e `\` têm significado no ILIKE; escapados, a busca os trata como texto comum. */
function padraoDeTrecho(trecho: string): string {
  return `%${trecho.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function casosDeUsoDeClientes({ banco, relogio }: DependenciasNucleo) {
  return {
    /** Cadastra um Cliente. Recusa (DadosDeClienteInvalidos) dados inválidos ou e-mail já usado. */
    async cadastrarCliente(dados: DadosDoCliente): Promise<Cliente> {
      const { nome, email } = validar(dados);
      const agora = relogio.agora();
      const [cliente] = await banco
        .insert(clientes)
        .values({ nome, email, criadoEm: agora, atualizadoEm: agora })
        .returning()
        .catch(traduzirEmailRepetido);
      return cliente!;
    },

    /**
     * Troca o nome e o e-mail de um Cliente. Recusa (DadosDeClienteInvalidos) dados
     * inválidos ou e-mail de outro Cliente, e lança ClienteNaoEncontrado se o id não existir.
     */
    async editarCliente(id: number, dados: DadosDoCliente): Promise<Cliente> {
      const { nome, email } = validar(dados);
      if (!idValido(id)) throw new ClienteNaoEncontrado(id);
      const [cliente] = await banco
        .update(clientes)
        .set({ nome, email, atualizadoEm: relogio.agora() })
        .where(eq(clientes.id, id))
        .returning()
        .catch(traduzirEmailRepetido);
      if (!cliente) throw new ClienteNaoEncontrado(id);
      return cliente;
    },

    async obterCliente(id: number): Promise<Cliente | null> {
      if (!idValido(id)) return null;
      const [cliente] = await banco.select().from(clientes).where(eq(clientes.id, id));
      return cliente ?? null;
    },

    /**
     * Lista os Clientes em ordem de nome. Com `busca`, só os que têm o trecho no nome
     * ou no e-mail, sem diferenciar maiúsculas.
     */
    async listarClientes({ busca = "" }: { busca?: string } = {}): Promise<Cliente[]> {
      const trecho = busca.trim();
      const filtro = trecho
        ? or(ilike(clientes.nome, padraoDeTrecho(trecho)), ilike(clientes.email, padraoDeTrecho(trecho)))
        : undefined;
      return banco.select().from(clientes).where(filtro).orderBy(asc(clientes.nome), asc(clientes.id));
    },
  };
}
