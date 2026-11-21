"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { AtivacaoNaoEncontrada, DadosDeLicencaInvalidos, LicencaNaoEncontrada, type CampoLicenca } from "@/nucleo";
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

/** Volta ao detalhe da Licença. Ação repetida (Ativação já removida) só recarrega; Licença inexistente volta à lista. */
async function agirNaLicenca(prefixo: string, acao: () => Promise<void>): Promise<never> {
  if (!(await administradorAutenticado())) redirect("/entrar");
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof LicencaNaoEncontrada) redirect("/licencas");
    if (!(erro instanceof AtivacaoNaoEncontrada)) throw erro;
  }
  const caminho = `/licencas/${encodeURIComponent(prefixo)}`;
  revalidatePath(caminho);
  redirect(caminho);
}

export async function removerAtivacao(formulario: FormData): Promise<void> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  const dispositivo = String(formulario.get("dispositivo") ?? "");
  await agirNaLicenca(prefixo, () => nucleoDaInstancia().removerAtivacao(prefixo, dispositivo));
}

export async function zerarContagemDeSubstituicoes(formulario: FormData): Promise<void> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  await agirNaLicenca(prefixo, () => nucleoDaInstancia().zerarContagemDeSubstituicoes(prefixo));
}
