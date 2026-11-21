import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { TabelaLicencas } from "../../licencas/tabela";
import { excluirCliente } from "../../excluidos/acoes";
import { FormularioExclusao } from "../../excluidos/formulario-exclusao";
import { obterClienteDaRota } from "../cliente-da-rota";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cliente = await obterClienteDaRota((await params).id);
  return { title: cliente?.nome };
}

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obterClienteDaRota(id);
  if (!cliente) notFound();
  const licencas = await nucleoDaInstancia().listarLicencas({ cliente: cliente.id });

  return (
    <div className="legado">
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
      <h2>Exclusão</h2>
      <p>
        Para um Cliente cadastrado por engano. Ele e as Licenças dele saem das listas e deixam de valer na
        Validação; o e-mail continua ocupado. Não é possível com Licença Ativa ou Suspensa.
      </p>
      <FormularioExclusao acao={excluirCliente} campos={{ id: String(cliente.id) }} item="este Cliente" />
    </div>
  );
}
