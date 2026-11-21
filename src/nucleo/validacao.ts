import { sign } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { ativacoes, licencas, produtos, substituicoesAtivacao } from "../banco/esquema.ts";
import { emGrupos, hashDaChave } from "./chave-licenca.ts";
import { decifrarChavePrivada } from "./chaves.ts";
import {
  calcularSituacao,
  fimDaToleranciaOffline,
  limiteDeAtivacoes,
  type EstadoLicenca,
  type SituacaoLicenca,
} from "./estado.ts";
import type { Transacao } from "../banco/conexao.ts";
import type { DependenciasNucleo } from "./index.ts";
import { ProdutoNaoEncontrado } from "./produtos.ts";
import { substituicoesNoPeriodo } from "./substituicoes.ts";

/** O que o Produto envia na Validação. */
export interface PedidoValidacao {
  /** Identificador público do Produto. */
  produto: string;
  chave: string;
  /** Identificador opaco do Dispositivo. */
  dispositivo: string;
  nomeDispositivo?: string | null;
  /** Devolvido dentro da Resposta assinada, para o Produto saber que ela é nova. */
  nonce?: string | null;
}

export type MotivoRecusa =
  | "chave_invalida"
  | "licenca_expirada"
  | "licenca_suspensa"
  | "licenca_revogada"
  | "limite_de_ativacoes_atingido";

/**
 * Carga da Resposta assinada. Os campos da Licença (licenca, estado, aVencer,
 * emCarencia, dataDeValidade) ficam ausentes na recusa "chave_invalida".
 * Datas em ISO 8601 (UTC). Veja docs/validacao.md.
 */
export interface CargaValidacao {
  produto: string;
  /** Prefixo da Chave de licença, como "ABCD-EFGH". */
  licenca?: string;
  dispositivo: string;
  resultado: "aceita" | "recusada";
  motivo: MotivoRecusa | null;
  estado?: EstadoLicenca;
  aVencer?: boolean;
  emCarencia?: boolean;
  /** Data de validade da Licença; null quando ela é perpétua. */
  dataDeValidade?: string | null;
  emitidaEm: string;
  /** Até quando a resposta vale offline. Nas recusas, igual a emitidaEm. */
  validaAte: string;
  nonce: string | null;
}

/** A carga serializada uma única vez e a assinatura Ed25519 (base64url) dos bytes UTF-8 dela. */
export interface RespostaAssinada {
  carga: string;
  assinatura: string;
}

export type CampoValidacao = "produto" | "chave" | "dispositivo" | "nomeDispositivo" | "nonce";

/** Pedido de Validação malformado, com a mensagem de cada campo inválido. */
export class DadosDeValidacaoInvalidos extends Error {
  constructor(readonly erros: Partial<Record<CampoValidacao, string>>) {
    super(Object.values(erros).join(" "));
    this.name = "DadosDeValidacaoInvalidos";
  }
}

const MAXIMO_IDENTIFICADOR = 100;
const MAXIMO_TEXTO = 200;

/** Confere tamanhos e campos obrigatórios. O identificador do Dispositivo e o nonce são opacos: nada de trim. */
function lerPedido(pedido: PedidoValidacao) {
  const erros: Partial<Record<CampoValidacao, string>> = {};
  if (!pedido.produto || pedido.produto.length > MAXIMO_IDENTIFICADOR) {
    erros.produto = `Informe o identificador do Produto, com até ${MAXIMO_IDENTIFICADOR} caracteres.`;
  }
  // Chave longa demais não é pedido malformado: é só uma Chave sem correspondência.
  if (!pedido.chave) erros.chave = "Informe a Chave de licença.";
  if (!pedido.dispositivo || pedido.dispositivo.length > MAXIMO_TEXTO) {
    erros.dispositivo = `Informe o identificador do Dispositivo, com até ${MAXIMO_TEXTO} caracteres.`;
  }
  const nomeDispositivo = pedido.nomeDispositivo?.trim() || null;
  if (nomeDispositivo && nomeDispositivo.length > MAXIMO_TEXTO) {
    erros.nomeDispositivo = `O nome do Dispositivo pode ter até ${MAXIMO_TEXTO} caracteres.`;
  }
  const nonce = pedido.nonce ?? null;
  if (nonce !== null && (nonce.length < 1 || nonce.length > MAXIMO_TEXTO)) {
    erros.nonce = `O nonce, quando enviado, precisa ter de 1 a ${MAXIMO_TEXTO} caracteres.`;
  }
  if (Object.keys(erros).length > 0) throw new DadosDeValidacaoInvalidos(erros);
  return { produto: pedido.produto, chave: pedido.chave, dispositivo: pedido.dispositivo, nomeDispositivo, nonce };
}

/** Revogada, Suspensa e Expirada fora da Carência não podem ser usadas. */
function motivoPeloEstado(situacao: SituacaoLicenca): MotivoRecusa | null {
  if (situacao.estado === "Revogada") return "licenca_revogada";
  if (situacao.estado === "Suspensa") return "licenca_suspensa";
  if (situacao.estado === "Expirada" && !situacao.emCarencia) return "licenca_expirada";
  return null;
}

