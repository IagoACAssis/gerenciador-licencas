import type { Metadata } from "next";
import { CabecalhoDaPagina, LinkDeVolta } from "@/componentes/pagina";
import { FormularioCliente } from "../formulario";

export const metadata: Metadata = { title: "Cadastrar Cliente" };

export default function NovoCliente() {
  return (
    <div className="grid gap-8">
      <LinkDeVolta href="/clientes">Clientes</LinkDeVolta>
      <CabecalhoDaPagina titulo="Cadastrar Cliente" descricao="Depois do cadastro, emita Licenças para ele." />
      <FormularioCliente />
    </div>
  );
}
