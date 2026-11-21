"use server";
import { redirect } from "next/navigation";
import { entrar } from "@/acesso/administrador";

export async function entrarNoPainel(
  _estado: { erro?: string },
  dados: FormData,
): Promise<{ erro?: string }> {
  const usuario = String(dados.get("usuario") ?? "");
  const senha = String(dados.get("senha") ?? "");
  const tentativa = await entrar(usuario, senha);
  if (tentativa.resultado === "recusada") return { erro: "Usuário ou senha incorretos." };
  if (tentativa.resultado === "limite") {
    const minutos = Math.ceil(tentativa.esperaSegundos / 60);
    return {
      erro: `Muitas tentativas de entrada. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
    };
  }
  redirect("/");
}
