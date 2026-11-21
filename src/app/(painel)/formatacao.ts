import type { Licenca } from "@/nucleo";
import { UM_DIA_MS } from "@/nucleo/estado";

// As datas de validade valem até o fim do dia em UTC, e o painel as mostra em UTC
// para que o dia exibido seja sempre o dia escolhido na emissão.

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** A data de validade, ou "Perpétua" para a Licença sem data de validade. */
export function formatarValidade(validaAte: Date | null): string {
  return validaAte ? formatarData(validaAte) : "Perpétua";
}

export function formatarDataHora(data: Date): string {
  return `${data.toLocaleString("pt-BR", { timeZone: "UTC" })} UTC`;
}

/** "AAAA-MM-DD" do campo de data vira o último instante desse dia em UTC. */
export function fimDoDia(texto: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T23:59:59.999Z`) : new Date(Number.NaN);
}

/** Quantidade com o nome no singular ou no plural: "1 dia", "15 dias", "0 Licenças". */
export function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** Primeiro valor de um parâmetro da URL, que pode vir repetido. */
export function parametro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Quantos dias de calendário, em UTC como as datas do painel, vão de `de` até `ate` (negativo se `ate` já passou). */
function diasDeCalendario(de: Date, ate: Date): number {
  return Math.floor(ate.getTime() / UM_DIA_MS) - Math.floor(de.getTime() / UM_DIA_MS);
}

/** O prazo da data de validade em linguagem direta: "vence em 4 dias", "vence hoje", "venceu há 3 dias". */
export function descreverPrazo(validaAte: Date, agora: Date): string {
  const dias = diasDeCalendario(agora, validaAte);
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === 1) return "vence amanhã";
  // A data de validade vale até o fim do dia (fimDoDia): no próprio dia, ainda não venceu.
  if (dias === 0) return "vence hoje";
  if (dias === -1) return "venceu ontem";
  return `venceu há ${-dias} dias`;
}

/**
 * O prazo da Licença: "vence em 4 dias", "venceu há 3 dias", "sem data de validade" (a
 * perpétua), ou "suspensa", em que a data de validade não é o que importa agora. Com
 * `prazoDaSuspensa`, a Suspensa mostra o prazo da data como as outras: serve onde a
 * suspensão já está à vista, como no resumo (Pede atenção) e no detalhe da Licença.
 */
export function descreverPrazoDaLicenca(
  licenca: Pick<Licenca, "estado" | "validaAte">,
  agora: Date,
  { prazoDaSuspensa = false }: { prazoDaSuspensa?: boolean } = {},
): string {
  if (licenca.estado === "Suspensa" && !prazoDaSuspensa) return "suspensa";
  return licenca.validaAte ? descreverPrazo(licenca.validaAte, agora) : "sem data de validade";
}

/** Há quanto tempo, em linguagem direta: "hoje", "ontem", "há 5 dias", "há 2 meses", "há 1 ano". */
export function haQuantoTempo(data: Date, agora: Date): string {
  const dias = diasDeCalendario(data, agora);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  }
  const anos = Math.floor(dias / 365);
  return anos === 1 ? "há 1 ano" : `há ${anos} anos`;
}
