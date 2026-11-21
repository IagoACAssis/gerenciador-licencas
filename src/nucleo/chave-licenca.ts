import { createHash } from "node:crypto";

// Chave de licença (ADR-0003): 20 bytes aleatórios (160 bits) em base32 sem
// caracteres ambíguos (sem I, L, O e U), em 8 grupos de 4 separados por hífen.
// A Instância guarda só o hash SHA-256 da Chave normalizada e um prefixo de 8
// caracteres (40 bits), que deixa 120 bits desconhecidos e não basta para usá-la.

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BYTES_DA_CHAVE = 20;
export const TAMANHO_DO_PREFIXO = 8;

function base32(bytes: Uint8Array): string {
  let texto = "";
  let acumulado = 0;
  let bits = 0;
  for (const byte of bytes) {
    acumulado = (acumulado << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      texto += ALFABETO[(acumulado >> bits) & 31];
    }
  }
  if (bits > 0) texto += ALFABETO[(acumulado << (5 - bits)) & 31];
  return texto;
}

/** Deixa só letras e números, em maiúsculas: "abcd-efgh" vira "ABCDEFGH". */
export function normalizarChave(texto: string): string {
  return texto.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** Mostra um texto normalizado em grupos de 4: "ABCDEFGH" vira "ABCD-EFGH". */
export function emGrupos(normalizado: string): string {
  return normalizado.match(/.{1,4}/g)?.join("-") ?? "";
}

export function hashDaChave(chave: string): string {
  return createHash("sha256").update(normalizarChave(chave)).digest("hex");
}

/** Gera uma Chave nova a partir dos bytes aleatórios e devolve o que a Instância guarda dela. */
export function gerarChave(bytes: (quantidade: number) => Uint8Array) {
  const normalizada = base32(bytes(BYTES_DA_CHAVE));
  return {
    chave: emGrupos(normalizada),
    hash: hashDaChave(normalizada),
    prefixo: normalizada.slice(0, TAMANHO_DO_PREFIXO),
  };
}
