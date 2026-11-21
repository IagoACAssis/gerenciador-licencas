import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAssincrono = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const TAMANHO_HASH = 64;
const PADRAO = { N: 2 ** 15, r: 8, p: 1 };

function derivar(senha: string, sal: Buffer, tamanho: number, { N, r, p }: { N: number; r: number; p: number }) {
  // O scrypt usa cerca de 128 * N * r bytes; o dobro dá folga sobre o limite padrão do Node.
  return scryptAssincrono(senha, sal, tamanho, { N, r, p, maxmem: 128 * N * r * 2 });
}

// Formato: scrypt:N:r:p:sal:hash (sal e hash em base64url). Sem "$", para não
// precisar de escape no .env lido pelo docker compose.
export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, TAMANHO_HASH, PADRAO);
  return ["scrypt", PADRAO.N, PADRAO.r, PADRAO.p, sal.toString("base64url"), hash.toString("base64url")].join(":");
}

export async function conferirSenha(senha: string, hashGuardado: string): Promise<boolean> {
  const partes = hashGuardado.split(":");
  if (partes.length !== 6 || partes[0] !== "scrypt") {
    throw new Error("ADMIN_SENHA_HASH em formato inválido: gere-o com `pnpm hash-senha`.");
  }
  const [, n, r, p, sal, hash] = partes;
  const esperado = Buffer.from(hash, "base64url");
  const calculado = await derivar(senha, Buffer.from(sal, "base64url"), esperado.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return timingSafeEqual(calculado, esperado);
}
