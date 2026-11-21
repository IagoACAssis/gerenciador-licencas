import "server-only";
import { randomBytes } from "node:crypto";
import { conectarBanco } from "../banco/conexao.ts";
import { lerConfiguracao } from "../configuracao.ts";
import { criarNucleo, type Nucleo } from "./index.ts";

let nucleo: Nucleo | undefined;

/** Núcleo da Instância em execução: banco da configuração, relógio e aleatoriedade reais. */
export function nucleoDaInstancia(): Nucleo {
  if (!nucleo) {
    const configuracao = lerConfiguracao();
    nucleo = criarNucleo({
      banco: conectarBanco(configuracao.urlBanco).banco,
      relogio: { agora: () => new Date() },
      aleatoriedade: { bytes: (quantidade) => new Uint8Array(randomBytes(quantidade)) },
      segredoChaves: configuracao.chavesSegredo,
    });
  }
  return nucleo;
}
