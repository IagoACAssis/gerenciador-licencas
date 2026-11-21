// Resumo da Instância, para a página inicial do painel: contagens, a distribuição
// das Licenças por situação, as Licenças que pedem atenção, a atividade recente e
// as Licenças por Produto. Só lê o que já existe e só considera o que está em uso.
import { count, desc, eq } from "drizzle-orm";
import { clientes, eventosLicenca, licencas, produtos } from "../banco/esquema.ts";
import { emGrupos } from "./chave-licenca.ts";
import type { SituacaoLicenca } from "./estado.ts";
import { clienteNaoExcluido, licencaEmUso, produtoNaoExcluido } from "./exclusao.ts";
import type { DependenciasNucleo } from "./index.ts";
import { consultarLicencasEmUso, paraEvento, paraLicenca, type EventoLicenca, type Licenca } from "./licencas.ts";

// O que "pede atenção": a única fonte desta regra. Entram as Licenças em Carência,
// as a vencer e as Suspensas; a Revogada nunca entra (calcularSituacao nunca a dá
// como a vencer nem em Carência).

/** Os grupos de "pede atenção", na ordem em que aparecem. */
const EM_CARENCIA = 0;
const A_VENCER = 1;
const SUSPENSA = 2;

/** Grupo da Licença na ordem de "pede atenção", ou null se ela não pede atenção. */
function grupoDeAtencao(licenca: SituacaoLicenca): number | null {
  if (licenca.emCarencia) return EM_CARENCIA;
  if (licenca.aVencer) return A_VENCER;
  if (licenca.estado === "Suspensa") return SUSPENSA;
  return null;
}

/** A Licença pede atenção do Administrador: está em Carência, a vencer ou Suspensa. */
function pedeAtencao(licenca: SituacaoLicenca): boolean {
  return grupoDeAtencao(licenca) !== null;
}

/**
 * Só as Licenças que pedem atenção, na ordem em que o Administrador deve olhá-las: em
 * Carência, da data de validade mais antiga para a mais nova; depois as a vencer, da
 * mais próxima para a mais distante; por fim as Suspensas, da emitida mais recentemente
 * para a mais antiga (o spec não fixa a ordem delas; esta só a torna estável).
 */
function emOrdemDeAtencao(licencas: Licenca[]): Licenca[] {
  return licencas
    .filter(pedeAtencao)
    .toSorted((a, b) => {
      const grupo = grupoDeAtencao(a)!;
      const diferenca = grupo - grupoDeAtencao(b)!;
      if (diferenca !== 0) return diferenca;
      // Em Carência e a vencer sempre têm data de validade.
      const ordem =
        grupo === SUSPENSA ? b.emitidaEm.getTime() - a.emitidaEm.getTime() : a.validaAte!.getTime() - b.validaAte!.getTime();
      // Desempate só para a ordem não variar de uma consulta para outra.
      return ordem || a.prefixo.localeCompare(b.prefixo);
    });
}

/** Um evento do histórico na atividade recente, com a Licença em que aconteceu. */
export interface AtividadeRecente {
  evento: EventoLicenca;
  licenca: Pick<Licenca, "prefixo" | "produto"> & { cliente: Pick<Licenca["cliente"], "id" | "nome"> };
}

/** Quantos eventos a atividade recente traz quando não se pede outro número. */
const ATIVIDADE_RECENTE_PADRAO = 8;

export interface ResumoInstancia {
  /** Só o que está em uso: sem excluídos e sem Licenças de Produto ou Cliente excluído. */
  contagens: { produtos: number; clientes: number; licencas: number; licencasAtivas: number };
  /** As Licenças em uso divididas por situação; as quatro somam o total de Licenças. */
  porSituacao: {
    /** Ativas fora da Janela de aviso. */
    ativas: number;
    pedemAtencao: number;
    /** Expiradas fora da Carência. */
    expiradas: number;
    revogadas: number;
  };
  pedemAtencao: Licenca[];
  /** Os eventos mais recentes do histórico de todas as Licenças em uso, do mais novo para o mais antigo. */
  atividadeRecente: AtividadeRecente[];
  /** Cada Produto em uso com quantas Licenças em uso tem, do Produto com mais para o com menos. */
  porProduto: { identificador: string; nome: string; licencas: number }[];
}

export function casosDeUsoDoResumo({ banco, relogio }: DependenciasNucleo) {
  return {
    /** Resumo da Instância para a página inicial; `limiteDaAtividade` é quantos eventos a atividade recente traz. */
    async resumirInstancia({ limiteDaAtividade = ATIVIDADE_RECENTE_PADRAO }: { limiteDaAtividade?: number } = {}): Promise<ResumoInstancia> {
      const agora = relogio.agora();
      const [produtosEmUso, [totalClientes], linhas, eventos] = await Promise.all([
        banco.select({ identificador: produtos.identificador, nome: produtos.nome }).from(produtos).where(produtoNaoExcluido),
        banco.select({ total: count() }).from(clientes).where(clienteNaoExcluido),
        consultarLicencasEmUso(banco),
        banco
          .select({
            tipo: eventosLicenca.tipo,
            dados: eventosLicenca.dados,
            ocorridoEm: eventosLicenca.ocorridoEm,
            prefixo: licencas.prefixoChave,
            produtoIdentificador: produtos.identificador,
            produtoNome: produtos.nome,
            clienteId: clientes.id,
            clienteNome: clientes.nome,
          })
          .from(eventosLicenca)
          .innerJoin(licencas, eq(eventosLicenca.licencaId, licencas.id))
          .innerJoin(produtos, eq(licencas.produtoId, produtos.id))
          .innerJoin(clientes, eq(licencas.clienteId, clientes.id))
          .where(licencaEmUso)
          .orderBy(desc(eventosLicenca.ocorridoEm), desc(eventosLicenca.id))
          .limit(limiteDaAtividade),
      ]);
      const emUso = linhas.map((linha) => paraLicenca(linha, agora));
      const quantas = (condicao: (licenca: Licenca) => boolean) => emUso.filter(condicao).length;
      const atencao = emOrdemDeAtencao(emUso);
      const porIdentificador = new Map<string, number>();
      for (const { produto } of emUso) porIdentificador.set(produto.identificador, (porIdentificador.get(produto.identificador) ?? 0) + 1);
      return {
        contagens: {
          produtos: produtosEmUso.length,
          clientes: totalClientes!.total,
          licencas: emUso.length,
          licencasAtivas: quantas((licenca) => licenca.estado === "Ativa"),
        },
        porSituacao: {
          ativas: quantas((licenca) => licenca.estado === "Ativa" && !pedeAtencao(licenca)),
          pedemAtencao: atencao.length,
          expiradas: quantas((licenca) => licenca.estado === "Expirada" && !pedeAtencao(licenca)),
          revogadas: quantas((licenca) => licenca.estado === "Revogada"),
        },
        pedemAtencao: atencao,
        atividadeRecente: eventos.map((linha) => ({
          evento: paraEvento(linha),
          licenca: {
            prefixo: emGrupos(linha.prefixo),
            produto: { identificador: linha.produtoIdentificador, nome: linha.produtoNome },
            cliente: { id: linha.clienteId, nome: linha.clienteNome },
          },
        })),
        porProduto: produtosEmUso
          .map((produto) => ({ ...produto, licencas: porIdentificador.get(produto.identificador) ?? 0 }))
          .toSorted((a, b) => b.licencas - a.licencas || a.nome.localeCompare(b.nome, "pt-BR")),
      };
    },
  };
}
