import type { Metadata } from "next";
import Link from "next/link";
import { ESTADOS_LICENCA } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { classeBotao } from "@/componentes/botoes";
import { CLASSE_CAMPO } from "@/componentes/campos";
import { FILTRO_A_VENCER, LICENCAS_A_VENCER } from "@/componentes/areas-do-painel";
import { BarraDeFiltros, EstadoVazio } from "@/componentes/lista";
import { CabecalhoDaPagina } from "@/componentes/pagina";
import { parametro } from "../formatacao";
import { FaltaProdutoOuCliente } from "./falta-produto-ou-cliente";
import { TabelaLicencas } from "./tabela";

export const dynamic = "force-dynamic";

type Parametros = Record<"produto" | "cliente" | "estado" | "prefixo" | typeof FILTRO_A_VENCER.nome, string | string[] | undefined>;

function soAVencer(busca: Partial<Parametros>): boolean {
  return parametro(busca[FILTRO_A_VENCER.nome]) === FILTRO_A_VENCER.valor;
}

function titulo(aVencer: boolean): string {
  return aVencer ? "Licenças a vencer" : "Licenças";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Partial<Parametros>> }): Promise<Metadata> {
  return { title: titulo(soAVencer(await searchParams)) };
}

export default async function Licencas({ searchParams }: { searchParams: Promise<Partial<Parametros>> }) {
  const busca = await searchParams;
  const filtro = {
    produto: parametro(busca.produto),
    cliente: parametro(busca.cliente),
    estado: parametro(busca.estado),
    prefixo: parametro(busca.prefixo),
  };
  const aVencer = soAVencer(busca);
  const estado = ESTADOS_LICENCA.find((e) => e === filtro.estado);

  const nucleo = nucleoDaInstancia();
  const [licencas, produtos, clientes] = await Promise.all([
    nucleo.listarLicencas({
      produto: filtro.produto || undefined,
      cliente: /^\d+$/.test(filtro.cliente) ? Number(filtro.cliente) : undefined,
      estado,
      prefixo: filtro.prefixo,
      aVencer,
    }),
    nucleo.listarProdutos(),
    nucleo.listarClientes(),
  ]);
  const filtrando = Object.values(filtro).some(Boolean);

  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina
        titulo={titulo(aVencer)}
        descricao={
          aVencer
            ? "As que entraram na Janela de aviso, da data de validade mais próxima para a mais distante."
            : "Encontre uma Licença pelo Produto, pelo Cliente, pelo estado ou pelo começo da Chave."
        }
        acoes={<Link href="/licencas/nova" className={classeBotao("primario")}>Emitir Licença</Link>}
      />

      <div className="grid gap-3">
        <nav aria-label="Quais Licenças" className="flex w-fit animate-entrar gap-1 rounded-lg bg-elevada p-1 text-sm">
          <OpcaoDeLista href="/licencas" atual={!aVencer}>Todas</OpcaoDeLista>
          <OpcaoDeLista href={LICENCAS_A_VENCER} atual={aVencer}>A vencer</OpcaoDeLista>
        </nav>
        <BarraDeFiltros rotulo="Filtrar Licenças">
          {aVencer && <input type="hidden" name={FILTRO_A_VENCER.nome} value={FILTRO_A_VENCER.valor} />}
          <input
            name="prefixo"
            type="search"
            defaultValue={filtro.prefixo}
            placeholder="Começo da Chave"
            aria-label="Começo da Chave"
            className={`${CLASSE_CAMPO} w-full font-mono sm:w-44`}
          />
          <select name="produto" defaultValue={filtro.produto} aria-label="Produto" className={CLASSE_CAMPO}>
            <option value="">Todos os Produtos</option>
            {produtos.map((p) => <option key={p.identificador} value={p.identificador}>{p.nome}</option>)}
          </select>
          <select name="cliente" defaultValue={filtro.cliente} aria-label="Cliente" className={CLASSE_CAMPO}>
            <option value="">Todos os Clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select name="estado" defaultValue={estado ?? ""} aria-label="Estado" className={CLASSE_CAMPO}>
            <option value="">Todos os estados</option>
            {ESTADOS_LICENCA.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </BarraDeFiltros>
      </div>

      {licencas.length > 0 ? (
        <TabelaLicencas licencas={licencas} />
      ) : filtrando ? (
        <EstadoVazio
          titulo="Nenhuma Licença com esses filtros"
          acao={<Link href={aVencer ? LICENCAS_A_VENCER : "/licencas"} className={classeBotao("secundario")}>Limpar filtros</Link>}
        >
          Mude os filtros ou limpe-os para ver {aVencer ? "todas as Licenças a vencer" : "todas as Licenças"}.
        </EstadoVazio>
      ) : aVencer ? (
        <EstadoVazio
          titulo="Nenhuma Licença a vencer"
          acao={<Link href="/licencas" className={classeBotao("secundario")}>Ver todas as Licenças</Link>}
        >
          Nenhuma Licença Ativa está na Janela de aviso do seu Produto agora.
        </EstadoVazio>
      ) : (
        <SemLicencas temProduto={produtos.length > 0} temCliente={clientes.length > 0} />
      )}
    </div>
  );
}

function OpcaoDeLista({ href, atual, children }: { href: string; atual: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`rounded-md px-3 py-1 font-medium transition-colors duration-150 ${atual ? "bg-superficie text-tinta shadow-sm" : "text-suave hover:text-tinta"}`}
    >
      {children}
    </Link>
  );
}

/** Nenhuma Licença emitida: orienta pelo que falta para a primeira. */
function SemLicencas({ temProduto, temCliente }: { temProduto: boolean; temCliente: boolean }) {
  if (!temProduto || !temCliente) {
    return <FaltaProdutoOuCliente titulo="Nenhuma Licença emitida ainda" temProduto={temProduto} temCliente={temCliente} />;
  }
  return (
    <EstadoVazio titulo="Nenhuma Licença emitida ainda" acao={<Link href="/licencas/nova" className={classeBotao("primario")}>Emitir Licença</Link>}>
      Emita a primeira Licença para um Cliente. A Chave de licença aparece uma única vez, logo depois da Emissão.
    </EstadoVazio>
  );
}
