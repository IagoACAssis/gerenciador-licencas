import "server-only";
import { lerConfiguracao } from "../configuracao.ts";
import { barrarExcesso } from "./http.ts";
import { criarLimitador, type Limitador } from "./limitador.ts";

// Um limitador por uso, cada um com os próprios valores da configuração e o
// relógio real. Como a contagem fica em memória, vale para o processo inteiro.
let validacao: Limitador | undefined;
let entrada: Limitador | undefined;

const relogio = { agora: () => new Date() };

/** Limitador das tentativas de entrada do Administrador. */
export function limiteDaEntrada(): Limitador {
  entrada ??= criarLimitador(lerConfiguracao().limiteEntrada, relogio);
  return entrada;
}

/**
 * Barra o excesso de requisições na API de Validação. Chame no começo da rota,
 * antes de qualquer consulta ao núcleo, e devolva a resposta 429 se houver:
 *
 * ```ts
 * export async function POST(requisicao: Request) {
 *   const excesso = barrarExcessoNaValidacao(requisicao);
 *   if (excesso) return excesso;
 *   // ... Validação ...
 * }
 * ```
 */
export function barrarExcessoNaValidacao(requisicao: Request): Response | null {
  validacao ??= criarLimitador(lerConfiguracao().limiteValidacao, relogio);
  return barrarExcesso(validacao, requisicao);
}
