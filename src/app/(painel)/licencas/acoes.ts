"use server";
import { refresh, revalidatePath } from "next/cache";
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
import { fimDoDia, formatarData } from "../formatacao";

export interface EstadoEmissao {
  valores: Record<CampoLicenca, string>;
  erros?: Partial<Record<CampoLicenca, string>>;
  /** Só existe na resposta da emissão: a Chave não vai para a URL nem fica guardada. */
  emitida?: { chave: string; prefixo: string };
}

/** Campo do Limite de ativações: vazio = segue o padrão do Produto. */
function lerLimite(texto: string): number | null {
  return texto ? Number(texto) : null;
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
      limiteAtivacoes: lerLimite(valores.limiteAtivacoes),
    });
    revalidatePath("/licencas");
    revalidatePath("/produtos");
    return { valores, emitida: { chave, prefixo: licenca.prefixo } };
  } catch (erro) {
    if (erro instanceof DadosDeLicencaInvalidos) return { valores, erros: erro.erros };
    throw erro;
  }
}

/** Resultado de uma ação no detalhe da Licença: a recusa, ou o resultado para o aviso temporário. */
export interface EstadoAcaoNaLicenca {
  erro?: string;
  /** Só no sucesso: o que mudou, como o painel avisa ("Licença renovada até 01/05/2027."). */
  aviso?: string;
}

/**
 * Roda a ação do Administrador sobre a Licença; Licença inexistente volta à lista.
 * Devolve a recusa que o detalhe sabe mostrar (as de `recusas`), ou undefined se deu certo.
 */
async function recusaNaLicenca(
  acao: () => Promise<void>,
  recusas: (erro: unknown) => erro is Error,
): Promise<EstadoAcaoNaLicenca | undefined> {
  // Server Actions podem ser chamadas diretamente; o layout não as protege.
  if (!(await administradorAutenticado())) redirect("/entrar");
  try {
    await acao();
    return undefined;
  } catch (erro) {
    if (erro instanceof LicencaNaoEncontrada) redirect("/licencas");
    if (recusas(erro)) return { erro: erro.message };
    throw erro;
  }
}

/**
 * Roda a ação e atualiza o detalhe da Licença na mesma página, ou devolve a recusa
 * como mensagem. No sucesso, devolve `aviso` para o aviso temporário.
 */
async function executarNaLicenca(
  prefixo: string,
  acao: () => Promise<void>,
  recusas: (erro: unknown) => erro is Error,
  aviso: string,
): Promise<EstadoAcaoNaLicenca> {
  const recusa = await recusaNaLicenca(acao, recusas);
  if (recusa) return recusa;
  revalidatePath(`/licencas/${encodeURIComponent(prefixo)}`);
  revalidatePath("/licencas");
  // O endereço aberto pode trazer o prefixo noutra grafia (minúsculas, sem hífen); o
  // refresh atualiza a página que está na tela, seja qual for.
  refresh();
  return { aviso };
}

const nenhumaRecusa = (_erro: unknown): _erro is Error => false;

/** Ações de ciclo de vida: devolvem a recusa do núcleo para o diálogo mostrar. */
function acaoDeCicloDeVida(
  formulario: FormData,
  acao: (prefixo: string) => Promise<void>,
  aviso: string,
): Promise<EstadoAcaoNaLicenca> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  return executarNaLicenca(
    prefixo,
    () => acao(prefixo),
    (erro) => erro instanceof DadosDeLicencaInvalidos || erro instanceof AcaoNaoPermitida,
    aviso,
  );
}

export async function removerAtivacao(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  const dispositivo = String(formulario.get("dispositivo") ?? "");
  const remover = async () => {
    try {
      await nucleoDaInstancia().removerAtivacao(prefixo, dispositivo);
    } catch (erro) {
      // Ação repetida (a Ativação já saiu): só atualiza o detalhe.
      if (!(erro instanceof AtivacaoNaoEncontrada)) throw erro;
    }
  };
  return executarNaLicenca(prefixo, remover, nenhumaRecusa, "Ativação removida.");
}

export async function zerarContagemDeSubstituicoes(
  _estado: EstadoAcaoNaLicenca,
  formulario: FormData,
): Promise<EstadoAcaoNaLicenca> {
  const prefixo = String(formulario.get("prefixo") ?? "");
  return executarNaLicenca(
    prefixo,
    () => nucleoDaInstancia().zerarContagemDeSubstituicoes(prefixo),
    nenhumaRecusa,
    "Contagem de Substituições de ativação zerada.",
  );
}

export async function renovarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  const validaAte = fimDoDia(String(formulario.get("validaAte") ?? "").trim());
  return acaoDeCicloDeVida(
    formulario,
    (prefixo) => nucleoDaInstancia().renovarLicenca(prefixo, validaAte),
    // Só aparece no sucesso, quando a data já foi aceita pelo núcleo.
    `Licença renovada até ${formatarData(validaAte)}.`,
  );
}

export async function alterarLimiteDeAtivacoes(
  _estado: EstadoAcaoNaLicenca,
  formulario: FormData,
): Promise<EstadoAcaoNaLicenca> {
  const limite = lerLimite(String(formulario.get("limiteAtivacoes") ?? "").trim());
  return acaoDeCicloDeVida(
    formulario,
    (prefixo) => nucleoDaInstancia().alterarLimiteDeAtivacoes(prefixo, limite),
    limite === null ? "Limite de ativações volta a seguir o padrão do Produto." : `Limite de ativações alterado para ${limite}.`,
  );
}

export async function suspenderLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().suspenderLicenca(prefixo), "Licença suspensa.");
}

export async function reativarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().reativarLicenca(prefixo), "Licença reativada.");
}

/** A Revogação é definitiva: só segue com a confirmação enviada pelo formulário. */
export async function revogarLicenca(_estado: EstadoAcaoNaLicenca, formulario: FormData): Promise<EstadoAcaoNaLicenca> {
  if (formulario.get("confirmacao") !== "sim") return { erro: "Confirme que a Revogação é definitiva." };
  return acaoDeCicloDeVida(formulario, (prefixo) => nucleoDaInstancia().revogarLicenca(prefixo), "Licença revogada.");
}

/** Resultado da Troca de chave: a recusa, ou a Chave nova, que só existe nesta resposta. */
export interface EstadoTrocaDeChave extends EstadoAcaoNaLicenca {
  /** A Chave não vai para a URL nem fica guardada. */
  trocada?: { chave: string; prefixo: string };
}

/**
 * Troca de chave: só segue com a confirmação enviada. Ao contrário das outras ações,
 * não revalida nem redireciona: o prefixo antigo deixou de existir, e recarregar o
 * detalhe dele mostraria "não encontrada" no lugar da Chave nova. As páginas do
 * painel são dinâmicas e já saem atualizadas na próxima visita.
 */
export async function trocarChave(_estado: EstadoTrocaDeChave, formulario: FormData): Promise<EstadoTrocaDeChave> {
  if (formulario.get("confirmacao") !== "sim") return { erro: "Confirme que a Chave atual deixará de valer." };
  const prefixo = String(formulario.get("prefixo") ?? "");
  let trocada: EstadoTrocaDeChave["trocada"];
  const recusa = await recusaNaLicenca(
    async () => {
      const { licenca, chave } = await nucleoDaInstancia().trocarChave(prefixo);
      trocada = { chave, prefixo: licenca.prefixo };
    },
    (erro) => erro instanceof AcaoNaoPermitida,
  );
  return recusa ?? { trocada };
}
