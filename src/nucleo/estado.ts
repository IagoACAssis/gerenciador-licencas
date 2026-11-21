// Regras de cálculo da Licença: estado e indicações, fim da Carência, fim da
// Tolerância offline, Limite de ativações que vale e janela da Cota de
// substituições. Tudo calculado, nunca gravado, a partir dos dados da Licença,
// das regras atuais do Produto e do momento atual. Os casos de uso chamam estas
// funções em vez de refazer a conta.

export const ESTADOS_LICENCA = ["Ativa", "Expirada", "Suspensa", "Revogada"] as const;
export type EstadoLicenca = (typeof ESTADOS_LICENCA)[number];

export interface SituacaoLicenca {
  estado: EstadoLicenca;
  /** Ativa dentro da Janela de aviso. */
  aVencer: boolean;
  /** Expirada dentro da Carência: ainda pode ser usada. */
  emCarencia: boolean;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Prioridade: Revogada > Suspensa > Expirada > Ativa. Licença perpétua (sem
 * data de validade) nunca é Expirada nem a vencer.
 */
export function calcularSituacao(
  licenca: { validaAte: Date | null; suspensaEm?: Date | null; revogadaEm?: Date | null },
  regras: { janelaAvisoDias: number; carenciaDias: number },
  agora: Date,
): SituacaoLicenca {
  if (licenca.revogadaEm) return { estado: "Revogada", aVencer: false, emCarencia: false };
  if (licenca.suspensaEm) return { estado: "Suspensa", aVencer: false, emCarencia: false };
  if (!licenca.validaAte) return { estado: "Ativa", aVencer: false, emCarencia: false };

  const momento = agora.getTime();
  const validade = licenca.validaAte.getTime();
  if (momento >= validade) {
    return { estado: "Expirada", aVencer: false, emCarencia: momento < fimDaCarencia(licenca.validaAte, regras).getTime() };
  }
  return { estado: "Ativa", aVencer: momento >= validade - regras.janelaAvisoDias * UM_DIA_MS, emCarencia: false };
}

/** Último instante em que a Licença ainda é aceita: data de validade + Carência. */
export function fimDaCarencia(validaAte: Date, regras: { carenciaDias: number }): Date {
  return new Date(validaAte.getTime() + regras.carenciaDias * UM_DIA_MS);
}

/** Até quando uma Resposta assinada aceita vale offline: o menor entre a Tolerância offline e o fim da Carência. */
export function fimDaToleranciaOffline(
  licenca: { validaAte: Date | null },
  regras: { toleranciaOfflineDias: number; carenciaDias: number },
  agora: Date,
): Date {
  const tolerancia = agora.getTime() + regras.toleranciaOfflineDias * UM_DIA_MS;
  if (!licenca.validaAte) return new Date(tolerancia);
  return new Date(Math.min(tolerancia, fimDaCarencia(licenca.validaAte, regras).getTime()));
}

/** Limite de ativações que vale agora: o próprio da Licença ou o padrão atual do Produto. */
export function limiteDeAtivacoes(
  licenca: { limiteAtivacoes: number | null },
  regras: { limiteAtivacoesPadrao: number },
): number {
  return licenca.limiteAtivacoes ?? regras.limiteAtivacoesPadrao;
}

/**
 * Início da janela móvel da Cota de substituições: contam as Substituições de
 * ativação feitas depois deste instante, ou seja, nos últimos N dias do Produto
 * e depois do último "zerar contagem" do Administrador.
 */
export function inicioDaJanelaDeSubstituicoes(
  licenca: { contagemSubstituicoesZeradaEm: Date | null },
  regras: { cotaSubstituicoesDias: number },
  agora: Date,
): Date {
  const janela = agora.getTime() - regras.cotaSubstituicoesDias * UM_DIA_MS;
  const zerada = licenca.contagemSubstituicoesZeradaEm?.getTime() ?? Number.NEGATIVE_INFINITY;
  return new Date(Math.max(janela, zerada));
}
