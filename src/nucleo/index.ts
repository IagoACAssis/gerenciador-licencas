import { sql } from "drizzle-orm";
import type { Banco } from "../banco/conexao.ts";
import { casosDeUsoDeClientes } from "./clientes.ts";
import { casosDeUsoDeExclusao } from "./exclusao.ts";
import { casosDeUsoDeLicencas } from "./licencas.ts";
import { casosDeUsoDeProdutos } from "./produtos.ts";
import { casosDeUsoDeValidacao } from "./validacao.ts";

export {
  ProdutoNaoEncontrado,
  DadosDeProdutoInvalidos,
  type CampoProduto,
  type DadosProduto,
  type Produto,
  type RegrasProduto,
} from "./produtos.ts";

export {
  ClienteNaoEncontrado,
  DadosDeClienteInvalidos,
  type Cliente,
  type DadosDoCliente,
  type ErrosDoCliente,
} from "./clientes.ts";

export {
  AcaoNaoPermitida,
  AtivacaoNaoEncontrada,
  DadosDeLicencaInvalidos,
  ESTADOS_LICENCA,
  LicencaNaoEncontrada,
  type CampoLicenca,
  type DadosEmissao,
  type Ativacao,
  type DetalheLicenca,
  type EstadoLicenca,
  type EventoLicenca,
  type FiltroLicencas,
  type Licenca,
  type SubstituicaoAtivacao,
} from "./licencas.ts";

export { ExclusaoNaoPermitida, type Excluidos } from "./exclusao.ts";

export {
  DadosDeValidacaoInvalidos,
  type CampoValidacao,
  type CargaValidacao,
  type MotivoRecusa,
  type PedidoValidacao,
  type RespostaAssinada,
} from "./validacao.ts";

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
  /** Segredo da configuração da Instância que cifra as chaves privadas dos Produtos. */
  segredoChaves: string;
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
    ...casosDeUsoDeProdutos(dependencias),
    ...casosDeUsoDeClientes(dependencias),
    ...casosDeUsoDeLicencas(dependencias),
    ...casosDeUsoDeValidacao(dependencias),
    ...casosDeUsoDeExclusao(dependencias),
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;
