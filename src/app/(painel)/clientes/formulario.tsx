"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { Cliente } from "@/nucleo";
import { salvarCliente } from "./acoes";

/** Formulário de cadastro (sem `cliente`) ou de edição do Cliente informado. */
export function FormularioCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, enviando] = useActionState(salvarCliente, {});
  const valores = estado.valores ?? cliente;
  return (
    <form className="cadastro" action={acao} noValidate>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <label>
        Nome
        <input name="nome" defaultValue={valores?.nome} aria-invalid={!!estado.erros?.nome} required />
        {estado.erros?.nome && <span className="erro">{estado.erros.nome}</span>}
      </label>
      <label>
        E-mail
        <input
          name="email"
          type="email"
          defaultValue={valores?.email}
          aria-invalid={!!estado.erros?.email}
          required
        />
        {estado.erros?.email && <span className="erro">{estado.erros.email}</span>}
      </label>
      <div className="acoes">
        <button type="submit" disabled={enviando}>{cliente ? "Salvar" : "Cadastrar"}</button>
        <Link href="/clientes">Cancelar</Link>
      </div>
    </form>
  );
}
