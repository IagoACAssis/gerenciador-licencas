"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import type { EstadoDoDialogo } from "@/componentes/dialogo-de-confirmacao";
import { ClienteNaoEncontrado, ExclusaoNaoPermitida, LicencaNaoEncontrada, ProdutoNaoEncontrado } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { comAviso } from "../avisos";

/**
 * Roda a Exclusão ou a restauração e atualiza as listas. Devolve a recusa do núcleo
 * como mensagem, para o diálogo mostrar, ou undefined se deu certo. O item que não
 * está mais lá (ação repetida) conta como feito.
 */
async function executar(acao: () => Promise<void>): Promise<EstadoDoDialogo | undefined> {
  // Server Actions podem ser chamadas diretamente; o layout não as protege.
  if (!(await administradorAutenticado())) redirect("/entrar");
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof ExclusaoNaoPermitida) return { erro: erro.message };
    const naoEncontrado =
      erro instanceof ProdutoNaoEncontrado || erro instanceof ClienteNaoEncontrado || erro instanceof LicencaNaoEncontrada;
    if (!naoEncontrado) throw erro;
  }
  // Excluir ou restaurar um dono muda as listas de Produtos, Clientes, Licenças e excluídos.
  revalidatePath("/", "layout");
  return undefined;
}

/** Exclusão: a página do item deixa de existir, então vai para a lista, que mostra o aviso. */
async function excluir(acao: () => Promise<void>, destino: string): Promise<EstadoDoDialogo> {
  const recusa = await executar(acao);
  if (recusa) return recusa;
  redirect(destino);
}

/** Restauração: fica em Excluídos, que se atualiza sem o item, e o diálogo mostra o aviso. */
async function restaurar(acao: () => Promise<void>, aviso: string): Promise<EstadoDoDialogo> {
  return (await executar(acao)) ?? { aviso };
}

const texto = (formulario: FormData, campo: string) => String(formulario.get(campo) ?? "");

export async function excluirProduto(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return excluir(
    () => nucleoDaInstancia().excluirProduto(texto(formulario, "identificador")),
    comAviso("/produtos", "produto-excluido"),
  );
}

export async function excluirCliente(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return excluir(
    () => nucleoDaInstancia().excluirCliente(Number(texto(formulario, "id"))),
    comAviso("/clientes", "cliente-excluido"),
  );
}

export async function excluirLicenca(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return excluir(
    () => nucleoDaInstancia().excluirLicenca(texto(formulario, "prefixo")),
    comAviso("/licencas", "licenca-excluida"),
  );
}

export async function restaurarProduto(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return restaurar(() => nucleoDaInstancia().restaurarProduto(texto(formulario, "identificador")), "Produto restaurado.");
}

export async function restaurarCliente(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return restaurar(() => nucleoDaInstancia().restaurarCliente(Number(texto(formulario, "id"))), "Cliente restaurado.");
}

export async function restaurarLicenca(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
  return restaurar(() => nucleoDaInstancia().restaurarLicenca(texto(formulario, "prefixo")), "Licença restaurada.");
}
