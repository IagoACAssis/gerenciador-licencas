// As datas de validade valem até o fim do dia em UTC, e o painel as mostra em UTC
// para que o dia exibido seja sempre o dia escolhido na emissão.

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(data: Date): string {
  return `${data.toLocaleString("pt-BR", { timeZone: "UTC" })} UTC`;
}

/** "AAAA-MM-DD" do campo de data vira o último instante desse dia em UTC. */
export function fimDoDia(texto: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T23:59:59.999Z`) : new Date(Number.NaN);
}

/** Primeiro valor de um parâmetro da URL, que pode vir repetido. */
export function parametro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}
