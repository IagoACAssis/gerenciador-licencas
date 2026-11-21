import type { Limitador } from "./limitador.ts";

/**
 * IP de origem da requisição. Veja no README por que a Instância precisa ficar
 * atrás de um proxy reverso.
 *
 * Usa a última entrada do `x-forwarded-for`, que é a que o proxy reverso mais
 * próximo acrescentou com o IP de quem se conectou a ele. As entradas
 * anteriores vêm do próprio cliente e podem ser inventadas. Sem proxy, o Next
 * preenche esse cabeçalho com o IP da conexão quando ele não vem na requisição.
 * Por isso o `x-forwarded-for` sempre existe atrás do Next, e o `x-real-ip` só
 * seria usado fora dele (por exemplo, num teste com um `Request` montado à mão).
 */
export function ipDeOrigem(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return encaminhado || cabecalhos.get("x-real-ip")?.trim() || "desconhecido";
}

/**
 * Conta a requisição no limitador pelo IP de origem. Devolve `null` se ela pode
 * seguir, ou a resposta 429 pronta, com o tempo de espera no cabeçalho
 * `Retry-After` e no corpo.
 */
export function barrarExcesso(limitador: Limitador, requisicao: Request): Response | null {
  const registro = limitador.registrar(ipDeOrigem(requisicao.headers));
  if (registro.permitido) return null;
  const { esperaSegundos } = registro;
  return Response.json(
    { erro: `Muitas requisições. Tente de novo em ${esperaSegundos} segundos.`, esperaSegundos },
    { status: 429, headers: { "Retry-After": String(esperaSegundos) } },
  );
}
