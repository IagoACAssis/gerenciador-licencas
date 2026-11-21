import "server-only";
import { cookies, headers } from "next/headers";
import { lerConfiguracao } from "../configuracao.ts";
import { ipDeOrigem } from "../limite/http.ts";
import { limiteDaEntrada } from "../limite/producao.ts";
import { conferirSenha } from "./senha.ts";
import { COOKIE_SESSAO, criarSessao, sessaoValida, textosIguais } from "./sessao.ts";

export type ResultadoEntrada =
  | { resultado: "entrou" }
  | { resultado: "recusada" }
  | { resultado: "limite"; esperaSegundos: number };

/**
 * Confere usuário e senha do Administrador e, se baterem, abre a sessão. Cada
 * tentativa, certa ou errada, conta no limite de tentativas por IP; passado o
 * limite, a senha nem é conferida até a janela acabar.
 */
export async function entrar(usuario: string, senha: string): Promise<ResultadoEntrada> {
  const registro = limiteDaEntrada().registrar(ipDeOrigem(await headers()));
  if (!registro.permitido) return { resultado: "limite", esperaSegundos: registro.esperaSegundos };

  const configuracao = lerConfiguracao();
  const senhaConfere = await conferirSenha(senha, configuracao.adminSenhaHash);
  if (!textosIguais(usuario, configuracao.adminUsuario) || !senhaConfere) return { resultado: "recusada" };

  const sessao = criarSessao(new Date(), configuracao.sessaoHoras, configuracao.sessaoSegredo);
  (await cookies()).set(COOKIE_SESSAO, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: sessao.expiraEm,
  });
  return { resultado: "entrou" };
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function administradorAutenticado(): Promise<boolean> {
  const cookie = (await cookies()).get(COOKIE_SESSAO)?.value;
  return sessaoValida(cookie, new Date(), lerConfiguracao().sessaoSegredo);
}
