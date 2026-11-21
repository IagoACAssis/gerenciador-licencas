import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoDaPagina, LinkDeVolta } from "@/componentes/pagina";
import { obterClienteDaRota } from "../../cliente-da-rota";
import { FormularioCliente } from "../../formulario";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cliente = await obterClienteDaRota((await params).id);
  // Item inexistente: o título vem do not-found.tsx, como a página.
  if (!cliente) notFound();
  return { title: `Editar ${cliente.nome}` };
}

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obterClienteDaRota(id);
  if (!cliente) notFound();
  return (
    <div className="grid gap-8">
      <LinkDeVolta href={`/clientes/${cliente.id}`}>{cliente.nome}</LinkDeVolta>
      <CabecalhoDaPagina titulo="Editar Cliente" />
      <FormularioCliente cliente={cliente} />
    </div>
  );
}
