import type { Metadata } from "next";
import Link from "next/link";
import { ESTADOS_LICENCA } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { parametro } from "../formatacao";
import { TabelaLicencas } from "./tabela";

export const dynamic = "force-dynamic";

type Parametros = Record<"produto" | "cliente" | "estado" | "prefixo" | "aVencer", string | string[] | undefined>;

function soAVencer(busca: Partial<Parametros>): boolean {
  return parametro(busca.aVencer) === "1";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Partial<Parametros>> }): Promise<Metadata> {
  return { title: soAVencer(await searchParams) ? "Licenças a vencer" : "Licenças" };
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
  const filtrando = aVencer || Object.values(filtro).some(Boolean);

  return (
    <div className="legado">
      <div className="titulo">
        <h1>{aVencer ? "Licenças a vencer" : "Licenças"}</h1>
        <Link className="botao" href="/licencas/nova">Emitir Licença</Link>
      </div>
      <p>
        {aVencer ? <Link href="/licencas">Ver todas as Licenças</Link> : <Link href="/licencas?aVencer=1">Ver as Licenças a vencer</Link>}
      </p>
      <form className="busca filtros" role="search">
        {aVencer && <input type="hidden" name="aVencer" value="1" />}
        <input name="prefixo" type="search" defaultValue={filtro.prefixo} placeholder="Começo da Chave" aria-label="Começo da Chave" />
        <select name="produto" defaultValue={filtro.produto} aria-label="Produto">
          <option value="">Todos os Produtos</option>
          {produtos.map((p) => <option key={p.identificador} value={p.identificador}>{p.nome}</option>)}
        </select>
        <select name="cliente" defaultValue={filtro.cliente} aria-label="Cliente">
          <option value="">Todos os Clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select name="estado" defaultValue={estado ?? ""} aria-label="Estado">
          <option value="">Todos os estados</option>
          {ESTADOS_LICENCA.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button type="submit">Filtrar</button>
      </form>
      {licencas.length === 0 ? (
        <p>{filtrando ? "Nenhuma Licença encontrada." : "Nenhuma Licença emitida ainda."}</p>
      ) : (
        <TabelaLicencas licencas={licencas} />
      )}
    </div>
  );
}
