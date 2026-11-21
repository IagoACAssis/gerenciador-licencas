import type { EventoLicenca } from "@/nucleo";
import { formatarData } from "../formatacao";

function descreverLimite(limite: number | null): string {
  return limite === null ? "padrão do Produto" : String(limite);
}

/**
 * Um evento do histórico como o painel o mostra: o tipo ("Renovação") e, quando há o
 * que dizer, o que mudou ("de 01/05/2026 para 01/05/2027").
 */
export function descreverEvento(evento: EventoLicenca): { nome: string; detalhe: string | null } {
  switch (evento.tipo) {
    case "emissao": {
      const validade = evento.validaAte ? `válida até ${formatarData(evento.validaAte)}` : "perpétua";
      return { nome: "Emissão", detalhe: `${validade}, Limite de ativações ${descreverLimite(evento.limiteAtivacoes)}` };
    }
    case "renovacao":
      return {
        nome: "Renovação",
        detalhe: `de ${formatarData(evento.validaAteAnterior)} para ${formatarData(evento.validaAte)}`,
      };
    case "limite_alterado":
      return {
        nome: "Limite de ativações alterado",
        detalhe: `de ${descreverLimite(evento.limiteAnterior)} para ${descreverLimite(evento.limiteAtivacoes)}`,
      };
    case "troca_de_chave":
      return { nome: "Troca de chave", detalhe: `a Chave que começava com ${evento.prefixoAnterior} deixou de valer` };
    case "ativacao_removida":
      return {
        nome: "Ativação removida pelo Administrador",
        detalhe: evento.nomeDispositivo ? `${evento.dispositivo} (${evento.nomeDispositivo})` : evento.dispositivo,
      };
    case "suspensao": return { nome: "Suspensão", detalhe: null };
    case "reativacao": return { nome: "Reativação", detalhe: null };
    case "revogacao": return { nome: "Revogação", detalhe: null };
    case "exclusao": return { nome: "Exclusão", detalhe: null };
    case "restauracao": return { nome: "Restauração", detalhe: null };
    case "contagem_substituicoes_zerada": return { nome: "Contagem de Substituições de ativação zerada", detalhe: null };
  }
}
