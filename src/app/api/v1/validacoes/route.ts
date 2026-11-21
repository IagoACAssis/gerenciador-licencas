import { DadosDeValidacaoInvalidos, ProdutoNaoEncontrado, type PedidoValidacao } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { barrarExcessoNaValidacao } from "@/limite/producao";

export const dynamic = "force-dynamic";

// API pública de Validação (formato em docs/validacao.md). Sem credencial de
// Produto (ADR-0002): quem autentica é a Chave de licença.

const OBRIGATORIOS = ["produto", "chave", "dispositivo"] as const;
const OPCIONAIS = ["nomeDispositivo", "nonce"] as const;

/** Só confere a forma do JSON; tamanhos e conteúdo são regras do núcleo. */
function lerCorpo(corpo: unknown): PedidoValidacao | null {
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) return null;
  const campos = corpo as Record<string, unknown>;
  if (OBRIGATORIOS.some((campo) => typeof campos[campo] !== "string")) return null;
  if (OPCIONAIS.some((campo) => campos[campo] != null && typeof campos[campo] !== "string")) return null;
  return {
    produto: campos.produto as string,
    chave: campos.chave as string,
    dispositivo: campos.dispositivo as string,
    nomeDispositivo: (campos.nomeDispositivo as string | null | undefined) ?? null,
    nonce: (campos.nonce as string | null | undefined) ?? null,
  };
}

const malformado = (erro: string, erros?: Record<string, string>) =>
  Response.json({ erro, ...(erros ? { erros } : {}) }, { status: 400 });

export async function POST(requisicao: Request) {
  const excesso = barrarExcessoNaValidacao(requisicao);
  if (excesso) return excesso;

  const corpo: unknown = await requisicao.json().catch(() => undefined);
  const pedido = lerCorpo(corpo);
  if (!pedido) {
    return malformado(
      "Envie um objeto JSON com produto, chave e dispositivo em texto, e nomeDispositivo e nonce em texto se quiser.",
    );
  }

  try {
    return Response.json(await nucleoDaInstancia().validar(pedido));
  } catch (erro) {
    if (erro instanceof DadosDeValidacaoInvalidos) return malformado("Pedido de Validação inválido.", erro.erros);
    if (erro instanceof ProdutoNaoEncontrado) return Response.json({ erro: "Produto não encontrado." }, { status: 404 });
    throw erro;
  }
}
