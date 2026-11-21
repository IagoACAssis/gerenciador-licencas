"use client";
import { useActionState } from "react";
import type { Cliente } from "@/nucleo";
import { BotoesDoFormulario, Campo, Formulario } from "@/componentes/formulario";
import { salvarCliente } from "./acoes";

/** Formulário de cadastro (sem `cliente`) ou de edição do Cliente informado. */
export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, enviando] = useActionState(salvarCliente, {});
  const valores = estado.valores ?? cliente;
  return (
    <Formulario action={acao} noValidate>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Campo rotulo="Nome" erro={estado.erros?.nome}>
        {(props) => <input name="nome" defaultValue={valores?.nome} required {...props} />}
      </Campo>
      <Campo rotulo="E-mail" erro={estado.erros?.email} ajuda="Cada Cliente tem um e-mail próprio.">
        {(props) => <input name="email" type="email" defaultValue={valores?.email} required {...props} />}
      </Campo>
      <BotoesDoFormulario
        rotulo={cliente ? "Salvar" : "Cadastrar"}
        enviando={enviando}
        cancelar={cliente ? `/clientes/${cliente.id}` : "/clientes"}
      />
    </Formulario>
  );
}
