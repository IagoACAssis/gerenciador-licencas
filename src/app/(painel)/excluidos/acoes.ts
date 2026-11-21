"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { ClienteNaoEncontrado, ExclusaoNaoPermitida, LicencaNaoEncontrada, ProdutoNaoEncontrado } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { comAviso } from "../avisos";
import type { EstadoRecusavel } from "../formulario-recusavel";

/**
 * Roda a Exclusão ou a restauração e vai para `destino`. A recusa do núcleo volta
 * como mensagem; o item que não está mais lá (ação repetida) só leva ao destino.
 */
async function executar(acao: () => Promise<void>, destino: string): Promise<EstadoRecusavel> {
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
  redirect(destino);
}

const texto = (formulario: FormData, campo: string) => String(formulario.get(campo) ?? "");

export async function excluirProduto(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(
    () => nucleoDaInstancia().excluirProduto(texto(formulario, "identificador")),
    comAviso("/produtos", "produto-excluido"),
  );
}

export async function excluirCliente(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(
    () => nucleoDaInstancia().excluirCliente(Number(texto(formulario, "id"))),
    comAviso("/clientes", "cliente-excluido"),
  );
}

export async function excluirLicenca(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(
    () => nucleoDaInstancia().excluirLicenca(texto(formulario, "prefixo")),
    comAviso("/licencas", "licenca-excluida"),
  );
}

export async function restaurarProduto(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(() => nucleoDaInstancia().restaurarProduto(texto(formulario, "identificador")), "/excluidos");
}

export async function restaurarCliente(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(() => nucleoDaInstancia().restaurarCliente(Number(texto(formulario, "id"))), "/excluidos");
}

export async function restaurarLicenca(_estado: EstadoRecusavel, formulario: FormData): Promise<EstadoRecusavel> {
  return executar(() => nucleoDaInstancia().restaurarLicenca(texto(formulario, "prefixo")), "/excluidos");
}
