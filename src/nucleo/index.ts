import { sql } from "drizzle-orm";
import type { Banco } from "../banco/conexao.ts";

export interface Relogio {
  agora(): Date;
}

export interface Aleatoriedade {
  bytes(quantidade: number): Uint8Array;
}

export interface DependenciasNucleo {
  banco: Banco;
  relogio: Relogio;
  aleatoriedade: Aleatoriedade;
}

/**
 * Núcleo de licenciamento: concentra todas as regras do domínio. Rotas da API e
 * telas do painel só traduzem HTTP e formulários em chamadas a estes casos de uso.
 */
export function criarNucleo({ banco, relogio }: DependenciasNucleo) {
  return {
    /** Confere que a Instância alcança o banco. Falha (lança) se o banco não responder. */
    async verificarSaude(): Promise<{ banco: "ok"; verificadaEm: Date }> {
      await banco.execute(sql`SELECT 1`);
      return { banco: "ok", verificadaEm: relogio.agora() };
    },
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;
