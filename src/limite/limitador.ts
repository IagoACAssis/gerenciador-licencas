import type { Relogio } from "../nucleo/index.ts";

export interface ConfiguracaoLimite {
  /** Quantas requisições cada IP pode fazer dentro de uma janela. */
  maximo: number;
  janelaSegundos: number;
}

export type ResultadoDoLimite = { permitido: true } | { permitido: false; esperaSegundos: number };

/**
 * Limite de requisições em janela fixa, com a contagem em memória: a Instância
 * roda como um único processo, e um reinício apenas zera as contagens.
 */
export function criarLimitador({ maximo, janelaSegundos }: ConfiguracaoLimite, relogio: Relogio) {
  const janelaMs = janelaSegundos * 1000;
  // Cada IP tem a própria janela, que começa na primeira requisição dele.
  const contagens = new Map<string, { quantidade: number; terminaEm: number }>();
  let proximaLimpeza = 0;

  /** Descarta as janelas já terminadas, no máximo uma vez por janela, para a memória não crescer sem fim. */
  function limparTerminadas(agora: number) {
    if (agora < proximaLimpeza) return;
    for (const [ip, contagem] of contagens) {
      if (contagem.terminaEm <= agora) contagens.delete(ip);
    }
    proximaLimpeza = agora + janelaMs;
  }

  return {
    /** Conta mais uma requisição do IP de origem e diz se ela pode seguir. */
    registrar(ip: string): ResultadoDoLimite {
      const agora = relogio.agora().getTime();
      limparTerminadas(agora);
      let contagem = contagens.get(ip);
      if (!contagem || contagem.terminaEm <= agora) {
        contagem = { quantidade: 0, terminaEm: agora + janelaMs };
        contagens.set(ip, contagem);
      }
      contagem.quantidade++;
      if (contagem.quantidade <= maximo) return { permitido: true };
      return { permitido: false, esperaSegundos: Math.ceil((contagem.terminaEm - agora) / 1000) };
    },
  };
}

export type Limitador = ReturnType<typeof criarLimitador>;
