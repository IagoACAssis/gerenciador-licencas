import Link from "next/link";
import { BotaoCopiar } from "../botao-copiar";

/**
 * Mostra a Chave de licença na única vez em que ela sai do núcleo (ADR-0003): na
 * emissão e na Troca de chave. Ela chega só na resposta da ação, nunca pela URL.
 */
export function ChaveExibida({ titulo, chave, prefixo }: { titulo: string; chave: string; prefixo: string }) {
  return (
    <section className="cartao">
      <h2>{titulo}</h2>
      <p className="aviso" role="alert">
        Copie a Chave de licença agora e entregue-a ao Cliente. <strong>Ela não poderá ser vista de novo</strong>,
        nem por você: a Instância guarda só uma impressão dela.
      </p>
      <pre>{chave}</pre>
      <BotaoCopiar texto={chave} rotulo="Copiar Chave de licença" />
      <p>
        <Link href={`/licencas/${prefixo}`}>Ver a Licença {prefixo}</Link>
      </p>
    </section>
  );
}
