import { notFound } from "next/navigation";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { FormularioCliente } from "../../formulario";

export default async function EditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = /^\d+$/.test(id) ? await nucleoDaInstancia().obterCliente(Number(id)) : null;
  if (!cliente) notFound();
  return (
    <>
      <h1>Editar Cliente</h1>
      <FormularioCliente cliente={cliente} />
    </>
  );
}
