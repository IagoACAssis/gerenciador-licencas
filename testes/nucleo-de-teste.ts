import { afterAll, beforeEach } from "vitest";
import { conectarBanco } from "../src/banco/conexao.ts";
import { criarNucleo, type Aleatoriedade, type Relogio } from "../src/nucleo/index.ts";
import { urlBancoTeste } from "./url-banco-teste.ts";

export const SEGREDO_CHAVES_TESTE = "segredo-das-chaves-de-teste-com-mais-de-32-caracteres";

/** Relógio controlado pelo teste: começa num momento fixo e só anda quando mandado. */
export function relogioDeTeste(inicio = new Date("2026-01-01T12:00:00Z")) {
  let atual = inicio;
  const relogio: Relogio = { agora: () => new Date(atual) };
  return {
    relogio,
    avancar(ms: number) {
      atual = new Date(atual.getTime() + ms);
    },
  };
}

/** Aleatoriedade determinística: devolve sempre a mesma sequência. */
export function aleatoriedadeDeTeste(): Aleatoriedade {
  let contador = 0;
  return {
    bytes(quantidade) {
      return Uint8Array.from({ length: quantidade }, () => contador++ % 256);
    },
  };
}

/**
 * Núcleo ligado ao Postgres de teste, com relógio e aleatoriedade controlados.
 * Chame no corpo do `describe`. Antes de cada teste, o relógio volta ao início
 * e a aleatoriedade recomeça, para que nenhum teste dependa de outro.
 */
export function nucleoDeTeste(inicio = new Date("2026-01-01T12:00:00Z")) {
  const conexao = conectarBanco(urlBancoTeste());
  afterAll(() => conexao.encerrar());

  let atual = { tempo: relogioDeTeste(inicio), aleatoriedade: aleatoriedadeDeTeste() };
  beforeEach(() => {
    atual = { tempo: relogioDeTeste(inicio), aleatoriedade: aleatoriedadeDeTeste() };
  });

  const nucleo = criarNucleo({
    banco: conexao.banco,
    relogio: { agora: () => atual.tempo.relogio.agora() },
    aleatoriedade: { bytes: (quantidade) => atual.aleatoriedade.bytes(quantidade) },
    segredoChaves: SEGREDO_CHAVES_TESTE,
  });
  return { nucleo, tempo: { avancar: (ms: number) => atual.tempo.avancar(ms) } };
}
