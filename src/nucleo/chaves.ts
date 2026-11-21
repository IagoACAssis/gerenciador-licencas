import { createCipheriv, createDecipheriv, generateKeyPairSync, hkdfSync, randomBytes } from "node:crypto";

// Par de chaves de assinatura do Produto (ADR-0002). A chave privada só existe
// em claro dentro do núcleo; no banco ela fica cifrada com AES-256-GCM, com uma
// chave derivada (HKDF-SHA256) do segredo de configuração da Instância.
//
// O par de chaves e o iv usam sempre a aleatoriedade do sistema, e não a
// Aleatoriedade injetada no núcleo: a dos testes é determinística, e um par
// previsível ou um iv repetido no AES-GCM quebrariam a segurança. Nenhum teste
// depende desses valores.

/** Gera um par Ed25519, as duas partes em PEM (SPKI e PKCS#8). */
export function gerarParDeChaves(): { publica: string; privada: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publica: publicKey, privada: privateKey };
}

const VERSAO = "v1";

function chaveDeCifra(segredo: string): Buffer {
  return Buffer.from(hkdfSync("sha256", segredo, "", "gerenciador-licencas/chave-privada-produto", 32));
}

/** Formato: v1:<iv>:<dados cifrados>:<etiqueta>, partes em base64url, com iv aleatório de 12 bytes. */
export function cifrarChavePrivada(privadaPem: string, segredo: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveDeCifra(segredo), iv);
  const dados = Buffer.concat([cifra.update(privadaPem, "utf8"), cifra.final()]);
  return [VERSAO, iv, dados, cifra.getAuthTag()]
    .map((parte) => (typeof parte === "string" ? parte : parte.toString("base64url")))
    .join(":");
}

/** Devolve a chave privada em PEM. Lança se o segredo for outro ou se o texto tiver sido adulterado. */
export function decifrarChavePrivada(cifrada: string, segredo: string): string {
  const [versao, iv, dados, etiqueta, ...resto] = cifrada.split(":");
  if (versao !== VERSAO || !iv || !dados || !etiqueta || resto.length > 0) {
    throw new Error("Chave privada guardada em formato desconhecido.");
  }
  const decifra = createDecipheriv("aes-256-gcm", chaveDeCifra(segredo), Buffer.from(iv, "base64url"));
  decifra.setAuthTag(Buffer.from(etiqueta, "base64url"));
  return Buffer.concat([decifra.update(Buffer.from(dados, "base64url")), decifra.final()]).toString("utf8");
}
