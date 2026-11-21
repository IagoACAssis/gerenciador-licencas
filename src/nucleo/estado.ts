// Estado da Licença: sempre calculado, nunca gravado. Depende da data de
// validade, da suspensão e da Revogação, das regras atuais do Produto e do
// momento atual.

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
    return { estado: "Expirada", aVencer: false, emCarencia: momento < validade + regras.carenciaDias * UM_DIA_MS };
  }
  return { estado: "Ativa", aVencer: momento >= validade - regras.janelaAvisoDias * UM_DIA_MS, emCarencia: false };
}
