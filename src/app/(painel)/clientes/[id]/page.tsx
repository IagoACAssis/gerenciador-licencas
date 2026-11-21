import Link from "next/link";
import { notFound } from "next/navigation";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { TabelaLicencas } from "../../licencas/tabela";

export const dynamic = "force-dynamic";

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nucleo = nucleoDaInstancia();
  const cliente = /^\d+$/.test(id) ? await nucleo.obterCliente(Number(id)) : null;
  if (!cliente) notFound();
  const licencas = await nucleo.listarLicencas({ cliente: cliente.id });

  return (
    <>
      <p><Link href="/clientes">← Clientes</Link></p>
      <div className="titulo">
        <h1>{cliente.nome}</h1>
        <Link href={`/clientes/${cliente.id}/editar`}>Editar</Link>
      </div>
      <p>{cliente.email}</p>
      <div className="titulo">
        <h2>Licenças</h2>
        <Link className="botao" href={`/licencas/nova?cliente=${cliente.id}`}>Emitir Licença</Link>
      </div>
      {licencas.length === 0 ? <p>Este Cliente ainda não tem Licenças.</p> : <TabelaLicencas licencas={licencas} semCliente />}
    </>
  );
}
