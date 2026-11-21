import "server-only";
import { cookies } from "next/headers";
import { lerConfiguracao } from "../configuracao.ts";
import { conferirSenha } from "./senha.ts";
import { COOKIE_SESSAO, criarSessao, sessaoValida, textosIguais } from "./sessao.ts";

/** Confere usuário e senha do Administrador e, se baterem, abre a sessão. */
export async function entrar(usuario: string, senha: string): Promise<boolean> {
  const configuracao = lerConfiguracao();
  const senhaConfere = await conferirSenha(senha, configuracao.adminSenhaHash);
  if (!textosIguais(usuario, configuracao.adminUsuario) || !senhaConfere) return false;

  const sessao = criarSessao(new Date(), configuracao.sessaoHoras, configuracao.sessaoSegredo);
  (await cookies()).set(COOKIE_SESSAO, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: sessao.expiraEm,
  });
  return true;
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function administradorAutenticado(): Promise<boolean> {
  const cookie = (await cookies()).get(COOKIE_SESSAO)?.value;
  return sessaoValida(cookie, new Date(), lerConfiguracao().sessaoSegredo);
}
