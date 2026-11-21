import type { EventoLicenca } from "@/nucleo";
import { formatarData } from "../formatacao";

function descreverLimite(limite: number | null): string {
  return limite === null ? "padrão do Produto" : String(limite);
}

/** O tipo do evento do histórico, como o painel o nomeia ("Renovação", "Troca de chave"). */
export function nomeDoEvento(evento: EventoLicenca): string {
  switch (evento.tipo) {
    case "emissao": return "Emissão";
    case "renovacao": return "Renovação";
    case "limite_alterado": return "Limite de ativações alterado";
    case "suspensao": return "Suspensão";
    case "reativacao": return "Reativação";
    case "revogacao": return "Revogação";
    case "exclusao": return "Exclusão";
    case "restauracao": return "Restauração";
    case "troca_de_chave": return "Troca de chave";
    case "ativacao_removida": return "Ativação removida pelo Administrador";
    case "contagem_substituicoes_zerada": return "Contagem de Substituições de ativação zerada";
  }
}

/** O que mudou no evento, quando há o que dizer: "de 01/05/2026 para 01/05/2027". */
export function detalheDoEvento(evento: EventoLicenca): string | null {
  switch (evento.tipo) {
    case "emissao": {
      const validade = evento.validaAte ? `válida até ${formatarData(evento.validaAte)}` : "perpétua";
      return `${validade}, Limite de ativações ${descreverLimite(evento.limiteAtivacoes)}`;
    }
    case "renovacao":
      return `de ${formatarData(evento.validaAteAnterior)} para ${formatarData(evento.validaAte)}`;
    case "limite_alterado":
      return `de ${descreverLimite(evento.limiteAnterior)} para ${descreverLimite(evento.limiteAtivacoes)}`;
    case "troca_de_chave":
      return `a Chave que começava com ${evento.prefixoAnterior} deixou de valer`;
    case "ativacao_removida":
      return evento.nomeDispositivo ? `${evento.dispositivo} (${evento.nomeDispositivo})` : evento.dispositivo;
    case "suspensao":
    case "reativacao":
    case "revogacao":
    case "exclusao":
    case "restauracao":
    case "contagem_substituicoes_zerada":
      return null;
  }
}
