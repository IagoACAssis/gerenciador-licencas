import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obterClienteDaRota } from "../../cliente-da-rota";
import { FormularioCliente } from "../../formulario";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cliente = await obterClienteDaRota((await params).id);
  return { title: cliente && `Editar ${cliente.nome}` };
}

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obterClienteDaRota(id);
  if (!cliente) notFound();
  return (
    <div className="legado">
      <h1>Editar Cliente</h1>
      <FormularioCliente cliente={cliente} />
    </div>
  );
}
