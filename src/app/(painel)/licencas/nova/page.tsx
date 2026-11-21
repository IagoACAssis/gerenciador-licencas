import type { Metadata } from "next";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { CabecalhoDaPagina, LinkDeVolta } from "@/componentes/pagina";
import { parametro } from "../../formatacao";
import { FaltaProdutoOuCliente } from "../falta-produto-ou-cliente";
import { FormularioEmissao } from "../formulario-emissao";

export const metadata: Metadata = { title: "Emitir Licença" };

export const dynamic = "force-dynamic";

export default async function NovaLicenca({ searchParams }: {
  searchParams: Promise<{ produto?: string | string[]; cliente?: string | string[] }>;
}) {
  const busca = await searchParams;
  const nucleo = nucleoDaInstancia();
  const [produtos, clientes] = await Promise.all([nucleo.listarProdutos(), nucleo.listarClientes()]);
  return (
    <div className="grid gap-8">
      <LinkDeVolta href="/licencas">Licenças</LinkDeVolta>
      <CabecalhoDaPagina
        titulo="Emitir Licença"
        descricao="A Chave de licença aparece uma única vez, logo depois da Emissão."
      />
      {produtos.length === 0 || clientes.length === 0 ? (
        <FaltaProdutoOuCliente titulo="Ainda não dá para emitir" temProduto={produtos.length > 0} temCliente={clientes.length > 0} />
      ) : (
        <FormularioEmissao
          produtos={produtos.map((p) => ({ valor: p.identificador, rotulo: p.nome }))}
          clientes={clientes.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} (${c.email})` }))}
          inicial={{ produto: parametro(busca.produto), cliente: parametro(busca.cliente) }}
        />
      )}
    </div>
  );
}
