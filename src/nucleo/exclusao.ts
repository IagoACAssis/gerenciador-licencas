// Exclusão (soft delete) de Produtos, Clientes e Licenças. Nada é apagado: a
// Exclusão preenche a data de exclusão, e a restauração a esvazia. Uma Licença
// está "em uso" quando nem ela nem o Produto nem o Cliente dela foram excluídos;
// fora de uso, ela some das listas, das consultas e das ações e não valida.
import { and, asc, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { clientes, licencas, produtos } from "../banco/esquema.ts";
import type { Transacao } from "../banco/conexao.ts";
import { emGrupos } from "./chave-licenca.ts";
import { calcularSituacao, type EstadoLicenca } from "./estado.ts";
import type { DependenciasNucleo } from "./index.ts";

/** Condição de Licença em uso, para consultas que juntam a Licença ao Produto e ao Cliente dela. */
export const licencaEmUso: SQL = and(isNull(licencas.excluidaEm), isNull(produtos.excluidoEm), isNull(clientes.excluidoEm))!;

/** Com a Licença já travada: ela está em uso? Lida depois da trava para ver Exclusões que acabaram de terminar. */
export async function estaEmUso(tx: Transacao, idLicenca: number): Promise<boolean> {
  const [linha] = await tx
    .select({ id: licencas.id })
    .from(licencas)
    .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
    .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
    .where(and(eq(licencas.id, idLicenca), licencaEmUso));
  return !!linha;
}

/** Estados de Licença que impedem a Exclusão do Produto ou do Cliente dela. */
const ESTADOS_QUE_IMPEDEM_EXCLUSAO: readonly EstadoLicenca[] = ["Ativa", "Suspensa"];

/** Exclusão ou restauração recusada, com o motivo na mensagem. */
export class ExclusaoNaoPermitida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ExclusaoNaoPermitida";
  }
}

/**
 * Recusa a Exclusão se alguma Licença em uso do Produto ou do Cliente (`dono`)
 * estiver Ativa ou Suspensa. Trava essas Licenças, para que uma Renovação ou
 * reativação simultânea espere a Exclusão terminar e então a encontre.
 */
export async function recusarSeHaLicencaEmVigor(tx: Transacao, dono: SQL, mensagem: string, agora: Date): Promise<void> {
  const linhas = await tx
    .select({
      validaAte: licencas.validaAte,
      suspensaEm: licencas.suspensaEm,
      revogadaEm: licencas.revogadaEm,
      janelaAvisoDias: produtos.janelaAvisoDias,
      carenciaDias: produtos.carenciaDias,
    })
    .from(licencas)
    .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
    .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
    .where(and(dono, licencaEmUso))
    .for("update", { of: licencas });
  const emVigor = linhas.some((linha) => ESTADOS_QUE_IMPEDEM_EXCLUSAO.includes(calcularSituacao(linha, linha, agora).estado));
  if (emVigor) throw new ExclusaoNaoPermitida(mensagem);
}

/** O que está na lista de excluídos, do excluído mais recente para o mais antigo. */
export interface Excluidos {
  produtos: { identificador: string; nome: string; excluidoEm: Date }[];
  clientes: { id: number; nome: string; email: string; excluidoEm: Date }[];
  licencas: { prefixo: string; produto: string; cliente: string; excluidaEm: Date }[];
}

export function casosDeUsoDeExclusao({ banco }: DependenciasNucleo) {
  return {
    /** Lista de excluídos do painel: só o que foi excluído diretamente, não as Licenças de um dono excluído. */
    async listarExcluidos(): Promise<Excluidos> {
      const produtosExcluidos = await banco
        .select({ identificador: produtos.identificador, nome: produtos.nome, excluidoEm: produtos.excluidoEm })
        .from(produtos)
        .where(isNotNull(produtos.excluidoEm))
        .orderBy(desc(produtos.excluidoEm), asc(produtos.id));
      const clientesExcluidos = await banco
        .select({ id: clientes.id, nome: clientes.nome, email: clientes.email, excluidoEm: clientes.excluidoEm })
        .from(clientes)
        .where(isNotNull(clientes.excluidoEm))
        .orderBy(desc(clientes.excluidoEm), asc(clientes.id));
      const licencasExcluidas = await banco
        .select({
          prefixo: licencas.prefixoChave,
          produto: produtos.nome,
          cliente: clientes.nome,
          excluidaEm: licencas.excluidaEm,
        })
        .from(licencas)
        .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
        .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
        .where(isNotNull(licencas.excluidaEm))
        .orderBy(desc(licencas.excluidaEm), asc(licencas.id));
      return {
        produtos: produtosExcluidos.map((p) => ({ ...p, excluidoEm: p.excluidoEm! })),
        clientes: clientesExcluidos.map((c) => ({ ...c, excluidoEm: c.excluidoEm! })),
        licencas: licencasExcluidas.map((l) => ({ ...l, prefixo: emGrupos(l.prefixo), excluidaEm: l.excluidaEm! })),
      };
    },
  };
}
