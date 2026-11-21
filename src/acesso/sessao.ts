import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSAO = "sessao";

// A sessão é um cookie assinado com HMAC-SHA256: "<expira-em-ms>.<assinatura>".
// Não fica guardada no servidor; vale até expirar ou até o cookie ser apagado.

/** Compara dois textos sem vazar, pelo tempo de resposta, onde eles diferem. */
export function textosIguais(a: string, b: string): boolean {
  const bytesA = Buffer.from(a);
  const bytesB = Buffer.from(b);
  return bytesA.length === bytesB.length && timingSafeEqual(bytesA, bytesB);
}

function assinar(conteudo: string, segredo: string): string {
  return createHmac("sha256", segredo).update(conteudo).digest("base64url");
}

export function criarSessao(agora: Date, horas: number, segredo: string) {
  const expiraEm = new Date(agora.getTime() + horas * 60 * 60 * 1000);
  const conteudo = String(expiraEm.getTime());
  return { valor: `${conteudo}.${assinar(conteudo, segredo)}`, expiraEm };
}

export function sessaoValida(cookie: string | undefined, agora: Date, segredo: string): boolean {
  if (!cookie) return false;
  const [conteudo, assinatura, ...resto] = cookie.split(".");
  if (!conteudo || !assinatura || resto.length > 0) return false;
  if (!textosIguais(assinar(conteudo, segredo), assinatura)) return false;
  return Number(conteudo) > agora.getTime();
}