/**
 * Reaproveita a Ativação do Dispositivo ou cria uma, se houver vaga no Limite de
 * ativações. Sem vaga, faz a Substituição de ativação da Ativação com a última
 * Validação mais antiga, se ainda houver Cota de substituições. Chamada com a
 * Licença travada, para que Validações simultâneas não passem do limite nem da
 * Cota. Devolve o motivo da recusa, ou null se aceitou.
 */
async function ativar(
  tx: Transacao,
  licenca: typeof licencas.$inferSelect,
  produto: typeof produtos.$inferSelect,
  pedido: { dispositivo: string; nomeDispositivo: string | null },
  agora: Date,
): Promise<MotivoRecusa | null> {
  const daLicenca = eq(ativacoes.licencaId, licenca.id);
  const atualizadas = await tx
    .update(ativacoes)
    .set({
      ultimaValidacaoEm: agora,
      ...(pedido.nomeDispositivo ? { nomeDispositivo: pedido.nomeDispositivo } : {}),
    })
    .where(and(daLicenca, eq(ativacoes.dispositivo, pedido.dispositivo)))
    .returning({ id: ativacoes.id });
  if (atualizadas.length > 0) return null;

  const existentes = await tx
    .select({ id: ativacoes.id, dispositivo: ativacoes.dispositivo })
    .from(ativacoes)
    .where(daLicenca)
    .orderBy(asc(ativacoes.ultimaValidacaoEm), asc(ativacoes.id));
  // Com o limite reduzido abaixo do uso, não há vaga, mas a Substituição de ativação continua possível.
  if (existentes.length >= limiteDeAtivacoes(licenca, produto)) {
    const [substituida] = existentes;
    const cotaEsgotada =
      (await substituicoesNoPeriodo(tx, licenca, produto, agora)) >= produto.cotaSubstituicoesQuantidade;
    if (!substituida || cotaEsgotada) return "limite_de_ativacoes_atingido";
    await tx.delete(ativacoes).where(eq(ativacoes.id, substituida.id));
    await tx.insert(substituicoesAtivacao).values({
      licencaId: licenca.id,
      dispositivoRemovido: substituida.dispositivo,
      dispositivoNovo: pedido.dispositivo,
      feitaEm: agora,
    });
  }

  await tx.insert(ativacoes).values({
    licencaId: licenca.id,
    dispositivo: pedido.dispositivo,
    nomeDispositivo: pedido.nomeDispositivo,
    ativadaEm: agora,
    ultimaValidacaoEm: agora,
  });
  return null;
}

export function casosDeUsoDeValidacao({ banco, relogio, segredoChaves }: DependenciasNucleo) {
  return {
    /**
     * Validação (ADR-0002): confere a Chave de licença no Produto informado, cria
     * ou reaproveita a Ativação do Dispositivo e devolve sempre uma Resposta
     * assinada, aceita ou recusada. Lança ProdutoNaoEncontrado para um
     * identificador de Produto inexistente (não há chave com que assinar) e
     * DadosDeValidacaoInvalidos para um pedido malformado.
     */
    async validar(dados: PedidoValidacao): Promise<RespostaAssinada> {
      const pedido = lerPedido(dados);
      const agora = relogio.agora();
      const [produto] = await banco.select().from(produtos).where(eq(produtos.identificador, pedido.produto));
      if (!produto) throw new ProdutoNaoEncontrado();

      const carga = await banco.transaction(async (tx) => {
        const [licenca] =
          pedido.chave.length > MAXIMO_IDENTIFICADOR
            ? []
            : await tx
                .select()
                .from(licencas)
                .where(and(eq(licencas.produtoId, produto.id), eq(licencas.hashChave, hashDaChave(pedido.chave))))
                .for("update");
        // Mesma recusa para Chave inexistente, de outro Produto ou antiga: nada identifica a Licença.
        if (!licenca) {
          return {
            produto: produto.identificador,
            dispositivo: pedido.dispositivo,
            resultado: "recusada",
            motivo: "chave_invalida",
            emitidaEm: agora.toISOString(),
            validaAte: agora.toISOString(),
            nonce: pedido.nonce,
          } satisfies CargaValidacao;
        }

        const situacao = calcularSituacao(licenca, produto, agora);
        const recusa =
          motivoPeloEstado(situacao) ??
          (await ativar(tx, licenca, produto, pedido, agora));

        const carga: CargaValidacao = {
          produto: produto.identificador,
          licenca: emGrupos(licenca.prefixoChave),
          dispositivo: pedido.dispositivo,
          resultado: recusa ? "recusada" : "aceita",
          motivo: recusa,
          estado: situacao.estado,
          aVencer: situacao.aVencer,
          emCarencia: situacao.emCarencia,
          dataDeValidade: licenca.validaAte?.toISOString() ?? null,
          emitidaEm: agora.toISOString(),
          // Recusas não têm Tolerância offline.
          validaAte: (recusa ? agora : fimDaToleranciaOffline(licenca, produto, agora)).toISOString(),
          nonce: pedido.nonce,
        };
        return carga;
      });

      const texto = JSON.stringify(carga);
      const privada = decifrarChavePrivada(produto.chavePrivadaCifrada, segredoChaves);
      return { carga: texto, assinatura: sign(null, Buffer.from(texto, "utf8"), privada).toString("base64url") };
    },
  };
}
