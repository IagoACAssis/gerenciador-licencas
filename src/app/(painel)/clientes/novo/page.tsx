import type { Metadata } from "next";
import { FormularioCliente } from "../formulario";

export const metadata: Metadata = { title: "Novo Cliente" };

export default function NovoCliente() {
  return (
    <div className="legado">
      <h1>Novo Cliente</h1>
      <FormularioCliente />
    </div>
  );
}
