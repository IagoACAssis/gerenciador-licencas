import Link from "next/link";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { parametro } from "../../formatacao";
import { FormularioEmissao } from "../formulario-emissao";

export const dynamic = "force-dynamic";

export default async function NovaLicenca({ searchParams }: {
  searchParams: Promise<{ produto?: string | string[]; cliente?: string | string[] }>;
}) {
  const busca = await searchParams;
  const nucleo = nucleoDaInstancia();
  const [produtos, clientes] = await Promise.all([nucleo.listarProdutos(), nucleo.listarClientes()]);
  return (
    <>
      <p><Link href="/licencas">← Licenças</Link></p>
      <h1>Emitir Licença</h1>
      {produtos.length === 0 || clientes.length === 0 ? (
        <p>
          Para emitir uma Licença, cadastre antes pelo menos um <Link href="/produtos/novo">Produto</Link> e
          um <Link href="/clientes/novo">Cliente</Link>.
        </p>
      ) : (
        <FormularioEmissao
          produtos={produtos.map((p) => ({ valor: p.identificador, rotulo: p.nome }))}
          clientes={clientes.map((c) => ({ valor: String(c.id), rotulo: `${c.nome} (${c.email})` }))}
          inicial={{ produto: parametro(busca.produto), cliente: parametro(busca.cliente) }}
        />
      )}
    </>
  );
}
