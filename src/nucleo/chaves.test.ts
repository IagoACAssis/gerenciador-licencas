import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cifrarChavePrivada, decifrarChavePrivada, gerarParDeChaves } from "./chaves.ts";

const segredo = "segredo-de-teste-com-mais-de-32-caracteres";

describe("par de chaves do Produto", () => {
  it("gera um par Ed25519 em PEM", () => {
    const par = gerarParDeChaves();
    expect(createPublicKey(par.publica).asymmetricKeyType).toBe("ed25519");
    expect(createPrivateKey(par.privada).asymmetricKeyType).toBe("ed25519");
  });

  it("cifra a chave privada sem deixá-la legível e a recupera com o mesmo segredo", () => {
    const par = gerarParDeChaves();
    const cifrada = cifrarChavePrivada(par.privada, segredo);

    expect(cifrada).not.toContain("PRIVATE KEY");
    expect(cifrada).not.toContain(par.privada);

    const recuperada = decifrarChavePrivada(cifrada, segredo);
    const assinatura = sign(null, Buffer.from("mensagem"), recuperada);
    expect(verify(null, Buffer.from("mensagem"), par.publica, assinatura)).toBe(true);
  });

  it("usa um iv novo a cada cifragem", () => {
    const privada = gerarParDeChaves().privada;
    expect(cifrarChavePrivada(privada, segredo).split(":")[1]).not.toBe(
      cifrarChavePrivada(privada, segredo).split(":")[1],
    );
  });

  it("não decifra com outro segredo", () => {
    const cifrada = cifrarChavePrivada(gerarParDeChaves().privada, segredo);
    expect(() => decifrarChavePrivada(cifrada, "outro-segredo-com-mais-de-32-caracteres")).toThrow();
  });

  it("não decifra uma chave adulterada", () => {
    const cifrada = cifrarChavePrivada(gerarParDeChaves().privada, segredo);
    const [versao, ivTexto, dados, etiqueta] = cifrada.split(":");
    const adulterados = Buffer.from(dados, "base64url");
    adulterados[0] ^= 1;
    expect(() =>
      decifrarChavePrivada([versao, ivTexto, adulterados.toString("base64url"), etiqueta].join(":"), segredo),
    ).toThrow();
  });
});
