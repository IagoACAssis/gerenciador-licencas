"use server";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { ClienteNaoEncontrado, DadosDeClienteInvalidos, type DadosDoCliente, type ErrosDoCliente } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";

export interface EstadoDoFormulario {
  valores?: DadosDoCliente;
  erros?: ErrosDoCliente;
  erro?: string;
}

/** Cadastra o Cliente (sem `id` no formulário) ou edita o Cliente do `id` informado. */
export async function salvarCliente(_estado: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  // O proxy e o layout já exigem sessão; a Server Action confere de novo por ser um ponto de entrada próprio.
  if (!(await administradorAutenticado())) redirect("/entrar");

  const id = formulario.get("id");
  const valores = { nome: String(formulario.get("nome") ?? ""), email: String(formulario.get("email") ?? "") };
  const nucleo = nucleoDaInstancia();
  try {
    if (id) await nucleo.editarCliente(Number(id), valores);
    else await nucleo.cadastrarCliente(valores);
  } catch (erro) {
    if (erro instanceof DadosDeClienteInvalidos) return { valores, erros: erro.erros };
    if (erro instanceof ClienteNaoEncontrado) return { valores, erro: "Este Cliente não existe." };
    throw erro;
  }
  redirect("/clientes");
}
