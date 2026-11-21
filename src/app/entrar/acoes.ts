"use server";
import { redirect } from "next/navigation";
import { entrar } from "@/acesso/administrador";

export async function entrarNoPainel(
  _estado: { erro?: string },
  dados: FormData,
): Promise<{ erro?: string }> {
  const usuario = String(dados.get("usuario") ?? "");
  const senha = String(dados.get("senha") ?? "");
  if (!(await entrar(usuario, senha))) return { erro: "Usuário ou senha incorretos." };
  redirect("/");
}
