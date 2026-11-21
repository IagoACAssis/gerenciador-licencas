"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import {
  AcaoNaoPermitida,
  AtivacaoNaoEncontrada,
  DadosDeLicencaInvalidos,
  LicencaNaoEncontrada,
  type CampoLicenca,
} from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { fimDoDia } from "../formatacao";

export interface EstadoEmissao {
  valores: Record<CampoLicenca, string>;
  erros?: Partial<Record<CampoLicenca, string>>;
  /** Só existe na resposta da emissão: a Chave não vai para a URL nem fica guardada. */
  emitida?: { chave: string; prefixo: string };
}

export async function emitirLicenca(_estado: EstadoEmissao, formulario: FormData): Promise<EstadoEmissao> {
  // Server Actions podem ser chamadas diretamente; o layout não as protege.
  if (!(await administradorAutenticado())) redirect("/entrar");

  const valores = {
    produto: String(formulario.get("produto") ?? ""),
    cliente: String(formulario.get("cliente") ?? ""),
    validaAte: String(formulario.get("validaAte") ?? "").trim(),
    limiteAtivacoes: String(formulario.get("limiteAtivacoes") ?? "").trim(),
  };
  try {
    const { licenca, chave } = await nucleoDaInstancia().emitirLicenca({
      produto: valores.produto,
      cliente: valores.cliente ? Number(valores.cliente) : Number.NaN,
      validaAte: valores.validaAte ? fimDoDia(valores.validaAte) : null,
      limiteAtivacoes: valores.limiteAtivacoes ? Number(valores.limiteAtivacoes) : null,
    });
    revalidatePath("/licencas");
    revalidatePath("/produtos");
    return { valores, emitida: { chave, prefixo: licenca.prefixo } };
  } catch (erro) {
    if (erro instanceof DadosDeLicencaInvalidos) return { valores, erros: erro.erros };
    throw erro;
  }
}

/** Resultado de uma ação no detalhe da Licença: só volta com a recusa; o sucesso recarrega o detalhe. */
export interface EstadoAcaoNaLicenca {
  erro?: string;
}

/**
 * Roda a ação e volta ao detalhe da Licença; Licença inexistente volta à lista.
 * Os erros que o detalhe sabe mostrar (os de `recusas`) voltam como mensagem.
 */
async function executarNaLicenca(
  prefixo: string,
  acao: () => Promise<void>,
  recusas: (erro: unknown) => erro is Error,
): Promise<EstadoAcaoNaLicenca> {
  // Server Actions podem ser chamadas diretamente; o layout não as protege.
  if (!(await administradorAutenticado())) redirect("/entrar");
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof LicencaNaoEncontrada) redirect("/licencas");
    if (recusas(erro)) return { erro: erro.message };
    throw erro;
  }
  const caminho = `/licencas/${encodeURIComponent(prefixo)}`;
  revalidatePath(caminho);
  revalidatePath("/licencas");
  redirect(caminho);
}

/** Ação repetida (Ativação já removida) só recarrega o detalhe. */
async function responderAcaoNaLicenca(prefixo: string, acao: () => Promise<void>): Promise<void> {
  await executarNaLicenca(prefixo, acao, (erro) => erro instanceof AtivacaoNaoEncontrada);
}

/** Ações de ciclo de vida: devolvem a recusa do núcleo para o formulário mostrar. */
function acaoDeCicloDeVida(formulario: FormData, acao: (prefixo: string) => Promise<void>): Promise<EstadoAcaoNaLicenca> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  return executarNaLicenca(
    prefixo,
    () => acao(prefixo),
    (erro) => erro instanceof DadosDeLicencaInvalidos || erro instanceof AcaoNaoPermitida,
  );
}

export async function removerAtivacao(formulario: FormData): Promise<void> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  const dispositivo = String(formulario.get("dispositivo") ?? "");
  await responderAcaoNaLicenca(prefixo, () => nucleoDaInstancia().removerAtivacao(prefixo, dispositivo));
}

export async function zerarContagemDeSubstituicoes(formulario: FormData): Promise<void> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  await responderAcaoNaLicenca(prefixo, () => nucleoDaInstancia().zerarContagemDeSubstituicoes(prefixo));
}

export async function renovarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  const validaAte = fimDoDia(String(formulario.get("validaAte") ?? "").trim());
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().renovarLicenca(prefixo, validaAte));
}

export async function alterarLimiteDeAtivacoes(
  _estado: EstadoAcaoNaLicenca,
  formulario: FormData,
): Promise<EstadoAcaoNaLicenca> {
  const texto = String(formulario.get("limiteAtivacoes") ?? "").trim();
  const limite = texto ? Number(texto) : null;
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().alterarLimiteDeAtivacoes(prefixo, limite));
}

export async function suspenderLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().suspenderLicenca(prefixo));
}

export async function reativarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().reativarLicenca(prefixo));
}

/** A Revogação é definitiva: só segue com a confirmação marcada no formulário. */
export async function revogarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  if (formulario.get("confirmacao") !== "sim") return { erro: "Confirme que a Revogação é definitiva." };
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().revogarLicenca(prefixo));
}
