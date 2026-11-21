import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, sessaoValida } from "./acesso/sessao.ts";
import { lerConfiguracao } from "./configuracao.ts";

/** Toda página do painel sem sessão válida leva à tela de entrada. */
export function proxy(requisicao: NextRequest) {
  const cookie = requisicao.cookies.get(COOKIE_SESSAO)?.value;
  if (sessaoValida(cookie, new Date(), lerConfiguracao().sessaoSegredo)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/entrar", requisicao.url));
}

export const config = {
  // Públicos: a tela de entrada, a API (Validação e saúde) e os arquivos do Next.
  matcher: ["/((?!entrar$|api/|_next/|favicon\\.ico$).*)"],
};
