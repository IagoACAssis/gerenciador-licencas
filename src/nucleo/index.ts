import { sql } from "drizzle-orm";
import type { Banco } from "../banco/conexao.ts";
import { casosDeUsoDeClientes } from "./clientes.ts";

export {
  ClienteNaoEncontrado,
  DadosDeClienteInvalidos,
  type Cliente,
  type DadosDoCliente,
  type ErrosDoCliente,
} from "./clientes.ts";

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
export function criarNucleo(dependencias: DependenciasNucleo) {
  const { banco, relogio } = dependencias;
  return {
    /** Confere que a Instância alcança o banco. Falha (lança) se o banco não responder. */
    async verificarSaude(): Promise<{ banco: "ok"; verificadaEm: Date }> {
      await banco.execute(sql`SELECT 1`);
      return { banco: "ok", verificadaEm: relogio.agora() };
    },

    ...casosDeUsoDeClientes(dependencias),
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;
